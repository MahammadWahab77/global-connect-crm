import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import path from "path";

// Types for bulk import
interface ValidationLog {
  rowNumber: number;
  status: 'Imported' | 'ImportedWithIssues' | 'Failed';
  fixesApplied: string[];
  warnings: string[];
  errors: string[];
  originalData?: any;
  normalizedData?: any;
}

interface BatchSummary {
  totalRows: number;
  imported: number;
  importedWithIssues: number;
  failed: number;
  processingTimeMs: number;
  chunkStats: {
    totalChunks: number;
    successfulChunks: number;
    failedChunks: number;
  };
  fieldIssues: {
    [fieldName: string]: {
      count: number;
      samples: string[];
    };
  };
}

// Enhanced bulk import processor with resilient validation
async function processBulkLeadImport(
  rawLeads: any[], 
  dryRun: boolean, 
  chunkSize: number, 
  storage: any
): Promise<{
  success: boolean;
  batchSummary: BatchSummary;
  validationLog: ValidationLog[];
  downloadableReports?: {
    validationLog: string;
    normalizedPayload: string;
  };
}> {
  const startTime = Date.now();
  const validationLog: ValidationLog[] = [];
  const fieldIssues: { [key: string]: { count: number; samples: string[] } } = {};
  
  let importedCount = 0;
  let importedWithIssuesCount = 0;
  let failedCount = 0;
  let successfulChunks = 0;
  let failedChunks = 0;

  // Get manager and counselors once for the entire batch
  let managerId: number | null = null;
  let counselors: any[] = [];
  let defaultCounselor: any = null;

  try {
    const users = await storage.getAllUsers();
    const manager = users.find((u: any) => u.name.toLowerCase().includes('anupriya') || u.role === 'admin');
    managerId = manager?.id || null;
    counselors = users.filter((u: any) => u.role === 'counselor');
    defaultCounselor = counselors.find((c: any) => c.name.toLowerCase().includes('likitha'));
  } catch (error) {
    console.log("Could not fetch users, proceeding with defaults");
  }

  // Process in chunks
  const chunks = [];
  for (let i = 0; i < rawLeads.length; i += chunkSize) {
    chunks.push(rawLeads.slice(i, i + chunkSize));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const chunkStartIndex = chunkIndex * chunkSize;
    
    try {
      for (let i = 0; i < chunk.length; i++) {
        const rowNumber = chunkStartIndex + i + 1;
        const rawLead = chunk[i];
        const log: ValidationLog = {
          rowNumber,
          status: 'Imported',
          fixesApplied: [],
          warnings: [],
          errors: [],
          originalData: { ...rawLead },
          normalizedData: {}
        };

        try {
          const normalized = await normalizeAndValidateLead(rawLead, log, fieldIssues);
          const businessLogicResult = await applyBusinessLogic(normalized, counselors, defaultCounselor, managerId);
          
          log.normalizedData = { ...normalized, ...businessLogicResult };

          if (!dryRun) {
            // Create the lead and all associated records
            const newLead = await storage.createLead({
              uid: normalized.uid,
              name: normalized.name,
              email: normalized.email,
              phone: normalized.phone,
              country: normalized.country,
              course: null,
              intake: normalized.intake,
              source: normalized.source,
              currentStage: businessLogicResult.currentStage,
              counselorId: businessLogicResult.counselorId,
              managerId: managerId,
              prevConsultancy: null,
              passportStatus: normalized.passportStatus,
              remarks: null,
              counsellors: normalized.counsellors
            });

            // Create remarks if present
            if (normalized.remarks && normalized.remarks.trim()) {
              await storage.createRemark({
                leadId: newLead.id,
                userId: businessLogicResult.counselorId || managerId || 1,
                content: `Bulk Import: ${normalized.remarks.trim()}`,
                isVisible: true
              });
            }

            // Create stage history
            if (businessLogicResult.currentStage && businessLogicResult.currentStage !== "Yet to Assign") {
              await storage.createStageHistory({
                leadId: newLead.id,
                fromStage: null,
                toStage: businessLogicResult.currentStage,
                userId: businessLogicResult.counselorId || managerId || 1,
                reason: `Bulk import - ${businessLogicResult.counselorId ? 'Assigned to counselor' : 'Unassigned'}`,
                createdAt: normalized.leadCreatedDate || new Date()
              });
            }
          }

          if (log.warnings.length > 0 || log.fixesApplied.length > 0) {
            log.status = 'ImportedWithIssues';
            importedWithIssuesCount++;
          } else {
            importedCount++;
          }

        } catch (error: any) {
          log.status = 'Failed';
          log.errors.push(error.message || 'Unknown error during processing');
          failedCount++;
        }

        validationLog.push(log);
      }
      
      successfulChunks++;
    } catch (chunkError) {
      console.error(`Chunk ${chunkIndex} failed:`, chunkError);
      failedChunks++;
      
      // Mark all rows in failed chunk as failed
      for (let i = 0; i < chunk.length; i++) {
        const rowNumber = chunkStartIndex + i + 1;
        validationLog.push({
          rowNumber,
          status: 'Failed',
          fixesApplied: [],
          warnings: [],
          errors: [`Chunk processing failed: ${chunkError}`],
          originalData: chunk[i]
        });
        failedCount++;
      }
    }
  }

  const endTime = Date.now();
  
  const batchSummary: BatchSummary = {
    totalRows: rawLeads.length,
    imported: importedCount,
    importedWithIssues: importedWithIssuesCount,
    failed: failedCount,
    processingTimeMs: endTime - startTime,
    chunkStats: {
      totalChunks: chunks.length,
      successfulChunks,
      failedChunks
    },
    fieldIssues
  };

  return {
    success: true,
    batchSummary,
    validationLog,
    downloadableReports: {
      validationLog: generateValidationLogCSV(validationLog),
      normalizedPayload: generateNormalizedPayloadJSONL(validationLog)
    }
  };
}

