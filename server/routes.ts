import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // For demo purposes, allow simple password comparison
      // In production, use proper password hashing
      const isValid = password === user.password || await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

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
            email: leadData.email || `lead${Date.now()}@placeholder.com`,
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
