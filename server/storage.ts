import {
  users, User, InsertUser,
  documents, Document, InsertDocument,
  sections, Section, InsertSection,
  contentModules, ContentModule, InsertContentModule,
  documentVersions, DocumentVersion, InsertDocumentVersion,
  components, Component, InsertComponent,
  boms, Bom, InsertBom,
  bomItems, BomItem, InsertBomItem,
  sectionComponents, SectionComponent, InsertSectionComponent,
  uploadedFiles, UploadedFile, InsertUploadedFile,
  comments, Comment, InsertComment,
  // Translation schemas and types
  languages, Language, InsertLanguage,
  translationAssignments, TranslationAssignment, InsertTranslationAssignment,
  sectionTranslations, SectionTranslation, InsertSectionTranslation,
  contentModuleTranslations, ContentModuleTranslation, InsertContentModuleTranslation,
  translationImports, TranslationImport, InsertTranslationImport,
  translationAIRequests, TranslationAIRequest, InsertTranslationAIRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, desc, asc, isNull, count, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  searchDocuments(query: string): Promise<Document[]>;

  // Section operations
  getSection(id: number): Promise<Section | undefined>;
  getSectionsByDocumentId(documentId: number): Promise<Section[]>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: number, section: Partial<InsertSection>): Promise<Section | undefined>;
  deleteSection(id: number): Promise<boolean>;
  reorderSections(documentId: number, sectionIds: number[]): Promise<boolean>;

  // Content module operations
  getContentModule(id: number): Promise<ContentModule | undefined>;
  getContentModulesBySectionId(sectionId: number): Promise<ContentModule[]>;
  createContentModule(module: InsertContentModule): Promise<ContentModule>;
  updateContentModule(id: number, module: Partial<InsertContentModule>): Promise<ContentModule | undefined>;
  deleteContentModule(id: number): Promise<boolean>;
  reorderContentModules(sectionId: number, moduleIds: number[]): Promise<boolean>;

  // Document version operations
  getDocumentVersion(id: number): Promise<DocumentVersion | undefined>;
  getDocumentVersionsByDocumentId(documentId: number): Promise<DocumentVersion[]>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;

  // Component (BOM) operations
  getComponent(id: number): Promise<Component | undefined>;
  getComponents(): Promise<Component[]>;
  getComponentByCode(code: string): Promise<Component | undefined>;
  getComponentsByCode(code: string): Promise<Component[]>;
  createComponent(component: InsertComponent): Promise<Component>;
  updateComponent(id: number, component: Partial<InsertComponent>): Promise<Component | undefined>;
  deleteComponent(id: number): Promise<boolean>;
  searchComponents(query: string): Promise<Component[]>;

  // BOM operations
  getBom(id: number): Promise<Bom | undefined>;
  getBoms(): Promise<Bom[]>;
  createBom(bom: InsertBom): Promise<Bom>;
  updateBom(id: number, bom: Partial<InsertBom>): Promise<Bom | undefined>;
  deleteBom(id: number): Promise<boolean>;
  
  // BOM item operations
  getBomItem(id: number): Promise<BomItem | undefined>;
  getBomItemsByBomId(bomId: number): Promise<BomItem[]>;
  createBomItem(item: InsertBomItem): Promise<BomItem>;
  updateBomItem(id: number, item: Partial<InsertBomItem>): Promise<BomItem | undefined>;
  deleteBomItem(id: number): Promise<boolean>;
  deleteBomItems(bomId: number): Promise<boolean>;
  
  // Section-Component operations
  getSectionComponent(id: number): Promise<SectionComponent | undefined>;
  getSectionComponentsBySectionId(sectionId: number): Promise<SectionComponent[]>;
  getSectionComponentsByComponentId(componentId: number): Promise<SectionComponent[]>;
  createSectionComponent(sectionComponent: InsertSectionComponent): Promise<SectionComponent>;
  updateSectionComponent(id: number, sectionComponent: Partial<InsertSectionComponent>): Promise<SectionComponent | undefined>;
  deleteSectionComponent(id: number): Promise<boolean>;
  deleteSectionComponentsBySectionId(sectionId: number): Promise<boolean>;
  
  // Comment operations
  getComment(id: number): Promise<Comment | undefined>;
  getCommentsByDocumentId(documentId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;

  // Module library operations
  getModules(): Promise<Section[]>;
  
  // Language operations
  getLanguage(id: number): Promise<Language | undefined>;
  getLanguageByCode(code: string): Promise<Language | undefined>;
  getLanguages(activeOnly?: boolean): Promise<Language[]>;
  createLanguage(language: InsertLanguage): Promise<Language>;
  updateLanguage(id: number, language: Partial<InsertLanguage>): Promise<Language | undefined>;
  deleteLanguage(id: number): Promise<boolean>;

  // Translation assignment operations
  getTranslationAssignment(id: number): Promise<TranslationAssignment | undefined>;
  getTranslationAssignmentsByUserId(userId: number): Promise<TranslationAssignment[]>;
  getTranslationAssignmentsByLanguageId(languageId: number): Promise<TranslationAssignment[]>;
  createTranslationAssignment(assignment: InsertTranslationAssignment): Promise<TranslationAssignment>;
  updateTranslationAssignment(id: number, assignment: Partial<InsertTranslationAssignment>): Promise<TranslationAssignment | undefined>;
  deleteTranslationAssignment(id: number): Promise<boolean>;

  // Section translation operations
  getSectionTranslation(id: number): Promise<SectionTranslation | undefined>;
  getSectionTranslationByLanguage(sectionId: number, languageId: number): Promise<SectionTranslation | undefined>;
  getSectionTranslationsByLanguageId(languageId: number): Promise<SectionTranslation[]>;
  getSectionTranslationsBySectionId(sectionId: number): Promise<SectionTranslation[]>;
  createSectionTranslation(translation: InsertSectionTranslation): Promise<SectionTranslation>;
  updateSectionTranslation(id: number, translation: Partial<InsertSectionTranslation>): Promise<SectionTranslation | undefined>;
  deleteSectionTranslation(id: number): Promise<boolean>;

  // Content module translation operations
  getContentModuleTranslation(id: number): Promise<ContentModuleTranslation | undefined>;
  getContentModuleTranslationByLanguage(moduleId: number, languageId: number): Promise<ContentModuleTranslation | undefined>;
  getContentModuleTranslationsByLanguageId(languageId: number): Promise<ContentModuleTranslation[]>;
  getContentModuleTranslationsByModuleId(moduleId: number): Promise<ContentModuleTranslation[]>;
  createContentModuleTranslation(translation: InsertContentModuleTranslation): Promise<ContentModuleTranslation>;
  updateContentModuleTranslation(id: number, translation: Partial<InsertContentModuleTranslation>): Promise<ContentModuleTranslation | undefined>;
  deleteContentModuleTranslation(id: number): Promise<boolean>;

  // Translation import operations
  getTranslationImport(id: number): Promise<TranslationImport | undefined>;
  getTranslationImports(): Promise<TranslationImport[]>;
  createTranslationImport(importData: InsertTranslationImport): Promise<TranslationImport>;
  processTranslationImport(importId: number, data: any): Promise<boolean>;

  // Translation AI operations
  getTranslationAIRequest(id: number): Promise<TranslationAIRequest | undefined>;
  getTranslationAIRequests(): Promise<TranslationAIRequest[]>;
  createTranslationAIRequest(request: InsertTranslationAIRequest): Promise<TranslationAIRequest>;
  updateTranslationAIRequest(id: number, request: Partial<InsertTranslationAIRequest>): Promise<TranslationAIRequest | undefined>;
  
  // Document translations - utility methods
  getDocumentTranslationStatus(documentId: number, languageId: number): Promise<{
    totalSections: number;
    totalModules: number;
    translatedSections: number;
    translatedModules: number;
    reviewedSections: number;
    reviewedModules: number;
  }>;
  
  // File upload operations
  getUploadedFile(id: number): Promise<UploadedFile | undefined>;
  getUploadedFiles(limit?: number, userId?: number): Promise<UploadedFile[]>;
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  deleteUploadedFile(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private sections: Map<number, Section>;
  private contentModules: Map<number, ContentModule>;
  private documentVersions: Map<number, DocumentVersion>;
  private components: Map<number, Component>;
  private boms: Map<number, Bom>;
  private bomItems: Map<number, BomItem>;
  private sectionComponents: Map<number, SectionComponent>;
  private comments: Map<number, Comment>;
  
  // Translation-related maps
  private languages: Map<number, Language>;
  private translationAssignments: Map<number, TranslationAssignment>;
  private sectionTranslations: Map<number, SectionTranslation>;
  private contentModuleTranslations: Map<number, ContentModuleTranslation>;
  private translationImports: Map<number, TranslationImport>;
  private translationAIRequests: Map<number, TranslationAIRequest>;
  private uploadedFiles: Map<number, UploadedFile>;

  private currentUserId: number;
  private currentDocumentId: number;
  private currentSectionId: number;
  private currentContentModuleId: number;
  private currentDocumentVersionId: number;
  private currentComponentId: number;
  private currentBomId: number;
  private currentBomItemId: number;
  private currentSectionComponentId: number;
  private currentCommentId: number;
  
  // Translation-related counters
  private currentLanguageId: number;
  private currentTranslationAssignmentId: number;
  private currentSectionTranslationId: number;
  private currentContentModuleTranslationId: number;
  private currentTranslationImportId: number;
  private currentTranslationAIRequestId: number;
  private currentUploadedFileId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.sections = new Map();
    this.contentModules = new Map();
    this.documentVersions = new Map();
    this.components = new Map();
    this.boms = new Map();
    this.bomItems = new Map();
    this.sectionComponents = new Map();
    this.comments = new Map();
    
    // Initialize translation maps
    this.languages = new Map();
    this.translationAssignments = new Map();
    this.sectionTranslations = new Map();
    this.contentModuleTranslations = new Map();
    this.translationImports = new Map();
    this.translationAIRequests = new Map();
    this.uploadedFiles = new Map();

    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentSectionId = 1;
    this.currentContentModuleId = 1;
    this.currentDocumentVersionId = 1;
    this.currentComponentId = 1;
    this.currentBomId = 1;
    this.currentBomItemId = 1;
    this.currentSectionComponentId = 1;
    this.currentCommentId = 1;
    
    // Initialize translation counters
    this.currentLanguageId = 1;
    this.currentTranslationAssignmentId = 1;
    this.currentSectionTranslationId = 1;
    this.currentContentModuleTranslationId = 1;
    this.currentTranslationImportId = 1;
    this.currentTranslationAIRequestId = 1;
    this.currentUploadedFileId = 1;

    // Add an initial admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      role: "admin",
      name: "Administrator",
      email: "admin@example.com"
    });

    // Create sample components for BOM
    this.seedComponents();

    // Create sample BOM
    this.seedBoms();
    
    // Add default languages
    this.seedLanguages();
  }

  private seedComponents() {
    const components = [
      { code: "RC100-BASE", description: "Base pannello in alluminio" },
      { code: "RC100-PCB", description: "Scheda elettronica principale" },
      { code: "RC100-SW", description: "Set interruttori" },
      { code: "RC100-CON", description: "Connettori esterni" },
      { code: "RC100-CVR", description: "Copertura in plexiglass" },
      { code: "RC100-EX-PCB", description: "Scheda elettronica principale estesa" },
      { code: "RC100-EX-CON", description: "Set connettori esterni" },
      { code: "RC100-EX-SW", description: "Set interruttori avanzati" },
      { code: "RC100-EX-DSP", description: "Display LCD touchscreen" },
      { code: "RC100-EX-WIFI", description: "Modulo Wi-Fi" }
    ];

    components.forEach(comp => {
      this.createComponent({
        code: comp.code,
        description: comp.description,
        details: {}
      });
    });
  }

  private seedLanguages() {
    // Add default languages
    const languages = [
      { name: "Italiano", code: "it", isActive: true, isDefault: true },
      { name: "English", code: "en", isActive: true, isDefault: false },
      { name: "Français", code: "fr", isActive: true, isDefault: false },
      { name: "Deutsch", code: "de", isActive: true, isDefault: false },
      { name: "Español", code: "es", isActive: true, isDefault: false }
    ];
    
    languages.forEach(lang => {
      this.createLanguage(lang);
    });
  }

  private seedBoms() {
    // Create BOMs
    const bomId1 = this.createBom({
      title: "RC100 - Pannello Controllo Standard",
      description: "Distinta base per il pannello di controllo standard RC100"
    }).id;

    const bomId2 = this.createBom({
      title: "RC100-EX - Pannello Controllo Esteso",
      description: "Distinta base per il pannello di controllo esteso RC100-EX"
    }).id;

    // Add items to BOM 1
    const components1 = ["RC100-BASE", "RC100-PCB", "RC100-SW", "RC100-CON", "RC100-CVR"];
    components1.forEach(async (code) => {
      const component = await this.getComponentByCode(code);
      if (component) {
        this.createBomItem({
          bomId: bomId1,
          componentId: component.id,
          quantity: code === "RC100-SW" ? 3 : code === "RC100-CON" ? 4 : 1
        });
      }
    });

    // Add items to BOM 2
    const components2 = ["RC100-BASE", "RC100-EX-PCB", "RC100-EX-SW", "RC100-EX-CON", "RC100-CVR", "RC100-EX-DSP", "RC100-EX-WIFI"];
    components2.forEach(async (code) => {
      const component = await this.getComponentByCode(code);
      if (component) {
        this.createBomItem({
          bomId: bomId2,
          componentId: component.id,
          quantity: code === "RC100-EX-SW" ? 5 : code === "RC100-EX-CON" ? 6 : 1
        });
      }
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const now = new Date();
    const newDocument: Document = { 
      ...document, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.documents.set(id, newDocument);
    return newDocument;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const existingDocument = this.documents.get(id);
    if (!existingDocument) return undefined;

    const updatedDocument = { 
      ...existingDocument, 
      ...document, 
      updatedAt: new Date() 
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  async searchDocuments(query: string): Promise<Document[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.documents.values()).filter(doc => 
      doc.title.toLowerCase().includes(lowercaseQuery) || 
      (doc.description && doc.description.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Section operations
  async getSection(id: number): Promise<Section | undefined> {
    return this.sections.get(id);
  }

  async getSectionsByDocumentId(documentId: number): Promise<Section[]> {
    return Array.from(this.sections.values())
      .filter(section => section.documentId === documentId)
      .sort((a, b) => a.order - b.order);
  }

  async createSection(section: InsertSection): Promise<Section> {
    const id = this.currentSectionId++;
    const newSection: Section = { ...section, id };
    this.sections.set(id, newSection);
    return newSection;
  }

  async updateSection(id: number, section: Partial<InsertSection>): Promise<Section | undefined> {
    const existingSection = this.sections.get(id);
    if (!existingSection) return undefined;

    const updatedSection = { ...existingSection, ...section };
    this.sections.set(id, updatedSection);
    return updatedSection;
  }

  async deleteSection(id: number): Promise<boolean> {
    // Also delete all content modules in this section
    Array.from(this.contentModules.values())
      .filter(module => module.sectionId === id)
      .forEach(module => this.contentModules.delete(module.id));
    
    return this.sections.delete(id);
  }

  async reorderSections(documentId: number, sectionIds: number[]): Promise<boolean> {
    try {
      sectionIds.forEach((sectionId, index) => {
        const section = this.sections.get(sectionId);
        if (section && section.documentId === documentId) {
          this.sections.set(sectionId, { ...section, order: index });
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Content module operations
  async getContentModule(id: number): Promise<ContentModule | undefined> {
    return this.contentModules.get(id);
  }

  async getContentModulesBySectionId(sectionId: number): Promise<ContentModule[]> {
    return Array.from(this.contentModules.values())
      .filter(module => module.sectionId === sectionId)
      .sort((a, b) => a.order - b.order);
  }

  async createContentModule(module: InsertContentModule): Promise<ContentModule> {
    const id = this.currentContentModuleId++;
    const newModule: ContentModule = { ...module, id };
    this.contentModules.set(id, newModule);
    return newModule;
  }

  async updateContentModule(id: number, module: Partial<InsertContentModule>): Promise<ContentModule | undefined> {
    const existingModule = this.contentModules.get(id);
    if (!existingModule) return undefined;

    const updatedModule = { ...existingModule, ...module };
    this.contentModules.set(id, updatedModule);
    return updatedModule;
  }

  async deleteContentModule(id: number): Promise<boolean> {
    return this.contentModules.delete(id);
  }

  async reorderContentModules(sectionId: number, moduleIds: number[]): Promise<boolean> {
    try {
      moduleIds.forEach((moduleId, index) => {
        const module = this.contentModules.get(moduleId);
        if (module && module.sectionId === sectionId) {
          this.contentModules.set(moduleId, { ...module, order: index });
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Document version operations
  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    return this.documentVersions.get(id);
  }

  async getDocumentVersionsByDocumentId(documentId: number): Promise<DocumentVersion[]> {
    return Array.from(this.documentVersions.values())
      .filter(version => version.documentId === documentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const id = this.currentDocumentVersionId++;
    const now = new Date();
    const newVersion: DocumentVersion = { ...version, id, createdAt: now };
    this.documentVersions.set(id, newVersion);
    return newVersion;
  }

  // Component operations
  async getComponent(id: number): Promise<Component | undefined> {
    return this.components.get(id);
  }

  async getComponents(): Promise<Component[]> {
    return Array.from(this.components.values());
  }

  async getComponentByCode(code: string): Promise<Component | undefined> {
    return Array.from(this.components.values()).find(
      component => component.code === code
    );
  }
  
  async getComponentsByCode(code: string): Promise<Component[]> {
    return Array.from(this.components.values()).filter(
      component => component.code.includes(code)
    );
  }

  async createComponent(component: InsertComponent): Promise<Component> {
    const id = this.currentComponentId++;
    const newComponent: Component = { ...component, id };
    this.components.set(id, newComponent);
    return newComponent;
  }

  async updateComponent(id: number, component: Partial<InsertComponent>): Promise<Component | undefined> {
    const existingComponent = this.components.get(id);
    if (!existingComponent) return undefined;

    const updatedComponent = { ...existingComponent, ...component };
    this.components.set(id, updatedComponent);
    return updatedComponent;
  }

  async deleteComponent(id: number): Promise<boolean> {
    return this.components.delete(id);
  }

  async searchComponents(query: string): Promise<Component[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.components.values()).filter(comp => 
      comp.code.toLowerCase().includes(lowercaseQuery) || 
      comp.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  // BOM operations
  async getBom(id: number): Promise<Bom | undefined> {
    return this.boms.get(id);
  }

  async getBoms(): Promise<Bom[]> {
    return Array.from(this.boms.values());
  }

  async createBom(bom: InsertBom): Promise<Bom> {
    const id = this.currentBomId++;
    const newBom: Bom = { ...bom, id };
    this.boms.set(id, newBom);
    return newBom;
  }

  async updateBom(id: number, bom: Partial<InsertBom>): Promise<Bom | undefined> {
    const existingBom = this.boms.get(id);
    if (!existingBom) return undefined;

    const updatedBom = { ...existingBom, ...bom };
    this.boms.set(id, updatedBom);
    return updatedBom;
  }

  async deleteBom(id: number): Promise<boolean> {
    // Also delete all BOM items
    Array.from(this.bomItems.values())
      .filter(item => item.bomId === id)
      .forEach(item => this.bomItems.delete(item.id));
    
    return this.boms.delete(id);
  }

  // BOM item operations
  async getBomItem(id: number): Promise<BomItem | undefined> {
    return this.bomItems.get(id);
  }

  async getBomItemsByBomId(bomId: number): Promise<BomItem[]> {
    return Array.from(this.bomItems.values()).filter(item => item.bomId === bomId);
  }

  async createBomItem(item: InsertBomItem): Promise<BomItem> {
    const id = this.currentBomItemId++;
    const newItem: BomItem = { ...item, id };
    this.bomItems.set(id, newItem);
    return newItem;
  }

  async updateBomItem(id: number, item: Partial<InsertBomItem>): Promise<BomItem | undefined> {
    const existingItem = this.bomItems.get(id);
    if (!existingItem) return undefined;

    const updatedItem = { ...existingItem, ...item };
    this.bomItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteBomItem(id: number): Promise<boolean> {
    return this.bomItems.delete(id);
  }

  // Section-Component operations
  async getSectionComponent(id: number): Promise<SectionComponent | undefined> {
    return this.sectionComponents.get(id);
  }

  async getSectionComponentsBySectionId(sectionId: number): Promise<SectionComponent[]> {
    return Array.from(this.sectionComponents.values())
      .filter(sc => sc.sectionId === sectionId);
  }

  async getSectionComponentsByComponentId(componentId: number): Promise<SectionComponent[]> {
    return Array.from(this.sectionComponents.values())
      .filter(sc => sc.componentId === componentId);
  }

  async createSectionComponent(sectionComponent: InsertSectionComponent): Promise<SectionComponent> {
    const id = this.currentSectionComponentId++;
    const newSectionComponent: SectionComponent = { ...sectionComponent, id };
    this.sectionComponents.set(id, newSectionComponent);
    return newSectionComponent;
  }

  async updateSectionComponent(id: number, sectionComponent: Partial<InsertSectionComponent>): Promise<SectionComponent | undefined> {
    const existingSectionComponent = this.sectionComponents.get(id);
    if (!existingSectionComponent) return undefined;

    const updatedSectionComponent = { ...existingSectionComponent, ...sectionComponent };
    this.sectionComponents.set(id, updatedSectionComponent);
    return updatedSectionComponent;
  }

  async deleteSectionComponent(id: number): Promise<boolean> {
    return this.sectionComponents.delete(id);
  }

  async deleteSectionComponentsBySectionId(sectionId: number): Promise<boolean> {
    const sectionComponents = await this.getSectionComponentsBySectionId(sectionId);
    sectionComponents.forEach(sc => this.sectionComponents.delete(sc.id));
    return true;
  }

  // Comment operations
  async getComment(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async getCommentsByDocumentId(documentId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.documentId === documentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const now = new Date();
    const newComment: Comment = { ...comment, id, createdAt: now };
    this.comments.set(id, newComment);
    return newComment;
  }

  async deleteComment(id: number): Promise<boolean> {
    return this.comments.delete(id);
  }

  // Module library operations
  async getModules(): Promise<Section[]> {
    return Array.from(this.sections.values()).filter(section => section.isModule);
  }
  
  // Language operations
  async getLanguage(id: number): Promise<Language | undefined> {
    return this.languages.get(id);
  }

  async getLanguageByCode(code: string): Promise<Language | undefined> {
    return Array.from(this.languages.values()).find(language => language.code === code);
  }

  async getLanguages(activeOnly = false): Promise<Language[]> {
    const allLanguages = Array.from(this.languages.values());
    return activeOnly ? allLanguages.filter(lang => lang.isActive) : allLanguages;
  }

  async createLanguage(language: InsertLanguage): Promise<Language> {
    const id = this.currentLanguageId++;
    const newLanguage: Language = { ...language, id };
    
    // Ensure only one default language
    if (language.isDefault) {
      Array.from(this.languages.values()).forEach(lang => {
        if (lang.isDefault) {
          this.languages.set(lang.id, { ...lang, isDefault: false });
        }
      });
    }
    
    this.languages.set(id, newLanguage);
    return newLanguage;
  }

  async updateLanguage(id: number, language: Partial<InsertLanguage>): Promise<Language | undefined> {
    const existingLanguage = this.languages.get(id);
    if (!existingLanguage) return undefined;

    // Ensure only one default language
    if (language.isDefault) {
      Array.from(this.languages.values()).forEach(lang => {
        if (lang.id !== id && lang.isDefault) {
          this.languages.set(lang.id, { ...lang, isDefault: false });
        }
      });
    }
    
    const updatedLanguage = { ...existingLanguage, ...language };
    this.languages.set(id, updatedLanguage);
    return updatedLanguage;
  }

  async deleteLanguage(id: number): Promise<boolean> {
    // We should not allow deleting the default language
    const language = this.languages.get(id);
    if (language?.isDefault) return false;
    
    // Delete associated translations
    Array.from(this.sectionTranslations.values())
      .filter(translation => translation.languageId === id)
      .forEach(translation => this.sectionTranslations.delete(translation.id));
      
    Array.from(this.contentModuleTranslations.values())
      .filter(translation => translation.languageId === id)
      .forEach(translation => this.contentModuleTranslations.delete(translation.id));
      
    Array.from(this.translationAssignments.values())
      .filter(assignment => assignment.languageId === id)
      .forEach(assignment => this.translationAssignments.delete(assignment.id));
    
    return this.languages.delete(id);
  }

  // Translation assignment operations
  async getTranslationAssignment(id: number): Promise<TranslationAssignment | undefined> {
    return this.translationAssignments.get(id);
  }

  async getTranslationAssignmentsByUserId(userId: number): Promise<TranslationAssignment[]> {
    return Array.from(this.translationAssignments.values())
      .filter(assignment => assignment.userId === userId);
  }

  async getTranslationAssignmentsByLanguageId(languageId: number): Promise<TranslationAssignment[]> {
    return Array.from(this.translationAssignments.values())
      .filter(assignment => assignment.languageId === languageId);
  }

  async createTranslationAssignment(assignment: InsertTranslationAssignment): Promise<TranslationAssignment> {
    const id = this.currentTranslationAssignmentId++;
    const newAssignment: TranslationAssignment = { ...assignment, id };
    this.translationAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async updateTranslationAssignment(id: number, assignment: Partial<InsertTranslationAssignment>): Promise<TranslationAssignment | undefined> {
    const existingAssignment = this.translationAssignments.get(id);
    if (!existingAssignment) return undefined;

    const updatedAssignment = { ...existingAssignment, ...assignment };
    this.translationAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async deleteTranslationAssignment(id: number): Promise<boolean> {
    return this.translationAssignments.delete(id);
  }

  // Section translation operations
  async getSectionTranslation(id: number): Promise<SectionTranslation | undefined> {
    return this.sectionTranslations.get(id);
  }

  async getSectionTranslationByLanguage(sectionId: number, languageId: number): Promise<SectionTranslation | undefined> {
    return Array.from(this.sectionTranslations.values())
      .find(translation => translation.sectionId === sectionId && translation.languageId === languageId);
  }

  async getSectionTranslationsByLanguageId(languageId: number): Promise<SectionTranslation[]> {
    return Array.from(this.sectionTranslations.values())
      .filter(translation => translation.languageId === languageId);
  }

  async getSectionTranslationsBySectionId(sectionId: number): Promise<SectionTranslation[]> {
    return Array.from(this.sectionTranslations.values())
      .filter(translation => translation.sectionId === sectionId);
  }

  async createSectionTranslation(translation: InsertSectionTranslation): Promise<SectionTranslation> {
    const id = this.currentSectionTranslationId++;
    const now = new Date();
    const newTranslation: SectionTranslation = { 
      ...translation, 
      id, 
      updatedAt: now 
    };
    this.sectionTranslations.set(id, newTranslation);
    return newTranslation;
  }

  async updateSectionTranslation(id: number, translation: Partial<InsertSectionTranslation>): Promise<SectionTranslation | undefined> {
    const existingTranslation = this.sectionTranslations.get(id);
    if (!existingTranslation) return undefined;

    const updatedTranslation = { 
      ...existingTranslation, 
      ...translation,
      updatedAt: new Date()
    };
    this.sectionTranslations.set(id, updatedTranslation);
    return updatedTranslation;
  }

  async deleteSectionTranslation(id: number): Promise<boolean> {
    return this.sectionTranslations.delete(id);
  }

  // Content module translation operations
  async getContentModuleTranslation(id: number): Promise<ContentModuleTranslation | undefined> {
    return this.contentModuleTranslations.get(id);
  }

  async getContentModuleTranslationByLanguage(moduleId: number, languageId: number): Promise<ContentModuleTranslation | undefined> {
    return Array.from(this.contentModuleTranslations.values())
      .find(translation => translation.moduleId === moduleId && translation.languageId === languageId);
  }

  async getContentModuleTranslationsByLanguageId(languageId: number): Promise<ContentModuleTranslation[]> {
    return Array.from(this.contentModuleTranslations.values())
      .filter(translation => translation.languageId === languageId);
  }

  async getContentModuleTranslationsByModuleId(moduleId: number): Promise<ContentModuleTranslation[]> {
    return Array.from(this.contentModuleTranslations.values())
      .filter(translation => translation.moduleId === moduleId);
  }

  async createContentModuleTranslation(translation: InsertContentModuleTranslation): Promise<ContentModuleTranslation> {
    const id = this.currentContentModuleTranslationId++;
    const now = new Date();
    const newTranslation: ContentModuleTranslation = { 
      ...translation, 
      id, 
      updatedAt: now 
    };
    this.contentModuleTranslations.set(id, newTranslation);
    return newTranslation;
  }

  async updateContentModuleTranslation(id: number, translation: Partial<InsertContentModuleTranslation>): Promise<ContentModuleTranslation | undefined> {
    const existingTranslation = this.contentModuleTranslations.get(id);
    if (!existingTranslation) return undefined;

    const updatedTranslation = { 
      ...existingTranslation, 
      ...translation,
      updatedAt: new Date()
    };
    this.contentModuleTranslations.set(id, updatedTranslation);
    return updatedTranslation;
  }

  async deleteContentModuleTranslation(id: number): Promise<boolean> {
    return this.contentModuleTranslations.delete(id);
  }

  // Translation import operations
  async getTranslationImport(id: number): Promise<TranslationImport | undefined> {
    return this.translationImports.get(id);
  }

  async getTranslationImports(): Promise<TranslationImport[]> {
    return Array.from(this.translationImports.values())
      .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
  }

  async createTranslationImport(importData: InsertTranslationImport): Promise<TranslationImport> {
    const id = this.currentTranslationImportId++;
    const now = new Date();
    const newImport: TranslationImport = { 
      ...importData, 
      id, 
      importedAt: now 
    };
    this.translationImports.set(id, newImport);
    return newImport;
  }

  async processTranslationImport(importId: number, data: any): Promise<boolean> {
    // This would handle parsing the import data and creating translations
    // For simplicity in this in-memory implementation, we'll assume the data
    // is already in the format we need
    try {
      const importRecord = await this.getTranslationImport(importId);
      if (!importRecord) return false;
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process section translations
      if (data.sections) {
        for (const section of data.sections) {
          try {
            const existingTranslation = await this.getSectionTranslationByLanguage(
              section.sectionId, 
              importRecord.languageId
            );
            
            if (existingTranslation) {
              await this.updateSectionTranslation(existingTranslation.id, {
                title: section.title,
                description: section.description,
                status: 'in_review',
                translatedById: importRecord.importedById
              });
            } else {
              await this.createSectionTranslation({
                sectionId: section.sectionId,
                languageId: importRecord.languageId,
                title: section.title,
                description: section.description,
                status: 'in_review',
                translatedById: importRecord.importedById,
                reviewedById: null
              });
            }
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      }
      
      // Process content module translations
      if (data.modules) {
        for (const module of data.modules) {
          try {
            const existingTranslation = await this.getContentModuleTranslationByLanguage(
              module.moduleId, 
              importRecord.languageId
            );
            
            if (existingTranslation) {
              await this.updateContentModuleTranslation(existingTranslation.id, {
                content: module.content,
                status: 'in_review',
                translatedById: importRecord.importedById
              });
            } else {
              await this.createContentModuleTranslation({
                moduleId: module.moduleId,
                languageId: importRecord.languageId,
                content: module.content,
                status: 'in_review',
                translatedById: importRecord.importedById,
                reviewedById: null
              });
            }
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      }
      
      // Update import record with status
      await this.updateTranslationImport(importId, {
        status: errorCount > 0 ? (successCount > 0 ? 'partial' : 'error') : 'success',
        details: {
          totalItems: (data.sections?.length || 0) + (data.modules?.length || 0),
          successCount,
          errorCount,
          completedAt: new Date()
        }
      });
      
      return successCount > 0;
    } catch (error) {
      return false;
    }
  }
  
  // Helper method for updating translation imports
  private async updateTranslationImport(id: number, data: Partial<InsertTranslationImport>): Promise<TranslationImport | undefined> {
    const existingImport = this.translationImports.get(id);
    if (!existingImport) return undefined;
    
    const updatedImport = { ...existingImport, ...data };
    this.translationImports.set(id, updatedImport);
    return updatedImport;
  }

  // Translation AI operations
  async getTranslationAIRequest(id: number): Promise<TranslationAIRequest | undefined> {
    return this.translationAIRequests.get(id);
  }

  async getTranslationAIRequests(): Promise<TranslationAIRequest[]> {
    return Array.from(this.translationAIRequests.values())
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  async createTranslationAIRequest(request: InsertTranslationAIRequest): Promise<TranslationAIRequest> {
    const id = this.currentTranslationAIRequestId++;
    const now = new Date();
    const newRequest: TranslationAIRequest = { 
      ...request, 
      id, 
      requestedAt: now 
    };
    this.translationAIRequests.set(id, newRequest);
    return newRequest;
  }

  async updateTranslationAIRequest(id: number, request: Partial<InsertTranslationAIRequest>): Promise<TranslationAIRequest | undefined> {
    const existingRequest = this.translationAIRequests.get(id);
    if (!existingRequest) return undefined;
    
    const updatedRequest = { ...existingRequest, ...request };
    this.translationAIRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  // Document translations - utility methods
  async getDocumentTranslationStatus(documentId: number, languageId: number): Promise<{
    totalSections: number;
    totalModules: number;
    translatedSections: number;
    translatedModules: number;
    reviewedSections: number;
    reviewedModules: number;
  }> {
    // Get all sections for the document
    const sections = await this.getSectionsByDocumentId(documentId);
    
    // Count total modules
    let totalModules = 0;
    for (const section of sections) {
      const modules = await this.getContentModulesBySectionId(section.id);
      totalModules += modules.length;
    }
    
    // Get all section translations for this language
    const sectionTranslations = Array.from(this.sectionTranslations.values())
      .filter(t => 
        t.languageId === languageId && 
        sections.some(s => s.id === t.sectionId)
      );
    
    // Count translated and reviewed sections
    const translatedSections = sectionTranslations.filter(t => 
      t.status === 'ai_suggested' || t.status === 'in_review' || t.status === 'approved'
    ).length;
    
    const reviewedSections = sectionTranslations.filter(t => 
      t.status === 'approved'
    ).length;
    
    // Get all module translations for this language
    let translatedModules = 0;
    let reviewedModules = 0;
    
    for (const section of sections) {
      const modules = await this.getContentModulesBySectionId(section.id);
      
      for (const module of modules) {
        const translation = await this.getContentModuleTranslationByLanguage(module.id, languageId);
        
        if (translation) {
          if (translation.status === 'ai_suggested' || translation.status === 'in_review' || translation.status === 'approved') {
            translatedModules++;
          }
          
          if (translation.status === 'approved') {
            reviewedModules++;
          }
        }
      }
    }
    
    return {
      totalSections: sections.length,
      totalModules,
      translatedSections,
      translatedModules,
      reviewedSections,
      reviewedModules
    };
  }
}

export class DatabaseStorage implements IStorage {
  // File upload operations
  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    const [file] = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id));
    return file;
  }

  async getUploadedFiles(limit?: number, userId?: number): Promise<UploadedFile[]> {
    let query = db
      .select()
      .from(uploadedFiles)
      .orderBy(desc(uploadedFiles.uploadedAt));
    
    // Filtra per utente se specificato
    if (userId !== undefined) {
      query = query.where(eq(uploadedFiles.uploadedById, userId));
    }
    
    // Limita i risultati se specificato
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const [newFile] = await db.insert(uploadedFiles).values(file).returning();
    return newFile;
  }

  async deleteUploadedFile(id: number): Promise<boolean> {
    const result = await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
    return result.rowCount > 0;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return !!result;
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getDocuments(): Promise<Document[]> {
    return db.select().from(documents);
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values({
        ...document,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newDocument;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(documents)
      .set({
        ...document,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return !!result;
  }

  async searchDocuments(query: string): Promise<Document[]> {
    const searchQuery = `%${query}%`;
    return db
      .select()
      .from(documents)
      .where(
        or(
          like(documents.title, searchQuery),
          like(documents.description as any, searchQuery)
        )
      );
  }

  // Section operations
  async getSection(id: number): Promise<Section | undefined> {
    const [section] = await db.select().from(sections).where(eq(sections.id, id));
    return section;
  }

  async getSectionsByDocumentId(documentId: number): Promise<Section[]> {
    return db
      .select()
      .from(sections)
      .where(eq(sections.documentId, documentId))
      .orderBy(sections.order);
  }

  async createSection(section: InsertSection): Promise<Section> {
    const [newSection] = await db.insert(sections).values(section).returning();
    return newSection;
  }

  async updateSection(id: number, section: Partial<InsertSection>): Promise<Section | undefined> {
    const [updatedSection] = await db
      .update(sections)
      .set(section)
      .where(eq(sections.id, id))
      .returning();
    return updatedSection;
  }

  async deleteSection(id: number): Promise<boolean> {
    const result = await db.delete(sections).where(eq(sections.id, id));
    return !!result;
  }

  async reorderSections(documentId: number, sectionIds: number[]): Promise<boolean> {
    try {
      for (let i = 0; i < sectionIds.length; i++) {
        await db
          .update(sections)
          .set({ order: i })
          .where(and(
            eq(sections.id, sectionIds[i]),
            eq(sections.documentId, documentId)
          ));
      }
      return true;
    } catch (error) {
      console.error("Error reordering sections:", error);
      return false;
    }
  }

  // Content module operations
  async getContentModule(id: number): Promise<ContentModule | undefined> {
    const [module] = await db
      .select()
      .from(contentModules)
      .where(eq(contentModules.id, id));
    return module;
  }

  async getContentModulesBySectionId(sectionId: number): Promise<ContentModule[]> {
    return db
      .select()
      .from(contentModules)
      .where(eq(contentModules.sectionId, sectionId))
      .orderBy(contentModules.order);
  }

  async createContentModule(module: InsertContentModule): Promise<ContentModule> {
    const [newModule] = await db
      .insert(contentModules)
      .values(module)
      .returning();
    return newModule;
  }

  async updateContentModule(id: number, module: Partial<InsertContentModule>): Promise<ContentModule | undefined> {
    const [updatedModule] = await db
      .update(contentModules)
      .set(module)
      .where(eq(contentModules.id, id))
      .returning();
    return updatedModule;
  }

  async deleteContentModule(id: number): Promise<boolean> {
    const result = await db.delete(contentModules).where(eq(contentModules.id, id));
    return !!result;
  }

  async reorderContentModules(sectionId: number, moduleIds: number[]): Promise<boolean> {
    try {
      for (let i = 0; i < moduleIds.length; i++) {
        await db
          .update(contentModules)
          .set({ order: i })
          .where(and(
            eq(contentModules.id, moduleIds[i]),
            eq(contentModules.sectionId, sectionId)
          ));
      }
      return true;
    } catch (error) {
      console.error("Error reordering modules:", error);
      return false;
    }
  }

  // Document version operations
  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    const [version] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.id, id));
    return version;
  }

  async getDocumentVersionsByDocumentId(documentId: number): Promise<DocumentVersion[]> {
    return db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.createdAt));
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [newVersion] = await db
      .insert(documentVersions)
      .values({
        ...version,
        createdAt: new Date()
      })
      .returning();
    return newVersion;
  }

  // Component (BOM) operations
  async getComponent(id: number): Promise<Component | undefined> {
    const [component] = await db
      .select()
      .from(components)
      .where(eq(components.id, id));
    return component;
  }

  async getComponents(): Promise<Component[]> {
    return db.select().from(components);
  }

  async getComponentByCode(code: string): Promise<Component | undefined> {
    const [component] = await db
      .select()
      .from(components)
      .where(eq(components.code, code));
    return component;
  }
  
  async getComponentsByCode(code: string): Promise<Component[]> {
    return await db
      .select()
      .from(components)
      .where(like(components.code, `%${code}%`));
  }

  async createComponent(component: InsertComponent): Promise<Component> {
    const [newComponent] = await db
      .insert(components)
      .values(component)
      .returning();
    return newComponent;
  }

  async updateComponent(id: number, component: Partial<InsertComponent>): Promise<Component | undefined> {
    const [updatedComponent] = await db
      .update(components)
      .set(component)
      .where(eq(components.id, id))
      .returning();
    return updatedComponent;
  }

  async deleteComponent(id: number): Promise<boolean> {
    const result = await db.delete(components).where(eq(components.id, id));
    return !!result;
  }

  async searchComponents(query: string): Promise<Component[]> {
    const searchQuery = `%${query}%`;
    return db
      .select()
      .from(components)
      .where(
        or(
          like(components.code, searchQuery),
          like(components.description, searchQuery)
        )
      );
  }

  // BOM operations
  async getBom(id: number): Promise<Bom | undefined> {
    const [bom] = await db.select().from(boms).where(eq(boms.id, id));
    return bom;
  }

  async getBoms(): Promise<Bom[]> {
    return db.select().from(boms);
  }

  async createBom(bom: InsertBom): Promise<Bom> {
    const [newBom] = await db.insert(boms).values(bom).returning();
    return newBom;
  }

  async updateBom(id: number, bom: Partial<InsertBom>): Promise<Bom | undefined> {
    const [updatedBom] = await db
      .update(boms)
      .set(bom)
      .where(eq(boms.id, id))
      .returning();
    return updatedBom;
  }

  async deleteBom(id: number): Promise<boolean> {
    const result = await db.delete(boms).where(eq(boms.id, id));
    return !!result;
  }

  // BOM item operations
  async getBomItem(id: number): Promise<BomItem | undefined> {
    const [item] = await db.select().from(bomItems).where(eq(bomItems.id, id));
    return item;
  }

  async getBomItemsByBomId(bomId: number): Promise<BomItem[]> {
    return db.select().from(bomItems).where(eq(bomItems.bomId, bomId));
  }

  async createBomItem(item: InsertBomItem): Promise<BomItem> {
    const [newItem] = await db.insert(bomItems).values(item).returning();
    return newItem;
  }

  async updateBomItem(id: number, item: Partial<InsertBomItem>): Promise<BomItem | undefined> {
    const [updatedItem] = await db
      .update(bomItems)
      .set(item)
      .where(eq(bomItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteBomItem(id: number): Promise<boolean> {
    const result = await db.delete(bomItems).where(eq(bomItems.id, id));
    return !!result;
  }
  
  async deleteBomItems(bomId: number): Promise<boolean> {
    // Elimina tutti gli elementi BOM di una specifica BOM
    await db.delete(bomItems).where(eq(bomItems.bomId, bomId));
    return true;
  }
  


  // Comment operations
  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }

  async getCommentsByDocumentId(documentId: number): Promise<Comment[]> {
    return db
      .select()
      .from(comments)
      .where(eq(comments.documentId, documentId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values({
        ...comment,
        createdAt: new Date()
      })
      .returning();
    return newComment;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return !!result;
  }

  // Section Component operations
  async getSectionComponent(id: number): Promise<SectionComponent | undefined> {
    const [sectionComponent] = await db
      .select()
      .from(sectionComponents)
      .where(eq(sectionComponents.id, id));
    return sectionComponent;
  }

  async getSectionComponentsBySectionId(sectionId: number): Promise<SectionComponent[]> {
    try {
      // Ottenere i componenti della sezione
      const sectionComponentsList = await db
        .select()
        .from(sectionComponents)
        .where(eq(sectionComponents.sectionId, sectionId));
      
      // Raccogliere gli ID dei componenti
      const componentIds = sectionComponentsList.map(sc => sc.componentId);
      
      if (componentIds.length === 0) {
        return sectionComponentsList;
      }
      
      // Ottenere i dettagli dei componenti
      const componentsData = await db
        .select()
        .from(components)
        .where(inArray(components.id, componentIds));
      
      // Mappare i componenti ai section components
      const result = sectionComponentsList.map(sc => {
        const componentData = componentsData.find(c => c.id === sc.componentId);
        return {
          ...sc,
          component: componentData
        };
      });
      
      return result;
    } catch (error) {
      console.error("Errore nel recupero dei componenti della sezione:", error);
      throw error;
    }
  }

  async getSectionComponentsByComponentId(componentId: number): Promise<SectionComponent[]> {
    return db
      .select()
      .from(sectionComponents)
      .where(eq(sectionComponents.componentId, componentId));
  }

  async createSectionComponent(sectionComponent: InsertSectionComponent): Promise<SectionComponent> {
    const [newSectionComponent] = await db
      .insert(sectionComponents)
      .values({
        ...sectionComponent,
        quantity: sectionComponent.quantity || 1, // Default to 1 if not specified
        notes: sectionComponent.notes || null
      })
      .returning();
    return newSectionComponent;
  }

  async updateSectionComponent(id: number, sectionComponent: Partial<InsertSectionComponent>): Promise<SectionComponent | undefined> {
    const [updatedSectionComponent] = await db
      .update(sectionComponents)
      .set(sectionComponent)
      .where(eq(sectionComponents.id, id))
      .returning();
    return updatedSectionComponent;
  }

  async deleteSectionComponent(id: number): Promise<boolean> {
    const result = await db.delete(sectionComponents).where(eq(sectionComponents.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteSectionComponentsBySectionId(sectionId: number): Promise<boolean> {
    const result = await db.delete(sectionComponents).where(eq(sectionComponents.sectionId, sectionId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Module library operations
  async getModules(): Promise<Section[]> {
    return db
      .select()
      .from(sections)
      .where(eq(sections.isModule, true));
  }

  // Language operations
  async getLanguage(id: number): Promise<Language | undefined> {
    const [language] = await db.select().from(languages).where(eq(languages.id, id));
    return language;
  }

  async getLanguageByCode(code: string): Promise<Language | undefined> {
    const [language] = await db.select().from(languages).where(eq(languages.code, code));
    return language;
  }

  async getLanguages(activeOnly: boolean = false): Promise<Language[]> {
    let query = db.select().from(languages);
    if (activeOnly) {
      query = query.where(eq(languages.isActive, true));
    }
    return query;
  }

  async createLanguage(language: InsertLanguage): Promise<Language> {
    // If this is set as the default language, unset any existing defaults
    if (language.isDefault) {
      await db
        .update(languages)
        .set({ isDefault: false })
        .where(eq(languages.isDefault, true));
    }
    
    const [newLanguage] = await db.insert(languages).values(language).returning();
    return newLanguage;
  }

  async updateLanguage(id: number, language: Partial<InsertLanguage>): Promise<Language | undefined> {
    // If this is being set as the default language, unset any existing defaults
    if (language.isDefault) {
      await db
        .update(languages)
        .set({ isDefault: false })
        .where(and(
          eq(languages.isDefault, true),
          language.isDefault ? language.isDefault : false
        ));
    }
    
    const [updatedLanguage] = await db
      .update(languages)
      .set(language)
      .where(eq(languages.id, id))
      .returning();
    return updatedLanguage;
  }

  async deleteLanguage(id: number): Promise<boolean> {
    // Check if it's the default language
    const [language] = await db
      .select()
      .from(languages)
      .where(eq(languages.id, id));
    
    if (language?.isDefault) {
      return false; // Cannot delete the default language
    }
    
    // Check for translations in this language
    const [sectionCount] = await db
      .select({ count: count() })
      .from(sectionTranslations)
      .where(eq(sectionTranslations.languageId, id));
    
    if (sectionCount && sectionCount.count > 0) {
      return false; // Language has translations, cannot delete
    }
    
    const result = await db.delete(languages).where(eq(languages.id, id));
    return !!result;
  }

  // Translation assignment operations
  async getTranslationAssignment(id: number): Promise<TranslationAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(translationAssignments)
      .where(eq(translationAssignments.id, id));
    return assignment;
  }

  async getTranslationAssignmentsByUserId(userId: number): Promise<TranslationAssignment[]> {
    return db
      .select()
      .from(translationAssignments)
      .where(eq(translationAssignments.userId, userId));
  }

  async getTranslationAssignmentsByLanguageId(languageId: number): Promise<TranslationAssignment[]> {
    return db
      .select()
      .from(translationAssignments)
      .where(eq(translationAssignments.languageId, languageId));
  }

  async createTranslationAssignment(assignment: InsertTranslationAssignment): Promise<TranslationAssignment> {
    const [newAssignment] = await db
      .insert(translationAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async updateTranslationAssignment(id: number, assignment: Partial<InsertTranslationAssignment>): Promise<TranslationAssignment | undefined> {
    const [updatedAssignment] = await db
      .update(translationAssignments)
      .set(assignment)
      .where(eq(translationAssignments.id, id))
      .returning();
    return updatedAssignment;
  }

  async deleteTranslationAssignment(id: number): Promise<boolean> {
    const result = await db
      .delete(translationAssignments)
      .where(eq(translationAssignments.id, id));
    return !!result;
  }

  // Section translation operations
  async getSectionTranslation(id: number): Promise<SectionTranslation | undefined> {
    const [translation] = await db
      .select()
      .from(sectionTranslations)
      .where(eq(sectionTranslations.id, id));
    return translation;
  }

  async getSectionTranslationByLanguage(sectionId: number, languageId: number): Promise<SectionTranslation | undefined> {
    const [translation] = await db
      .select()
      .from(sectionTranslations)
      .where(and(
        eq(sectionTranslations.sectionId, sectionId),
        eq(sectionTranslations.languageId, languageId)
      ));
    return translation;
  }

  async getSectionTranslationsByLanguageId(languageId: number): Promise<SectionTranslation[]> {
    return db
      .select()
      .from(sectionTranslations)
      .where(eq(sectionTranslations.languageId, languageId));
  }

  async getSectionTranslationsBySectionId(sectionId: number): Promise<SectionTranslation[]> {
    return db
      .select()
      .from(sectionTranslations)
      .where(eq(sectionTranslations.sectionId, sectionId));
  }

  async createSectionTranslation(translation: InsertSectionTranslation): Promise<SectionTranslation> {
    const [newTranslation] = await db
      .insert(sectionTranslations)
      .values({
        ...translation,
        updatedAt: new Date()
      })
      .returning();
    return newTranslation;
  }

  async updateSectionTranslation(id: number, translation: Partial<InsertSectionTranslation>): Promise<SectionTranslation | undefined> {
    const [updatedTranslation] = await db
      .update(sectionTranslations)
      .set({
        ...translation,
        updatedAt: new Date()
      })
      .where(eq(sectionTranslations.id, id))
      .returning();
    return updatedTranslation;
  }

  async deleteSectionTranslation(id: number): Promise<boolean> {
    const result = await db
      .delete(sectionTranslations)
      .where(eq(sectionTranslations.id, id));
    return !!result;
  }

  // Content module translation operations
  async getContentModuleTranslation(id: number): Promise<ContentModuleTranslation | undefined> {
    const [translation] = await db
      .select()
      .from(contentModuleTranslations)
      .where(eq(contentModuleTranslations.id, id));
    return translation;
  }

  async getContentModuleTranslationByLanguage(moduleId: number, languageId: number): Promise<ContentModuleTranslation | undefined> {
    const [translation] = await db
      .select()
      .from(contentModuleTranslations)
      .where(and(
        eq(contentModuleTranslations.moduleId, moduleId),
        eq(contentModuleTranslations.languageId, languageId)
      ));
    return translation;
  }

  async getContentModuleTranslationsByLanguageId(languageId: number): Promise<ContentModuleTranslation[]> {
    return db
      .select()
      .from(contentModuleTranslations)
      .where(eq(contentModuleTranslations.languageId, languageId));
  }

  async getContentModuleTranslationsByModuleId(moduleId: number): Promise<ContentModuleTranslation[]> {
    return db
      .select()
      .from(contentModuleTranslations)
      .where(eq(contentModuleTranslations.moduleId, moduleId));
  }

  async createContentModuleTranslation(translation: InsertContentModuleTranslation): Promise<ContentModuleTranslation> {
    const [newTranslation] = await db
      .insert(contentModuleTranslations)
      .values({
        ...translation,
        updatedAt: new Date()
      })
      .returning();
    return newTranslation;
  }

  async updateContentModuleTranslation(id: number, translation: Partial<InsertContentModuleTranslation>): Promise<ContentModuleTranslation | undefined> {
    const [updatedTranslation] = await db
      .update(contentModuleTranslations)
      .set({
        ...translation,
        updatedAt: new Date()
      })
      .where(eq(contentModuleTranslations.id, id))
      .returning();
    return updatedTranslation;
  }

  async deleteContentModuleTranslation(id: number): Promise<boolean> {
    const result = await db
      .delete(contentModuleTranslations)
      .where(eq(contentModuleTranslations.id, id));
    return !!result;
  }

  // Translation import operations
  async getTranslationImport(id: number): Promise<TranslationImport | undefined> {
    const [importRecord] = await db
      .select()
      .from(translationImports)
      .where(eq(translationImports.id, id));
    return importRecord;
  }

  async getTranslationImports(): Promise<TranslationImport[]> {
    return db
      .select()
      .from(translationImports)
      .orderBy(desc(translationImports.importedAt));
  }

  async createTranslationImport(importData: InsertTranslationImport): Promise<TranslationImport> {
    const [newImport] = await db
      .insert(translationImports)
      .values({
        ...importData,
        importedAt: new Date()
      })
      .returning();
    return newImport;
  }

  async processTranslationImport(importId: number, data: any): Promise<boolean> {
    try {
      // TODO: Implement proper import processing logic
      // For now, just update the import status to complete
      await db
        .update(translationImports)
        .set({
          status: "success",
          details: { processed: new Date(), stats: { sections: 0, modules: 0 } }
        })
        .where(eq(translationImports.id, importId));
      
      return true;
    } catch (error) {
      console.error("Error processing translation import:", error);
      
      await db
        .update(translationImports)
        .set({
          status: "error",
          details: { error: "Failed to process import" }
        })
        .where(eq(translationImports.id, importId));
      
      return false;
    }
  }

  // Translation AI operations
  async getTranslationAIRequest(id: number): Promise<TranslationAIRequest | undefined> {
    const [request] = await db
      .select()
      .from(translationAIRequests)
      .where(eq(translationAIRequests.id, id));
    return request;
  }

  async getTranslationAIRequests(): Promise<TranslationAIRequest[]> {
    return db
      .select()
      .from(translationAIRequests)
      .orderBy(desc(translationAIRequests.requestedAt));
  }

  async createTranslationAIRequest(request: InsertTranslationAIRequest): Promise<TranslationAIRequest> {
    const [newRequest] = await db
      .insert(translationAIRequests)
      .values({
        ...request,
        requestedAt: new Date()
      })
      .returning();
    return newRequest;
  }

  async updateTranslationAIRequest(id: number, request: Partial<InsertTranslationAIRequest>): Promise<TranslationAIRequest | undefined> {
    const [updatedRequest] = await db
      .update(translationAIRequests)
      .set(request)
      .where(eq(translationAIRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Document translations - utility methods
  async getDocumentTranslationStatus(documentId: number, languageId: number): Promise<{
    totalSections: number;
    totalModules: number;
    translatedSections: number;
    translatedModules: number;
    reviewedSections: number;
    reviewedModules: number;
  }> {
    // Get all sections for the document
    const docSections = await this.getSectionsByDocumentId(documentId);
    const totalSections = docSections.length;
    
    // Get modules for each section
    let totalModules = 0;
    const sectionIds = docSections.map(section => section.id);
    
    for (const sectionId of sectionIds) {
      const modules = await this.getContentModulesBySectionId(sectionId);
      totalModules += modules.length;
    }
    
    // Get translated sections
    const sectionTranslations = await Promise.all(
      sectionIds.map(sectionId => this.getSectionTranslationByLanguage(sectionId, languageId))
    );
    
    const translatedSections = sectionTranslations.filter(t => t !== undefined).length;
    const reviewedSections = sectionTranslations.filter(t => t !== undefined && t.status === "approved").length;
    
    // Get translated modules (this is more complex and might be slow for large documents)
    let translatedModules = 0;
    let reviewedModules = 0;
    
    for (const sectionId of sectionIds) {
      const modules = await this.getContentModulesBySectionId(sectionId);
      for (const module of modules) {
        const translation = await this.getContentModuleTranslationByLanguage(module.id, languageId);
        if (translation) {
          translatedModules++;
          if (translation.status === "approved") {
            reviewedModules++;
          }
        }
      }
    }
    
    return {
      totalSections,
      totalModules,
      translatedSections,
      translatedModules,
      reviewedSections,
      reviewedModules
    };
  }

  // Seed initial data method - can be called after tables are created
  async seedInitialData(): Promise<void> {
    // Check if users table is empty
    const users = await this.getUsers();
    if (users.length === 0) {
      // Add an initial admin user
      await this.createUser({
        username: "admin",
        password: "admin123",
        role: "admin",
        name: "Administrator",
        email: "admin@example.com"
      });
    }

    // Check if languages table is empty
    const langs = await this.getLanguages();
    if (langs.length === 0) {
      // Add default languages
      const languages = [
        { name: "Italiano", code: "it", isActive: true, isDefault: true },
        { name: "English", code: "en", isActive: true, isDefault: false },
        { name: "Français", code: "fr", isActive: true, isDefault: false },
        { name: "Deutsch", code: "de", isActive: true, isDefault: false },
        { name: "Español", code: "es", isActive: true, isDefault: false }
      ];
      
      for (const lang of languages) {
        await this.createLanguage(lang);
      }
    }

    // Check if components table is empty
    const comps = await this.getComponents();
    if (comps.length === 0) {
      // Add sample components
      const components = [
        { code: "RC100-BASE", description: "Base pannello in alluminio" },
        { code: "RC100-PCB", description: "Scheda elettronica principale" },
        { code: "RC100-SW", description: "Set interruttori" },
        { code: "RC100-CON", description: "Connettori esterni" },
        { code: "RC100-CVR", description: "Copertura in plexiglass" },
        { code: "RC100-EX-PCB", description: "Scheda elettronica principale estesa" },
        { code: "RC100-EX-CON", description: "Set connettori esterni" },
        { code: "RC100-EX-SW", description: "Set interruttori avanzati" },
        { code: "RC100-EX-DSP", description: "Display LCD touchscreen" },
        { code: "RC100-EX-WIFI", description: "Modulo Wi-Fi" }
      ];

      for (const comp of components) {
        await this.createComponent({
          code: comp.code,
          description: comp.description,
          details: {}
        });
      }
    }

    // Check if BOMs table is empty
    const bomsList = await this.getBoms();
    if (bomsList.length === 0) {
      // Add sample BOMs
      const bomId1 = (await this.createBom({
        title: "RC100 - Pannello Controllo Standard",
        description: "Distinta base per il pannello di controllo standard RC100"
      })).id;

      const bomId2 = (await this.createBom({
        title: "RC100-EX - Pannello Controllo Esteso",
        description: "Distinta base per il pannello di controllo esteso RC100-EX"
      })).id;

      // Add items to BOM 1
      const components1 = ["RC100-BASE", "RC100-PCB", "RC100-SW", "RC100-CON", "RC100-CVR"];
      for (const code of components1) {
        const component = await this.getComponentByCode(code);
        if (component) {
          await this.createBomItem({
            bomId: bomId1,
            componentId: component.id,
            quantity: code === "RC100-SW" ? 3 : code === "RC100-CON" ? 4 : 1
          });
        }
      }

      // Add items to BOM 2
      const components2 = ["RC100-BASE", "RC100-EX-PCB", "RC100-EX-SW", "RC100-EX-CON", "RC100-CVR", "RC100-EX-DSP", "RC100-EX-WIFI"];
      for (const code of components2) {
        const component = await this.getComponentByCode(code);
        if (component) {
          await this.createBomItem({
            bomId: bomId2,
            componentId: component.id,
            quantity: code === "RC100-EX-SW" ? 5 : code === "RC100-EX-CON" ? 6 : 1
          });
        }
      }
    }
  }
  
  // File upload operations
  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    return this.uploadedFiles.get(id);
  }

  async getUploadedFiles(limit?: number, userId?: number): Promise<UploadedFile[]> {
    let files = Array.from(this.uploadedFiles.values());
    
    // Filtra per utente se specificato
    if (userId !== undefined) {
      files = files.filter(file => file.uploadedById === userId);
    }
    
    // Ordina per data di caricamento (decrescente)
    files = files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    
    // Limita i risultati se specificato
    if (limit !== undefined) {
      files = files.slice(0, limit);
    }
    
    return files;
  }

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const id = this.currentUploadedFileId++;
    const newFile: UploadedFile = { ...file, id };
    this.uploadedFiles.set(id, newFile);
    return newFile;
  }

  async deleteUploadedFile(id: number): Promise<boolean> {
    return this.uploadedFiles.delete(id);
  }
}

// Export a singleton instance of the storage
export const storage = new DatabaseStorage();
