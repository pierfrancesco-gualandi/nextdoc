import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("viewer"), // viewer, editor, admin
  name: text("name").notNull(),
  email: text("email").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  name: true,
  email: true,
});

// Document schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, in_review, approved, obsolete
  version: text("version").notNull().default("1.0"),
  createdById: integer("created_by_id").notNull(),
  updatedById: integer("updated_by_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  description: true,
  status: true,
  version: true,
  createdById: true,
  updatedById: true,
});

// Section schema
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  parentId: integer("parent_id"),
  isModule: boolean("is_module").default(false),
});

export const insertSectionSchema = createInsertSchema(sections).pick({
  documentId: true,
  title: true,
  description: true,
  order: true,
  parentId: true,
  isModule: true,
});

// Content module schema
export const contentModules = pgTable("content_modules", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull(),
  type: text("type").notNull(), // text, image, video, table, component, checklist, warning, link, pdf
  content: jsonb("content").notNull(),
  order: integer("order").notNull(),
});

export const insertContentModuleSchema = createInsertSchema(contentModules).pick({
  sectionId: true,
  type: true,
  content: true,
  order: true,
});

// Document version schema
export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  version: text("version").notNull(),
  content: jsonb("content").notNull(), // Full document state snapshot
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  notes: text("notes"),
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).pick({
  documentId: true,
  version: true,
  content: true,
  createdById: true,
  notes: true,
});

// Component schema (for BOM)
export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  details: jsonb("details"),
});

export const insertComponentSchema = createInsertSchema(components).pick({
  code: true,
  description: true,
  details: true,
});

// BOM schema (Bill of Materials)
export const boms = pgTable("boms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
});

export const insertBomSchema = createInsertSchema(boms).pick({
  title: true,
  description: true,
});

// BOM items (connecting BOM with components)
export const bomItems = pgTable("bom_items", {
  id: serial("id").primaryKey(),
  bomId: integer("bom_id").notNull(),
  componentId: integer("component_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const insertBomItemSchema = createInsertSchema(bomItems).pick({
  bomId: true,
  componentId: true,
  quantity: true,
});

// Section components (connecting Sections with components)
export const sectionComponents = pgTable("section_components", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull(),
  componentId: integer("component_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
});

export const insertSectionComponentSchema = createInsertSchema(sectionComponents).pick({
  sectionId: true,
  componentId: true,
  quantity: true,
  notes: true,
});

// Document comments
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sectionId: integer("section_id"),
  moduleId: integer("module_id"),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  documentId: true,
  userId: true,
  content: true,
  sectionId: true,
  moduleId: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Section = typeof sections.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;

export type ContentModule = typeof contentModules.$inferSelect;
export type InsertContentModule = z.infer<typeof insertContentModuleSchema>;

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;

export type Component = typeof components.$inferSelect;
export type InsertComponent = z.infer<typeof insertComponentSchema>;

export type Bom = typeof boms.$inferSelect;
export type InsertBom = z.infer<typeof insertBomSchema>;

export type BomItem = typeof bomItems.$inferSelect;
export type InsertBomItem = z.infer<typeof insertBomItemSchema>;

export type SectionComponent = typeof sectionComponents.$inferSelect;
export type InsertSectionComponent = z.infer<typeof insertSectionComponentSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// Type definitions for the content field in content modules
export type TextModuleContent = {
  text: string;
};

export type ImageModuleContent = {
  src: string;
  alt: string;
  caption?: string;
};

export type VideoModuleContent = {
  src: string;
  caption?: string;
};

export type TableModuleContent = {
  headers: string[];
  rows: string[][];
  caption?: string;
};

export type ComponentModuleContent = {
  componentId: number;
  quantity: number;
};

export type ChecklistModuleContent = {
  items: {
    text: string;
    checked: boolean;
  }[];
};

export type WarningModuleContent = {
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error';
};

export type LinkModuleContent = {
  url: string;
  text: string;
  description?: string;
};

export type PdfModuleContent = {
  src: string;
  title?: string;
};

export type BomModuleContent = {
  bomId: number;
  filter?: string;
};

// Languages schema
export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // ISO code (e.g., 'en', 'it', 'fr')
  name: text("name").notNull(), // Full name (e.g., 'English', 'Italiano', 'Français')
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").default(false),
});