// Resilient field normalization with auto-fixes
async function normalizeAndValidateLead(rawLead: any, log: ValidationLog, fieldIssues: any): Promise<any> {
  const normalized: any = {};

  // UID handling
  if (rawLead.uid && rawLead.uid.trim()) {
    normalized.uid = rawLead.uid.trim();
  } else {
    // Generate UID if missing
    const timestamp = Date.now();
    normalized.uid = `UID-${timestamp.toString().slice(-6).padStart(6, '0')}`;
    log.fixesApplied.push('Generated missing UID');
    addFieldIssue(fieldIssues, 'uid', 'Missing UID - generated automatically');
  }

  // Name handling (required)
  if (rawLead.studentName && rawLead.studentName.trim()) {
    normalized.name = rawLead.studentName.trim();
  } else if (rawLead.name && rawLead.name.trim()) {
    normalized.name = rawLead.name.trim();
  } else {
    log.errors.push('Missing required student name');
    normalized.name = 'Unknown Student';
    log.fixesApplied.push('Set default name for missing student name');
  }

  // Current Stage handling (required)
  if (rawLead.currentStage && rawLead.currentStage.trim()) {
    normalized.currentStage = rawLead.currentStage.trim();
  } else {
    log.errors.push('Missing required current stage');
    normalized.currentStage = 'Yet to Assign';
    log.fixesApplied.push('Set default stage for missing current stage');
  }

  // Lead Created Date with resilient parsing
  if (rawLead.leadCreatedDate) {
    try {
      // Try parsing as-is first
      let parsed = new Date(rawLead.leadCreatedDate);
      if (isNaN(parsed.getTime())) {
        // Try common formats
        const commonFormats = [
          rawLead.leadCreatedDate.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'), // DD/MM/YYYY to YYYY-MM-DD
          rawLead.leadCreatedDate.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1'), // DD-MM-YYYY to YYYY-MM-DD
          rawLead.leadCreatedDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'), // YYYYMMDD to YYYY-MM-DD
        ];
        
        for (const format of commonFormats) {
          parsed = new Date(format);
          if (!isNaN(parsed.getTime())) break;
        }
      }
      
      if (!isNaN(parsed.getTime())) {
        normalized.leadCreatedDate = parsed;
      } else {
        throw new Error('Unparseable date format');
      }
    } catch (error) {
      normalized.leadCreatedDate = new Date();
      log.fixesApplied.push('Invalid date format - defaulted to current date');
      log.warnings.push(`Original date "${rawLead.leadCreatedDate}" could not be parsed`);
      addFieldIssue(fieldIssues, 'leadCreatedDate', `Invalid format: ${rawLead.leadCreatedDate}`);
    }
  } else {
    normalized.leadCreatedDate = new Date();
    log.fixesApplied.push('Missing date - defaulted to current date');
  }

  // Intake normalization to YYYY-Season format
  if (rawLead.intake && rawLead.intake.trim()) {
    normalized.intake = normalizeIntake(rawLead.intake.trim(), log, fieldIssues);
  } else {
    normalized.intake = null;
    log.warnings.push('Missing intake information');
  }

  // Country normalization to ISO codes
  if (rawLead.country && rawLead.country.trim()) {
    normalized.country = normalizeCountry(rawLead.country.trim(), log, fieldIssues);
  } else {
    normalized.country = null;
    log.warnings.push('Missing country information');
  }

  // Phone normalization
  if (rawLead.mobileNumber && rawLead.mobileNumber.trim()) {
    normalized.phone = normalizePhone(rawLead.mobileNumber.trim(), log, fieldIssues);
  } else if (rawLead.phone && rawLead.phone.trim()) {
    normalized.phone = normalizePhone(rawLead.phone.trim(), log, fieldIssues);
  } else {
    normalized.phone = null;
    log.warnings.push('Missing phone number');
  }

  // Email normalization
  if (rawLead.email && rawLead.email.trim()) {
    normalized.email = normalizeEmail(rawLead.email.trim(), log, fieldIssues);
  } else {
    normalized.email = null; // Now nullable
  }

  // Other fields (now optional)
  normalized.source = rawLead.source && rawLead.source.trim() ? rawLead.source.trim() : null;
  normalized.passportStatus = rawLead.passportStatus && rawLead.passportStatus.trim() ? rawLead.passportStatus.trim() : null;
  normalized.remarks = rawLead.remarks && rawLead.remarks.trim() ? rawLead.remarks.trim() : null;
  normalized.counsellors = rawLead.counsellors && rawLead.counsellors.trim() ? rawLead.counsellors.trim() : null;

  return normalized;
}

