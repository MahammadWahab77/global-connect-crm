import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("counselor"), // 'admin' or 'counselor'
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  uid: text("uid"), // External UID from CSV
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  country: text("country"),
  course: text("course"),
  intake: text("intake"),
  source: text("source"),
  currentStage: text("current_stage").notNull().default("Yet to Assign"),
  counselorId: integer("counselor_id").references(() => users.id),
  managerId: integer("manager_id").references(() => users.id),
  prevConsultancy: text("prev_consultancy"),
  passportStatus: text("passport_status"),
  remarks: text("remarks"),
  counsellors: text("counsellors"), // From CSV - assigned counselor names
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Stage history tracking
export const stageHistory = pgTable("stage_history", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tasks and interactions
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  userId: integer("user_id").notNull().references(() => users.id),
  taskType: text("task_type").notNull(), // 'Call', 'Meet Done', etc.
  callType: text("call_type"),
  callStatus: text("call_status"),
  connectStatus: text("connect_status"),
  sessionStatus: text("session_status"),
  sessionDate: timestamp("session_date"),
  isRescheduled: boolean("is_rescheduled").default(false),
  shortlistingInitiated: text("shortlisting_initiated"),
  shortlistingStatus: text("shortlisting_status"),
  applicationProcess: text("application_process"),
  applicationCount: integer("application_count"),
  trackingStatus: text("tracking_status"),
  applicationStatus: text("application_status"),
  offerLetterStatus: text("offer_letter_status"),
  visaStatus: text("visa_status"),
  depositStatus: text("deposit_status"),
  tuitionStatus: text("tuition_status"),
  commissionStatus: text("commission_status"),
  remarks: text("remarks"),
  reasonNotInterested: text("reason_not_interested"),
  preferredLanguage: text("preferred_language"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// University applications tracking
export const universityApplications = pgTable("university_applications", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  universityName: text("university_name").notNull(),
  universityUrl: text("university_url"),
  username: text("username"),
  password: text("password"),
  status: text("status").default("In Progress"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Remarks/comments
export const remarks = pgTable("remarks", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Documents management
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Schema validations
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertLeadSchema = createInsertSchema(leads);
export const selectLeadSchema = createSelectSchema(leads);
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export const insertStageHistorySchema = createInsertSchema(stageHistory);
export const insertRemarkSchema = createInsertSchema(remarks);
export const insertUniversityApplicationSchema = createInsertSchema(universityApplications);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = z.infer<typeof selectLeadSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = z.infer<typeof selectTaskSchema>;
export type InsertStageHistory = z.infer<typeof insertStageHistorySchema>;
export type StageHistory = typeof stageHistory.$inferSelect;
export type InsertRemark = z.infer<typeof insertRemarkSchema>;
export type Remark = typeof remarks.$inferSelect;
export type InsertUniversityApplication = z.infer<typeof insertUniversityApplicationSchema>;
export type UniversityApplication = typeof universityApplications.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