export const insertLanguageSchema = createInsertSchema(languages).pick({
  code: true,
  name: true,
  isActive: true,
  isDefault: true,
});

// Translation status enum values: 'not_translated', 'ai_suggested', 'in_review', 'approved'
// Translation assignments for users
export const translationAssignments = pgTable("translation_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  languageId: integer("language_id").notNull(),
  isReviewer: boolean("is_reviewer").default(false), // User can be translator and/or reviewer
});

export const insertTranslationAssignmentSchema = createInsertSchema(translationAssignments).pick({
  userId: true,
  languageId: true,
  isReviewer: true,
});

// Section translations
export const sectionTranslations = pgTable("section_translations", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull(),
  languageId: integer("language_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("not_translated"), // not_translated, ai_suggested, in_review, approved
  translatedById: integer("translated_by_id"),
  reviewedById: integer("reviewed_by_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSectionTranslationSchema = createInsertSchema(sectionTranslations).pick({
  sectionId: true,
  languageId: true,
  title: true,
  description: true,
  status: true,
  translatedById: true,
  reviewedById: true,
});

// Content module translations
export const contentModuleTranslations = pgTable("content_module_translations", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  languageId: integer("language_id").notNull(),
  content: jsonb("content").notNull(),
  status: text("status").notNull().default("not_translated"), // not_translated, ai_suggested, in_review, approved
  translatedById: integer("translated_by_id"),
  reviewedById: integer("reviewed_by_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertContentModuleTranslationSchema = createInsertSchema(contentModuleTranslations).pick({
  moduleId: true,
  languageId: true,
  content: true,
  status: true,
  translatedById: true,
  reviewedById: true,
});

// Translation import logs
export const translationImports = pgTable("translation_imports", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  importedById: integer("imported_by_id").notNull(),
  languageId: integer("language_id").notNull(),
  format: text("format").notNull(), // csv, json, etc.
  status: text("status").notNull(), // success, partial, error
  details: jsonb("details"), // Stats about the import
  importedAt: timestamp("imported_at").notNull().defaultNow(),
});

export const insertTranslationImportSchema = createInsertSchema(translationImports).pick({
  filename: true,
  importedById: true,
  languageId: true,
  format: true, 
  status: true,
  details: true,
});

// Translation AI requests
export const translationAIRequests = pgTable("translation_ai_requests", {
  id: serial("id").primaryKey(),
  sourceLanguageId: integer("source_language_id").notNull(),
  targetLanguageId: integer("target_language_id").notNull(),
  requestedById: integer("requested_by_id").notNull(),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  requestType: text("request_type").notNull(), // document, section, module
  sourceId: integer("source_id").notNull(), // ID of the document, section, or module
  details: jsonb("details"), // Any details or response information
});

export const insertTranslationAIRequestSchema = createInsertSchema(translationAIRequests).pick({
  sourceLanguageId: true,
  targetLanguageId: true,
  requestedById: true,
  status: true,
  requestType: true,
  sourceId: true,
  details: true,
});

// Export translation types
export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;

export type TranslationAssignment = typeof translationAssignments.$inferSelect;
export type InsertTranslationAssignment = z.infer<typeof insertTranslationAssignmentSchema>;

export type SectionTranslation = typeof sectionTranslations.$inferSelect;
export type InsertSectionTranslation = z.infer<typeof insertSectionTranslationSchema>;

export type ContentModuleTranslation = typeof contentModuleTranslations.$inferSelect;
export type InsertContentModuleTranslation = z.infer<typeof insertContentModuleTranslationSchema>;

export type TranslationImport = typeof translationImports.$inferSelect;
export type InsertTranslationImport = z.infer<typeof insertTranslationImportSchema>;

export type TranslationAIRequest = typeof translationAIRequests.$inferSelect;
export type InsertTranslationAIRequest = z.infer<typeof insertTranslationAIRequestSchema>;