// Enhanced stage assignment logic to handle empty counselor fields
function determineOptimalStage(counselorId: number | null, requestedStage?: string): string {
  // If a specific stage was requested in CSV, respect it (backward compatibility)
  if (requestedStage && requestedStage.trim()) {
    return requestedStage.trim();
  }
  
  // New logic: if no counselor assigned, mark as "Yet to Contact" instead of "Yet to Assign"
  if (!counselorId) {
    return "Yet to Contact";
  }
  
  // If counselor is assigned, mark as "Yet to Contact" (ready for counselor to reach out)
  return "Yet to Contact";
}

// Business logic application (counselor assignment, stage calculation)
async function applyBusinessLogic(normalized: any, counselors: any[], defaultCounselor: any, managerId: number | null): Promise<any> {
  let assignedCounselorId = null;
  
  if (normalized.counsellors && normalized.counsellors.trim()) {
    const counselorName = normalized.counsellors.trim().toLowerCase();
    const matchedCounselor = counselors.find((c: any) => 
      c.name.toLowerCase().includes(counselorName) || 
      counselorName.includes(c.name.toLowerCase())
    );
    
    if (matchedCounselor) {
      assignedCounselorId = matchedCounselor.id;
    } else if (defaultCounselor) {
      assignedCounselorId = defaultCounselor.id;
    }
  }

  // Use enhanced stage assignment logic
  const optimalStage = determineOptimalStage(assignedCounselorId, normalized.currentStage);

  return {
    counselorId: assignedCounselorId,
    currentStage: optimalStage
  };
}

function normalizeIntake(intake: string, log: ValidationLog, fieldIssues: any): string {
  const original = intake;
  
  // Common patterns: "Fall 2024", "Spring 2025", "2024 Fall", etc.
  const seasonMap: { [key: string]: string } = {
    'fall': 'Fall', 'autumn': 'Fall', 'sep': 'Fall', 'september': 'Fall',
    'spring': 'Spring', 'jan': 'Spring', 'january': 'Spring',
    'summer': 'Summer', 'may': 'Summer', 'jun': 'Summer',
    'winter': 'Winter', 'dec': 'Winter', 'december': 'Winter'
  };
  
  let normalized = intake.toLowerCase();
  let year = '';
  let season = '';
  
  // Extract year (4 digits)
  const yearMatch = normalized.match(/\d{4}/);
  if (yearMatch) {
    year = yearMatch[0];
  } else {
    // Default to next year if no year found
    year = (new Date().getFullYear() + 1).toString();
    log.fixesApplied.push(`Added missing year ${year} to intake`);
  }
  
  // Extract season
  for (const [key, value] of Object.entries(seasonMap)) {
    if (normalized.includes(key)) {
      season = value;
      break;
    }
  }
  
  if (!season) {
    season = 'Fall'; // Default season
    log.fixesApplied.push('Added default season Fall to intake');
  }
  
  const result = `${year}-${season}`;
  
  if (result !== original) {
    log.fixesApplied.push(`Normalized intake from "${original}" to "${result}"`);
    addFieldIssue(fieldIssues, 'intake', `Normalized: ${original} → ${result}`);
  }
  
  return result;
}

