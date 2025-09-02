import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, and, desc, sql } from "drizzle-orm";
import ws from "ws";
import { 
  users, 
  leads, 
  tasks, 
  stageHistory, 
  remarks, 
  universityApplications,
  documents,
  type User, 
  type InsertUser, 
  type Lead,
  type InsertLead,
  type Task,
  type InsertTask,
  type InsertStageHistory,
  type InsertRemark,
  type InsertUniversityApplication,
  type Document,
  type InsertDocument
} from "@shared/schema";

// Configure WebSocket for serverless environment
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getAllCounselors(): Promise<User[]>;
  
  // Lead methods
  getAllLeads(): Promise<Lead[]>;
  getLeadsByStage(stage: string): Promise<Lead[]>;
  getLeadsByCounselor(counselorId: number): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead>;
  assignLeadToCounselor(leadId: number, counselorId: number): Promise<void>;
  updateLeadStage(leadId: number, newStage: string, userId: number, reason?: string): Promise<void>;
  
  // Task methods
  getTasksByLead(leadId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  
  // Stage history methods
  getStageHistory(leadId: number): Promise<any[]>;
  createStageHistory(history: InsertStageHistory): Promise<void>;
  
  // Remarks methods
  getRemarksByLead(leadId: number): Promise<any[]>;
  createRemark(remark: InsertRemark): Promise<void>;
  
  // University applications
  getUniversityApplications(leadId: number): Promise<any[]>;
  createUniversityApplication(app: InsertUniversityApplication): Promise<void>;
  
  // Document methods
  getDocumentsByLead(leadId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllCounselors(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "counselor"));
  }

  async getAllLeads(): Promise<Lead[]> {
    return await db
      .select({
        id: leads.id,
        uid: leads.uid,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        country: leads.country,
        course: leads.course,
        intake: leads.intake,
        source: leads.source,
        currentStage: leads.currentStage,
        counselorId: leads.counselorId,
        managerId: leads.managerId,
        prevConsultancy: leads.prevConsultancy,
        passportStatus: leads.passportStatus,
        remarks: leads.remarks,
        counsellors: leads.counsellors,
        counselorName: users.name,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .leftJoin(users, eq(leads.counselorId, users.id))
      .orderBy(desc(leads.createdAt));
  }

  async getLeadsByStage(stage: string): Promise<Lead[]> {
    return await db
      .select({
        id: leads.id,
        uid: leads.uid,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        country: leads.country,
        course: leads.course,
        intake: leads.intake,
        source: leads.source,
        currentStage: leads.currentStage,
        counselorId: leads.counselorId,
        managerId: leads.managerId,
        prevConsultancy: leads.prevConsultancy,
        passportStatus: leads.passportStatus,
        remarks: leads.remarks,
        counsellors: leads.counsellors,
        counselorName: users.name,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .leftJoin(users, eq(leads.counselorId, users.id))
      .where(eq(leads.currentStage, stage))
      .orderBy(desc(leads.createdAt));
  }

  async getLeadsByCounselor(counselorId: number): Promise<Lead[]> {
    return await db
      .select({
        id: leads.id,
        uid: leads.uid,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        country: leads.country,
        course: leads.course,
        intake: leads.intake,
        source: leads.source,
        currentStage: leads.currentStage,
        counselorId: leads.counselorId,
        managerId: leads.managerId,
        prevConsultancy: leads.prevConsultancy,
        passportStatus: leads.passportStatus,
        remarks: leads.remarks,
        counsellors: leads.counsellors,
        counselorName: users.name,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .leftJoin(users, eq(leads.counselorId, users.id))
      .where(eq(leads.counselorId, counselorId))
      .orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const result = await db
      .select({
        id: leads.id,
        uid: leads.uid,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        country: leads.country,
        course: leads.course,
        intake: leads.intake,
        source: leads.source,
        currentStage: leads.currentStage,
        counselorId: leads.counselorId,
        managerId: leads.managerId,
        prevConsultancy: leads.prevConsultancy,
        passportStatus: leads.passportStatus,
        remarks: leads.remarks,
        counsellors: leads.counsellors,
        counselorName: users.name,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .leftJoin(users, eq(leads.counselorId, users.id))
      .where(eq(leads.id, id));
    return result[0];
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const result = await db.insert(leads).values(lead).returning();
    return result[0];
  }

  async updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead> {
    const result = await db.update(leads).set(lead).where(eq(leads.id, id)).returning();
    return result[0];
  }

  async assignLeadToCounselor(leadId: number, counselorId: number): Promise<void> {
    await db.update(leads).set({ 
      counselorId, 
      currentStage: "Assigned",
      updatedAt: new Date()
    }).where(eq(leads.id, leadId));
    
    // Add stage history
    await db.insert(stageHistory).values({
      leadId,
      fromStage: "Yet to Assign",
      toStage: "Assigned",
      userId: counselorId,
      reason: "Lead assigned to counselor"
    });
  }

  async updateLeadStage(leadId: number, newStage: string, userId: number, reason?: string): Promise<void> {
    const lead = await this.getLead(leadId);
    if (!lead) throw new Error("Lead not found");
    
    await db.update(leads).set({ 
      currentStage: newStage,
      updatedAt: new Date()
    }).where(eq(leads.id, leadId));
    
    await db.insert(stageHistory).values({
      leadId,
      fromStage: lead.currentStage,
      toStage: newStage,
      userId,
      reason
    });
  }

  async getTasksByLead(leadId: number): Promise<Task[]> {
    return await db
      .select({
        id: tasks.id,
        leadId: tasks.leadId,
        userId: tasks.userId,
        userName: users.name,
        taskType: tasks.taskType,
        callType: tasks.callType,
        connectStatus: tasks.connectStatus,
        sessionStatus: tasks.sessionStatus,
        sessionDate: tasks.sessionDate,
        isRescheduled: tasks.isRescheduled,
        shortlistingInitiated: tasks.shortlistingInitiated,
        shortlistingStatus: tasks.shortlistingStatus,
        applicationProcess: tasks.applicationProcess,
        applicationCount: tasks.applicationCount,
        trackingStatus: tasks.trackingStatus,
        applicationStatus: tasks.applicationStatus,
        offerLetterStatus: tasks.offerLetterStatus,
        visaStatus: tasks.visaStatus,
        depositStatus: tasks.depositStatus,
        tuitionStatus: tasks.tuitionStatus,
        commissionStatus: tasks.commissionStatus,
        remarks: tasks.remarks,
        reasonNotInterested: tasks.reasonNotInterested,
        preferredLanguage: tasks.preferredLanguage,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.userId, users.id))
      .where(eq(tasks.leadId, leadId))
      .orderBy(desc(tasks.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    // Handle sessionDate conversion if it exists and is a string
    const processedTask = {
      ...task,
      sessionDate: task.sessionDate ? (typeof task.sessionDate === 'string' ? new Date(task.sessionDate) : task.sessionDate) : null,
      createdAt: new Date()
    };
    const result = await db.insert(tasks).values(processedTask).returning();
    return result[0];
  }

  async getStageHistory(leadId: number): Promise<any[]> {
    const result = await db
      .select({
        id: stageHistory.id,
        fromStage: stageHistory.fromStage,
        toStage: stageHistory.toStage,
        userId: stageHistory.userId,
        userName: users.name,
        reason: stageHistory.reason,
        createdAt: stageHistory.createdAt
      })
      .from(stageHistory)
      .leftJoin(users, eq(stageHistory.userId, users.id))
      .where(eq(stageHistory.leadId, leadId))
      .orderBy(desc(stageHistory.createdAt));
    
    return result;
  }

  async createStageHistory(history: InsertStageHistory): Promise<void> {
    await db.insert(stageHistory).values(history);
  }

  async getRemarksByLead(leadId: number): Promise<any[]> {
    const result = await db
      .select({
        id: remarks.id,
        content: remarks.content,
        userId: remarks.userId,
        userName: users.name,
        isVisible: remarks.isVisible,
        createdAt: remarks.createdAt
      })
      .from(remarks)
      .leftJoin(users, eq(remarks.userId, users.id))
      .where(eq(remarks.leadId, leadId))
      .orderBy(desc(remarks.createdAt));
    
    return result;
  }

  async createRemark(remark: InsertRemark): Promise<void> {
    await db.insert(remarks).values(remark);
  }

  async getUniversityApplications(leadId: number): Promise<any[]> {
    return await db.select().from(universityApplications).where(eq(universityApplications.leadId, leadId));
  }

  async createUniversityApplication(app: InsertUniversityApplication): Promise<void> {
    await db.insert(universityApplications).values(app);
  }

  async getDocumentsByLead(leadId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.leadId, leadId));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values(document).returning();
    return result[0];
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const result = await db.update(documents)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