function normalizeCountry(country: string, log: ValidationLog, fieldIssues: any): string {
  const original = country;
  
  // Common country mappings to ISO-2 codes
  const countryMap: { [key: string]: string } = {
    'united states': 'US', 'usa': 'US', 'america': 'US', 'united states of america': 'US',
    'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'britain': 'GB',
    'germany': 'DE', 'deutschland': 'DE',
    'france': 'FR', 'francia': 'FR',
    'india': 'IN', 'bharat': 'IN',
    'china': 'CN', 'prc': 'CN',
    'canada': 'CA',
    'australia': 'AU', 'aus': 'AU',
    'japan': 'JP', 'nippon': 'JP',
    'south korea': 'KR', 'korea': 'KR',
    'brazil': 'BR', 'brasil': 'BR',
    'mexico': 'MX', 'méxico': 'MX',
    'russia': 'RU', 'russian federation': 'RU'
  };
  
  const normalized = country.toLowerCase().trim();
  const mapped = countryMap[normalized];
  
  if (mapped) {
    if (mapped !== original) {
      log.fixesApplied.push(`Normalized country from "${original}" to "${mapped}"`);
      addFieldIssue(fieldIssues, 'country', `Normalized: ${original} → ${mapped}`);
    }
    return mapped;
  } else {
    // Keep original if no mapping found, but warn
    log.warnings.push(`Country "${original}" could not be normalized to ISO code`);
    addFieldIssue(fieldIssues, 'country', `Unknown country: ${original}`);
    return original;
  }
}

function normalizePhone(phone: string, log: ValidationLog, fieldIssues: any): string {
  const original = phone;
  
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Basic validation - should have at least 10 digits
  const digitCount = normalized.replace(/\D/g, '').length;
  if (digitCount < 10) {
    log.warnings.push(`Phone number "${original}" appears to be too short`);
    addFieldIssue(fieldIssues, 'phone', `Too short: ${original}`);
  }
  
  if (normalized !== original) {
    log.fixesApplied.push(`Cleaned phone number from "${original}" to "${normalized}"`);
  }
  
  return normalized;
}

function normalizeEmail(email: string, log: ValidationLog, fieldIssues: any): string | null {
  const original = email;
  const normalized = email.toLowerCase().trim();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    log.warnings.push(`Email "${original}" appears to be invalid format`);
    addFieldIssue(fieldIssues, 'email', `Invalid format: ${original}`);
    return null; // Return null for invalid emails since field is nullable
  }
  
  if (normalized !== original) {
    log.fixesApplied.push(`Normalized email from "${original}" to "${normalized}"`);
  }
  
  return normalized;
}

function addFieldIssue(fieldIssues: any, fieldName: string, issue: string): void {
  if (!fieldIssues[fieldName]) {
    fieldIssues[fieldName] = { count: 0, samples: [] };
  }
  fieldIssues[fieldName].count++;
  if (fieldIssues[fieldName].samples.length < 5) {
    fieldIssues[fieldName].samples.push(issue);
  }
}

function generateValidationLogCSV(validationLog: ValidationLog[]): string {
  const headers = ['Row Number', 'Status', 'Fixes Applied', 'Warnings', 'Errors'];
  const rows = validationLog.map(log => [
    log.rowNumber,
    log.status,
    log.fixesApplied.join('; '),
    log.warnings.join('; '),
    log.errors.join('; ')
  ]);
  
  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateNormalizedPayloadJSONL(validationLog: ValidationLog[]): string {
  return validationLog
    .filter(log => log.normalizedData)
    .map(log => JSON.stringify({
      rowNumber: log.rowNumber,
      status: log.status,
      normalizedData: log.normalizedData
    }))
    .join('\n');
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Test endpoint to check authentication setup
  app.get("/api/auth/test", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const testResults = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passwordType: user.password.startsWith('$2b$') || user.password.startsWith('$2a$') ? 'hashed' : 'plain'
      }));
      res.json({ users: testResults, nodeEnv: process.env.NODE_ENV || 'development' });
    } catch (error) {
      console.error("Auth test error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin utility to ensure all passwords are properly hashed
  app.post("/api/auth/hash-passwords", async (req, res) => {
    try {
      const { adminKey } = req.body;
      
      // Simple admin check - only allow if specific key is provided
      if (adminKey !== "HASH_ADMIN_PASSWORDS_2025") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const users = await storage.getAllUsers();
      const updates = [];

      for (const user of users) {
        // Only hash plain text passwords
        if (!user.password.startsWith('$2b$') && !user.password.startsWith('$2a$')) {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await storage.updateUser(user.id, { password: hashedPassword });
          updates.push({ id: user.id, name: user.name, email: user.email, status: 'hashed' });
        } else {
          updates.push({ id: user.id, name: user.name, email: user.email, status: 'already_hashed' });
        }
      }

      res.json({ message: "Password hashing completed", updates });
    } catch (error) {
      console.error("Password hashing error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Production data seeding endpoint to create necessary users
  app.post("/api/auth/seed-users", async (req, res) => {
    try {
      const { adminKey } = req.body;
      
      // Simple admin check - only allow if specific key is provided
      if (adminKey !== "SEED_PRODUCTION_USERS_2025") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Define essential users that should exist in production
      const essentialUsers = [
        {
          name: "Admin User",
          email: "gundluru.mahammadwahab@nxtwave.co.in",
          password: "Nxtwave@1234", // Plain text for demo
          role: "admin",
          phone: null,
          isActive: true
        },
        {
          name: "Anupriya",
          email: "angupriya.bharaththangam@nxtwave.co.in",
          password: await bcrypt.hash("Nxtwave@1234", 10), // Consistent password
          role: "admin",
          phone: null,
          isActive: true
        },
        {
          name: "Likitha",
          email: "likhitha.nyasala@nxtwave.co.in", 
          password: await bcrypt.hash("Nxtwave@1234", 10),
          role: "counselor",
          phone: null,
          isActive: true
        },
        {
          name: "BASHIR SHAIK",
          email: "bashir.shaik@nxtwave.co.in",
          password: await bcrypt.hash("Nxtwave@1234", 10),
          role: "counselor", 
          phone: null,
          isActive: true
        },
        {
          name: "Sanjana",
          email: "madishetti.sanjana@nxtwave.tech",
          password: await bcrypt.hash("Nxtwave@1234", 10),
          role: "counselor",
          phone: null,
          isActive: true
        },
        {
          name: "Varsha", 
          email: "keesari.varsha@nxtwave.tech",
          password: await bcrypt.hash("Nxtwave@1234", 10),
          role: "counselor",
          phone: null,
          isActive: true
        },
        {
          name: "Priyanka",
          email: "tiruveedula.priyanka@nxtwave.tech",
          password: await bcrypt.hash("Nxtwave@1234", 10),
          role: "counselor",
          phone: null,
          isActive: true
        }
      ];

      const results = [];
      
      for (const userData of essentialUsers) {
        try {
          // Check if user already exists
          const existingUser = await storage.getUserByEmail(userData.email);
          
          if (existingUser) {
            results.push({ 
              email: userData.email, 
              name: userData.name,
              status: 'already_exists',
              id: existingUser.id 
            });
          } else {
            // Create new user
            const newUser = await storage.createUser({
              ...userData,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            results.push({ 
              email: userData.email, 
              name: userData.name,
              status: 'created',
              id: newUser.id 
            });
          }
        } catch (error) {
          results.push({ 
            email: userData.email, 
            name: userData.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({ 
        message: "User seeding completed", 
        results,
        note: "All users have password: Nxtwave@1234"
      });
    } catch (error) {
      console.error("User seeding error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log("Login attempt for email:", email, "in environment:", process.env.NODE_ENV || 'development');
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("User not found for email:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log("User found:", user.name, "Password type:", user.password.startsWith('$2b$') ? 'hashed' : 'plain');

      // Handle both plain text and hashed passwords for flexibility
      let isValid = false;
      
      try {
        // First try bcrypt comparison for hashed passwords
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
          console.log("Attempting bcrypt comparison...");
          isValid = await bcrypt.compare(password, user.password);
          console.log("Bcrypt comparison result:", isValid);
        } else {
          // Fallback to plain text comparison for demo accounts
          console.log("Attempting plain text comparison...");
          isValid = password === user.password;
          console.log("Plain text comparison result:", isValid);
        }
      } catch (error) {
        console.error("Password comparison error:", error);
        // If bcrypt fails, try plain text comparison as fallback
        console.log("Bcrypt failed, trying plain text fallback...");
        isValid = password === user.password;
        console.log("Fallback comparison result:", isValid);
      }
      
      if (!isValid) {
        console.log("Authentication failed for user:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log("Authentication successful for user:", email);
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({ 
        id: u.id, 
        name: u.name, 
        email: u.email, 
        role: u.role,
        phone: u.phone,
        isActive: u.isActive,
        createdAt: u.createdAt
      })));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/counselors", async (req, res) => {
    try {
      const counselors = await storage.getAllCounselors();
      res.json(counselors.map(c => ({ id: c.id, name: c.name, email: c.email })));
    } catch (error) {
      console.error("Get counselors error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = req.body;
      // Hash password if provided
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Lead routes
  app.get("/api/leads", async (req, res) => {
    try {
      const { stage, counselorId } = req.query;
      
      let leads;
      if (stage && stage !== "all") {
        leads = await storage.getLeadsByStage(stage as string);
      } else if (counselorId) {
        leads = await storage.getLeadsByCounselor(parseInt(counselorId as string));
      } else {
        leads = await storage.getAllLeads();
      }
      
      res.json(leads);
    } catch (error) {
      console.error("Get leads error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(parseInt(req.params.id));
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Get lead error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const lead = await storage.createLead(req.body);
      res.json(lead);
    } catch (error) {
      console.error("Create lead error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.updateLead(parseInt(req.params.id), req.body);
      res.json(lead);
    } catch (error) {
      console.error("Update lead error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/leads/:id/assign", async (req, res) => {
    try {
      const { counselorId } = req.body;
      await storage.assignLeadToCounselor(parseInt(req.params.id), counselorId);
      res.json({ success: true });
    } catch (error) {
      console.error("Assign lead error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/leads/assign-bulk", async (req, res) => {
    try {
      const { leadIds, counselorId } = req.body;
      
      for (const leadId of leadIds) {
        await storage.assignLeadToCounselor(leadId, counselorId);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Bulk assign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to migrate leads with empty counselor fields
  app.post("/api/leads/migrate-empty-counselors", async (req, res) => {
    try {
      const result = await storage.migrateEmptyCounselorLeads();
      res.json({
        success: true,
        message: `Successfully updated ${result.updated} leads from "Yet to Assign" to "Yet to Contact"`,
        ...result
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/leads/:id/stage", async (req, res) => {
    try {
      const { stage, userId, reason } = req.body;
      await storage.updateLeadStage(parseInt(req.params.id), stage, userId, reason);
      res.json({ success: true });
    } catch (error) {
      console.error("Update stage error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Task routes
  app.get("/api/leads/:id/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByLead(parseInt(req.params.id));
      res.json(tasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/leads/:id/tasks", async (req, res) => {
    try {
      const {
        userId,
        taskType,
        callType,
        connectStatus,
        country,
        intake,
        prevConsultancy,
        sessionStatus,
        sessionDate,
        isRescheduled,
        shortlistingInitiated,
        shortlistingStatus,
        shortlistingFinalStatus,
        applicationProcess,
        applicationCount,
        trackingStatus,
        applicationStatus,
        offerLetterStatus,
        visaStatus,
        depositStatus,
        tuitionStatus,
        commissionStatus,
        remarks,
        universityName,
        universityUrl,
        username,
        password,
        reasonNotInterested,
        preferredLanguage
      } = req.body;

      // Filter out undefined values and create clean task data
      const taskData: any = {
        leadId: parseInt(req.params.id),
        userId: parseInt(userId),
        taskType
      };

      // Add optional fields only if they have values
      if (callType) taskData.callType = callType;
      if (connectStatus) taskData.connectStatus = connectStatus;
      if (country) taskData.country = country;
      if (intake) taskData.intake = intake;
      if (prevConsultancy) taskData.prevConsultancy = prevConsultancy;
      if (sessionStatus) taskData.sessionStatus = sessionStatus;
      if (sessionDate) taskData.sessionDate = sessionDate;
      if (isRescheduled !== undefined) taskData.isRescheduled = isRescheduled === 'Yes';
      if (shortlistingInitiated) taskData.shortlistingInitiated = shortlistingInitiated;
      if (shortlistingStatus) taskData.shortlistingStatus = shortlistingStatus;
      if (shortlistingFinalStatus) taskData.shortlistingFinalStatus = shortlistingFinalStatus;
      if (applicationProcess) taskData.applicationProcess = applicationProcess;
      if (applicationCount) taskData.applicationCount = parseInt(applicationCount);
      if (trackingStatus) taskData.trackingStatus = trackingStatus;
      if (applicationStatus) taskData.applicationStatus = applicationStatus;
      if (offerLetterStatus) taskData.offerLetterStatus = offerLetterStatus;
      if (visaStatus) taskData.visaStatus = visaStatus;
      if (depositStatus) taskData.depositStatus = depositStatus;
      if (tuitionStatus) taskData.tuitionStatus = tuitionStatus;
      if (commissionStatus) taskData.commissionStatus = commissionStatus;
      // Remarks are now mandatory for all tasks
      if (!remarks || remarks.trim().length === 0) {
        return res.status(400).json({ error: "Remarks are required for all tasks" });
      }
      taskData.remarks = remarks.trim();
      if (reasonNotInterested) taskData.reasonNotInterested = reasonNotInterested;
      if (preferredLanguage) taskData.preferredLanguage = preferredLanguage;

      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Stage history routes
  app.get("/api/leads/:id/history", async (req, res) => {
    try {
      const history = await storage.getStageHistory(parseInt(req.params.id));
      res.json(history);
    } catch (error) {
      console.error("Get stage history error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Remarks routes
  app.get("/api/leads/:id/remarks", async (req, res) => {
    try {
      const remarks = await storage.getRemarksByLead(parseInt(req.params.id));
      res.json(remarks);
    } catch (error) {
      console.error("Get remarks error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/leads/:id/remarks", async (req, res) => {
    try {
      const remarkData = {
        leadId: parseInt(req.params.id),
        userId: req.body.userId,
        content: req.body.content,
        isVisible: req.body.isVisible ?? true
      };
      await storage.createRemark(remarkData);
      res.json({ success: true });
    } catch (error) {
      console.error("Create remark error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // University application routes
  app.get("/api/leads/:id/universities", async (req, res) => {
    try {
      const apps = await storage.getUniversityApplications(parseInt(req.params.id));
      res.json(apps);
    } catch (error) {
      console.error("Get university applications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/leads/:id/universities", async (req, res) => {
    try {
      const appData = {
        ...req.body,
        leadId: parseInt(req.params.id)
      };
      await storage.createUniversityApplication(appData);
      res.json({ success: true });
    } catch (error) {
      console.error("Create university application error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Bulk Import route for high-volume resilient processing
  app.post("/api/imports/leads/bulk", async (req, res) => {
    try {
      const { leads, dryRun = false, chunkSize = 1000 } = req.body;
      
      if (!leads || !Array.isArray(leads)) {
        return res.status(400).json({ error: "Invalid leads data" });
      }

      const result = await processBulkLeadImport(leads, dryRun, chunkSize, storage);
      res.json(result);
    } catch (error) {
      console.error("Bulk import error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // File Upload endpoint for large CSV imports (5000+ leads)
  app.post("/api/imports/leads/upload", upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      const { dryRun = 'false', chunkSize = '1000' } = req.body;
      const isDryRun = dryRun === 'true';
      const processChunkSize = parseInt(chunkSize) || 1000;

      // Read and parse CSV file stream
      const csvContent = fs.readFileSync(req.file.path, 'utf-8');
      
      // Parse CSV content (simple CSV parser for large files)
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Empty CSV file" });
      }

      // Extract headers and data
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataLines = lines.slice(1);

      // Convert CSV rows to objects
      const leads = dataLines.map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const lead: any = {};
        
        headers.forEach((header, i) => {
          const key = header === 'Student Name' ? 'studentName' :
                     header === 'Lead Created Date' ? 'leadCreatedDate' :
                     header === 'MobileNumber' ? 'mobileNumber' :
                     header === 'Current Stage' ? 'currentStage' :
                     header === 'Passport Status' ? 'passportStatus' :
                     header.toLowerCase();
          lead[key] = values[i] || '';
        });
        
        return lead;
      });

      // Process through bulk import system
      const result = await processBulkLeadImport(leads, isDryRun, processChunkSize, storage);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json(result);
    } catch (error) {
      console.error("File upload import error:", error);
      // Clean up file on error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Enhanced CSV Import route
  app.post("/api/leads/import-csv", async (req, res) => {
    try {
      const { leads } = req.body;
      
      if (!leads || !Array.isArray(leads)) {
        return res.status(400).json({ error: "Invalid leads data" });
      }

      const importedLeads = [];
      const errors = [];
      let managerId = null;
      let counselors: any[] = [];
      let defaultCounselor: any = null;

      // Find manager ID (Anupriya) and fetch all counselors
      try {
        const users = await storage.getAllUsers();
        const manager = users.find(u => u.name.toLowerCase().includes('anupriya') || u.role === 'admin');
        managerId = manager?.id || null;
        
        // Get all counselors for smart assignment
        counselors = users.filter(u => u.role === 'counselor');
        
        // Find default counselor (Likitha)
        defaultCounselor = counselors.find(c => c.name.toLowerCase().includes('likitha'));
      } catch (error) {
        console.log("Could not find manager or counselors, using null");
      }

      for (let i = 0; i < leads.length; i++) {
        const leadData = leads[i];
        
        try {
          // Skip leads with validation errors (frontend already filtered these)
          if (leadData.errors && leadData.errors.length > 0) {
            continue;
          }

          // Smart counselor assignment logic
          let assignedCounselorId = null;
          let assignedStage = "Yet to Assign";
          
          if (leadData.counsellors && leadData.counsellors.trim()) {
            // Case-insensitive search for matching counselor
            const counselorName = leadData.counsellors.trim().toLowerCase();
            const matchedCounselor = counselors.find(c => 
              c.name.toLowerCase().includes(counselorName) || 
              counselorName.includes(c.name.toLowerCase())
            );
            
            if (matchedCounselor) {
              // Found exact match
              assignedCounselorId = matchedCounselor.id;
              assignedStage = "Yet to Contact";
            } else if (defaultCounselor) {
              // No match found, assign to default counselor (Likitha)
              assignedCounselorId = defaultCounselor.id;
              assignedStage = "Yet to Contact";
            }
          }

          // Create lead with enhanced assignment logic
          const newLead = await storage.createLead({
            uid: leadData.uid || null,
            name: leadData.studentName,
            email: leadData.email || null,
            phone: leadData.normalizedMobile || leadData.mobileNumber,
            country: leadData.normalizedCountry || leadData.country,
            course: null,
            intake: leadData.normalizedIntake || leadData.intake,
            source: leadData.source,
            currentStage: leadData.currentStage || assignedStage,
            counselorId: assignedCounselorId,
            managerId: managerId,
            prevConsultancy: null,
            passportStatus: leadData.passportStatus || null,
            remarks: null, // We'll handle remarks separately
            counsellors: leadData.counsellors || null
          });

          // Create initial remarks entry from CSV if remarks exist
          if (leadData.remarks && leadData.remarks.trim()) {
            try {
              await storage.createRemark({
                leadId: newLead.id,
                userId: assignedCounselorId || managerId || 1,
                content: `CSV Import: ${leadData.remarks.trim()}`,
                isVisible: true
              });
            } catch (remarkError) {
              console.log(`Could not create remark for lead ${newLead.id}:`, remarkError);
            }
          }

          // Create initial stage history entry
          if ((leadData.currentStage || assignedStage) && (leadData.currentStage || assignedStage) !== "Yet to Assign") {
            try {
              await storage.createStageHistory({
                leadId: newLead.id,
                fromStage: null,
                toStage: leadData.currentStage || assignedStage,
                userId: assignedCounselorId || managerId || 1,
                reason: `Initial import from CSV${assignedCounselorId ? ` - Assigned to counselor` : ''}`,
                createdAt: leadData.leadCreatedDate && !leadData.defaultedDate ? 
                  new Date(leadData.leadCreatedDate) : new Date()
              });
            } catch (historyError) {
              console.log(`Could not create history for lead ${newLead.id}:`, historyError);
            }
          }

          importedLeads.push(newLead);
        } catch (error: any) {
          errors.push(`Row ${leadData.rowIndex || i + 1}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        imported: importedLeads.length,
        errors,
        leads: importedLeads
      });
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dashboard stats routes
  app.get("/api/stats/overview", async (req, res) => {
    try {
      const allLeads = await storage.getAllLeads();
      const totalLeads = allLeads.length;
      const unassignedLeads = allLeads.filter(l => l.currentStage === "Yet to Assign").length;
      const activeCounselors = await storage.getAllCounselors();
      
      res.json({
        totalLeads,
        unassignedLeads,
        activeCounselors: activeCounselors.filter(c => c.isActive).length,
        conversionRate: totalLeads > 0 ? ((allLeads.filter(l => l.currentStage === "Commission Received").length / totalLeads) * 100).toFixed(1) : "0.0"
      });
    } catch (error) {
      console.error("Get overview stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Document routes
  app.get("/api/documents/:leadId", async (req, res) => {
    try {
      const leadId = parseInt(req.params.leadId);
      const documents = await storage.getDocumentsByLead(leadId);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const documentData = req.body;
      const document = await storage.createDocument(documentData);
      res.json(document);
    } catch (error) {
      console.error("Create document error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const document = await storage.updateDocument(id, updateData);
      res.json(document);
    } catch (error) {
      console.error("Update document error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
