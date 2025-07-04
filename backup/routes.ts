import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { upload, saveFileInfo, getFileUrl } from "./upload";
import path from "path";
import fs from "fs";
import {
  insertUserSchema,
  insertDocumentSchema,
  insertSectionSchema,
  insertContentModuleSchema,
  insertDocumentVersionSchema,
  insertComponentSchema,
  insertBomSchema,
  insertBomItemSchema,
  insertSectionComponentSchema,
  insertCommentSchema,
  insertLanguageSchema,
  insertTranslationAssignmentSchema,
  insertSectionTranslationSchema,
  insertContentModuleTranslationSchema,
  insertTranslationImportSchema,
  insertTranslationAIRequestSchema
} from "@shared/schema";

// Helper function to validate request body against a schema
function validateBody(schema: any, data: any) {
  try {
    return { data: schema.parse(data), error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return { data: null, error: fromZodError(error).message };
    }
    return { data: null, error: "Invalid request data" };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertUserSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(data);
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.id);
      // Allow partial updates
      const { data, error } = validateBody(insertUserSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const user = await storage.updateUser(userId, data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.id);
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Document routes
  app.get("/api/documents", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string | undefined;
      let documents;
      
      if (query) {
        documents = await storage.searchDocuments(query);
      } else {
        documents = await storage.getDocuments();
      }
      
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const document = await storage.getDocument(Number(req.params.id));
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertDocumentSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const document = await storage.createDocument(data);
      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.put("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      const { data, error } = validateBody(insertDocumentSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const document = await storage.updateDocument(documentId, data);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      const success = await storage.deleteDocument(documentId);
      if (!success) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Section routes
  app.get("/api/documents/:documentId/sections", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.documentId);
      const sections = await storage.getSectionsByDocumentId(documentId);
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sections" });
    }
  });

  app.get("/api/sections/:id", async (req: Request, res: Response) => {
    try {
      const section = await storage.getSection(Number(req.params.id));
      if (!section) {
        return res.status(404).json({ message: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch section" });
    }
  });

  app.post("/api/sections", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertSectionSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const section = await storage.createSection(data);
      res.status(201).json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to create section" });
    }
  });

  app.put("/api/sections/:id", async (req: Request, res: Response) => {
    try {
      const sectionId = Number(req.params.id);
      const { data, error } = validateBody(insertSectionSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const section = await storage.updateSection(sectionId, data);
      if (!section) {
        return res.status(404).json({ message: "Section not found" });
      }
      
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to update section" });
    }
  });

  app.delete("/api/sections/:id", async (req: Request, res: Response) => {
    try {
      const sectionId = Number(req.params.id);
      const success = await storage.deleteSection(sectionId);
      if (!success) {
        return res.status(404).json({ message: "Section not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete section" });
    }
  });

  app.post("/api/documents/:documentId/reorder-sections", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.documentId);
      const { sectionIds } = req.body;
      
      if (!Array.isArray(sectionIds)) {
        return res.status(400).json({ message: "sectionIds must be an array" });
      }
      
      const success = await storage.reorderSections(documentId, sectionIds);
      if (!success) {
        return res.status(400).json({ message: "Failed to reorder sections" });
      }
      
      res.status(200).json({ message: "Sections reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder sections" });
    }
  });

  // Content module routes
  app.get("/api/sections/:sectionId/modules", async (req: Request, res: Response) => {
    try {
      const sectionId = Number(req.params.sectionId);
      const modules = await storage.getContentModulesBySectionId(sectionId);
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content modules" });
    }
  });

  app.get("/api/modules/:id", async (req: Request, res: Response) => {
    try {
      const module = await storage.getContentModule(Number(req.params.id));
      if (!module) {
        return res.status(404).json({ message: "Content module not found" });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content module" });
    }
  });

  app.post("/api/modules", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertContentModuleSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const module = await storage.createContentModule(data);
      res.status(201).json(module);
    } catch (error) {
      res.status(500).json({ message: "Failed to create content module" });
    }
  });

  app.put("/api/modules/:id", async (req: Request, res: Response) => {
    try {
      const moduleId = Number(req.params.id);
      const { data, error } = validateBody(insertContentModuleSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const module = await storage.updateContentModule(moduleId, data);
      if (!module) {
        return res.status(404).json({ message: "Content module not found" });
      }
      
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: "Failed to update content module" });
    }
  });

  app.delete("/api/modules/:id", async (req: Request, res: Response) => {
    try {
      const moduleId = Number(req.params.id);
      const success = await storage.deleteContentModule(moduleId);
      if (!success) {
        return res.status(404).json({ message: "Content module not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete content module" });
    }
  });

  app.post("/api/sections/:sectionId/reorder-modules", async (req: Request, res: Response) => {
    try {
      const sectionId = Number(req.params.sectionId);
      const { moduleIds } = req.body;
      
      if (!Array.isArray(moduleIds)) {
        return res.status(400).json({ message: "moduleIds must be an array" });
      }
      
      const success = await storage.reorderContentModules(sectionId, moduleIds);
      if (!success) {
        return res.status(400).json({ message: "Failed to reorder modules" });
      }
      
      res.status(200).json({ message: "Modules reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder modules" });
    }
  });

  // Document version routes
  app.get("/api/documents/:documentId/versions", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.documentId);
      const versions = await storage.getDocumentVersionsByDocumentId(documentId);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document versions" });
    }
  });

  app.get("/api/versions/:id", async (req: Request, res: Response) => {
    try {
      const version = await storage.getDocumentVersion(Number(req.params.id));
      if (!version) {
        return res.status(404).json({ message: "Document version not found" });
      }
      res.json(version);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document version" });
    }
  });

  app.post("/api/versions", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertDocumentVersionSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const version = await storage.createDocumentVersion(data);
      res.status(201).json(version);
    } catch (error) {
      res.status(500).json({ message: "Failed to create document version" });
    }
  });

  // Component routes
  app.get("/api/components", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string | undefined;
      let components;
      
      if (query) {
        components = await storage.searchComponents(query);
      } else {
        components = await storage.getComponents();
      }
      
      res.json(components);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch components" });
    }
  });

  app.get("/api/components/:id", async (req: Request, res: Response) => {
    try {
      const component = await storage.getComponent(Number(req.params.id));
      if (!component) {
        return res.status(404).json({ message: "Component not found" });
      }
      res.json(component);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch component" });
    }
  });

  app.post("/api/components", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertComponentSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const existingComponent = await storage.getComponentByCode(data.code);
      if (existingComponent) {
        return res.status(409).json({ message: "Component code already exists" });
      }
      
      const component = await storage.createComponent(data);
      res.status(201).json(component);
    } catch (error) {
      res.status(500).json({ message: "Failed to create component" });
    }
  });

  app.put("/api/components/:id", async (req: Request, res: Response) => {
    try {
      const componentId = Number(req.params.id);
      const { data, error } = validateBody(insertComponentSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const component = await storage.updateComponent(componentId, data);
      if (!component) {
        return res.status(404).json({ message: "Component not found" });
      }
      
      res.json(component);
    } catch (error) {
      res.status(500).json({ message: "Failed to update component" });
    }
  });

  app.delete("/api/components/:id", async (req: Request, res: Response) => {
    try {
      const componentId = Number(req.params.id);
      const success = await storage.deleteComponent(componentId);
      if (!success) {
        return res.status(404).json({ message: "Component not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete component" });
    }
  });

  // BOM routes
  app.get("/api/boms", async (req: Request, res: Response) => {
    try {
      const boms = await storage.getBoms();
      res.json(boms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch BOMs" });
    }
  });

  app.get("/api/boms/:id", async (req: Request, res: Response) => {
    try {
      const bom = await storage.getBom(Number(req.params.id));
      if (!bom) {
        return res.status(404).json({ message: "BOM not found" });
      }
      res.json(bom);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch BOM" });
    }
  });

  app.post("/api/boms", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertBomSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const bom = await storage.createBom(data);
      res.status(201).json(bom);
    } catch (error) {
      res.status(500).json({ message: "Failed to create BOM" });
    }
  });

  app.put("/api/boms/:id", async (req: Request, res: Response) => {
    try {
      const bomId = Number(req.params.id);
      const { data, error } = validateBody(insertBomSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const bom = await storage.updateBom(bomId, data);
      if (!bom) {
        return res.status(404).json({ message: "BOM not found" });
      }
      
      res.json(bom);
    } catch (error) {
      res.status(500).json({ message: "Failed to update BOM" });
    }
  });

  app.delete("/api/boms/:id", async (req: Request, res: Response) => {
    try {
      const bomId = Number(req.params.id);
      const success = await storage.deleteBom(bomId);
      if (!success) {
        return res.status(404).json({ message: "BOM not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete BOM" });
    }
  });

  // BOM items routes
  app.get("/api/boms/:bomId/items", async (req: Request, res: Response) => {
    try {
      const bomId = Number(req.params.bomId);
      const items = await storage.getBomItemsByBomId(bomId);
      
      // Enhance with component details
      const enhancedItems = await Promise.all(items.map(async (item) => {
        const component = await storage.getComponent(item.componentId);
        return {
          ...item,
          component
        };
      }));
      
      res.json(enhancedItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch BOM items" });
    }
  });

  app.post("/api/bom-items", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertBomItemSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const bomItem = await storage.createBomItem(data);
      res.status(201).json(bomItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to create BOM item" });
    }
  });

  app.put("/api/bom-items/:id", async (req: Request, res: Response) => {
    try {
      const itemId = Number(req.params.id);
      const { data, error } = validateBody(insertBomItemSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const bomItem = await storage.updateBomItem(itemId, data);
      if (!bomItem) {
        return res.status(404).json({ message: "BOM item not found" });
      }
      
      res.json(bomItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update BOM item" });
    }
  });

  app.delete("/api/bom-items/:id", async (req: Request, res: Response) => {
    try {
      const itemId = Number(req.params.id);
      const success = await storage.deleteBomItem(itemId);
      if (!success) {
        return res.status(404).json({ message: "BOM item not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete BOM item" });
    }
  });
  
  // Section-Component routes
  app.get("/api/sections/:sectionId/components", async (req: Request, res: Response) => {
    try {
      const sectionId = Number(req.params.sectionId);
      const sectionComponents = await storage.getSectionComponentsBySectionId(sectionId);
      
      // Recupera i dettagli completi dei componenti
      const componentsWithDetails = await Promise.all(
        sectionComponents.map(async (sc) => {
          const component = await storage.getComponent(sc.componentId);
          return {
            id: sc.id,
            sectionId: sc.sectionId,
            component,
            quantity: sc.quantity,
            notes: sc.notes
          };
        })
      );
      
      res.json(componentsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch section components" });
    }
  });
  
  app.get("/api/components/:componentId/sections", async (req: Request, res: Response) => {
    try {
      const componentId = Number(req.params.componentId);
      const sectionComponents = await storage.getSectionComponentsByComponentId(componentId);
      
      // Recupera i dettagli completi delle sezioni
      const sectionsWithDetails = await Promise.all(
        sectionComponents.map(async (sc) => {
          const section = await storage.getSection(sc.sectionId);
          return {
            id: sc.id,
            componentId: sc.componentId,
            section,
            quantity: sc.quantity,
            notes: sc.notes
          };
        })
      );
      
      res.json(sectionsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch section components" });
    }
  });
  
  app.get("/api/section-components/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const sectionComponent = await storage.getSectionComponent(id);
      
      if (!sectionComponent) {
        return res.status(404).json({ message: "Section component not found" });
      }
      
      const component = await storage.getComponent(sectionComponent.componentId);
      const section = await storage.getSection(sectionComponent.sectionId);
      
      res.json({
        id: sectionComponent.id,
        component,
        section,
        quantity: sectionComponent.quantity,
        notes: sectionComponent.notes
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch section component" });
    }
  });
  
  app.post("/api/section-components", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertSectionComponentSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verifica che la sezione e il componente esistano
      const section = await storage.getSection(data.sectionId);
      if (!section) {
        return res.status(404).json({ message: "Section not found" });
      }
      
      const component = await storage.getComponent(data.componentId);
      if (!component) {
        return res.status(404).json({ message: "Component not found" });
      }
      
      const sectionComponent = await storage.createSectionComponent(data);
      
      res.status(201).json({
        ...sectionComponent,
        component,
        section
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create section component" });
    }
  });
  
  app.put("/api/section-components/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { data, error } = validateBody(insertSectionComponentSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const sectionComponent = await storage.updateSectionComponent(id, data);
      if (!sectionComponent) {
        return res.status(404).json({ message: "Section component not found" });
      }
      
      const component = await storage.getComponent(sectionComponent.componentId);
      const section = await storage.getSection(sectionComponent.sectionId);
      
      res.json({
        ...sectionComponent,
        component,
        section
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update section component" });
    }
  });
  
  app.delete("/api/section-components/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteSectionComponent(id);
      if (!success) {
        return res.status(404).json({ message: "Section component not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete section component" });
    }
  });

  // Comment routes
  app.get("/api/documents/:documentId/comments", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.documentId);
      const comments = await storage.getCommentsByDocumentId(documentId);
      
      // Enhance with user details
      const enhancedComments = await Promise.all(comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        return {
          ...comment,
          user: user ? { id: user.id, name: user.name, username: user.username } : null
        };
      }));
      
      res.json(enhancedComments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertCommentSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const comment = await storage.createComment(data);
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:id", async (req: Request, res: Response) => {
    try {
      const commentId = Number(req.params.id);
      const success = await storage.deleteComment(commentId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Module library
  app.get("/api/modules-library", async (req: Request, res: Response) => {
    try {
      const modules = await storage.getModules();
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // Compare BOMs
  app.get("/api/boms/:bomId1/compare/:bomId2", async (req: Request, res: Response) => {
    try {
      const bomId1 = Number(req.params.bomId1);
      const bomId2 = Number(req.params.bomId2);
      
      const bom1 = await storage.getBom(bomId1);
      const bom2 = await storage.getBom(bomId2);
      
      if (!bom1 || !bom2) {
        return res.status(404).json({ message: "One or both BOMs not found" });
      }
      
      const items1 = await storage.getBomItemsByBomId(bomId1);
      const items2 = await storage.getBomItemsByBomId(bomId2);
      
      const enhancedItems1 = await Promise.all(items1.map(async (item) => {
        const component = await storage.getComponent(item.componentId);
        return {
          ...item,
          component
        };
      }));
      
      const enhancedItems2 = await Promise.all(items2.map(async (item) => {
        const component = await storage.getComponent(item.componentId);
        return {
          ...item,
          component
        };
      }));
      
      // Find similarities (based on component code and description)
      const similarities = [];
      for (const item1 of enhancedItems1) {
        for (const item2 of enhancedItems2) {
          const code1 = item1.component?.code || "";
          const code2 = item2.component?.code || "";
          const desc1 = item1.component?.description || "";
          const desc2 = item2.component?.description || "";
          
          // Calculate similarity
          let similarity = 0;
          if (code1 === code2) {
            similarity = 100;
          } else if (code1.includes(code2) || code2.includes(code1)) {
            similarity = 85;
          } else if (desc1 === desc2) {
            similarity = 80;
          } else if (desc1.includes(desc2) || desc2.includes(desc1)) {
            similarity = 65;
          }
          
          if (similarity > 50) {
            similarities.push({
              item1: { ...item1 },
              item2: { ...item2 },
              similarity
            });
          }
        }
      }
      
      // Find unique items in BOM 1
      const uniqueItems1 = enhancedItems1.filter(item1 => {
        return !enhancedItems2.some(item2 => item1.componentId === item2.componentId);
      });
      
      // Find unique items in BOM 2
      const uniqueItems2 = enhancedItems2.filter(item2 => {
        return !enhancedItems1.some(item1 => item2.componentId === item1.componentId);
      });
      
      res.json({
        bom1: { id: bomId1, title: bom1.title },
        bom2: { id: bomId2, title: bom2.title },
        similarities,
        uniqueItems1,
        uniqueItems2
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to compare BOMs" });
    }
  });

  // Module library operations
  app.get("/api/modules/library", async (req: Request, res: Response) => {
    try {
      const modules = await storage.getModules();
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch module library" });
    }
  });

  // Language routes
  app.get("/api/languages", async (req: Request, res: Response) => {
    try {
      const activeOnly = req.query.active === "true";
      const languages = await storage.getLanguages(activeOnly);
      res.json(languages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });

  app.get("/api/languages/:id", async (req: Request, res: Response) => {
    try {
      const language = await storage.getLanguage(Number(req.params.id));
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }
      res.json(language);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch language" });
    }
  });

  app.post("/api/languages", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertLanguageSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const existingLanguage = await storage.getLanguageByCode(data.code);
      if (existingLanguage) {
        return res.status(409).json({ message: "Language code already exists" });
      }
      
      const language = await storage.createLanguage(data);
      res.status(201).json(language);
    } catch (error) {
      res.status(500).json({ message: "Failed to create language" });
    }
  });

  app.put("/api/languages/:id", async (req: Request, res: Response) => {
    try {
      const languageId = Number(req.params.id);
      const { data, error } = validateBody(insertLanguageSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      if (data.code) {
        const existingLanguage = await storage.getLanguageByCode(data.code);
        if (existingLanguage && existingLanguage.id !== languageId) {
          return res.status(409).json({ message: "Language code already exists" });
        }
      }
      
      const language = await storage.updateLanguage(languageId, data);
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }
      
      res.json(language);
    } catch (error) {
      res.status(500).json({ message: "Failed to update language" });
    }
  });

  app.delete("/api/languages/:id", async (req: Request, res: Response) => {
    try {
      const languageId = Number(req.params.id);
      const success = await storage.deleteLanguage(languageId);
      if (!success) {
        return res.status(400).json({ message: "Cannot delete this language" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete language" });
    }
  });

  // Translation assignment routes
  app.get("/api/translation-assignments", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
      
      let assignments = [];
      if (userId) {
        assignments = await storage.getTranslationAssignmentsByUserId(userId);
      } else if (languageId) {
        assignments = await storage.getTranslationAssignmentsByLanguageId(languageId);
      } else {
        // We don't have a method to get all assignments, so we'll combine user and language queries
        // In a real app, you'd add a method to get all or use pagination
        const languages = await storage.getLanguages(true);
        for (const language of languages) {
          const langAssignments = await storage.getTranslationAssignmentsByLanguageId(language.id);
          assignments = [...assignments, ...langAssignments];
        }
      }
      
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch translation assignments" });
    }
  });

  app.get("/api/translation-assignments/:id", async (req: Request, res: Response) => {
    try {
      const assignment = await storage.getTranslationAssignment(Number(req.params.id));
      if (!assignment) {
        return res.status(404).json({ message: "Translation assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch translation assignment" });
    }
  });

  app.post("/api/translation-assignments", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertTranslationAssignmentSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const assignment = await storage.createTranslationAssignment(data);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create translation assignment" });
    }
  });

  app.put("/api/translation-assignments/:id", async (req: Request, res: Response) => {
    try {
      const assignmentId = Number(req.params.id);
      const { data, error } = validateBody(insertTranslationAssignmentSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const assignment = await storage.updateTranslationAssignment(assignmentId, data);
      if (!assignment) {
        return res.status(404).json({ message: "Translation assignment not found" });
      }
      
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update translation assignment" });
    }
  });

  app.delete("/api/translation-assignments/:id", async (req: Request, res: Response) => {
    try {
      const assignmentId = Number(req.params.id);
      const success = await storage.deleteTranslationAssignment(assignmentId);
      if (!success) {
        return res.status(404).json({ message: "Translation assignment not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete translation assignment" });
    }
  });

  // Section translation routes
  app.get("/api/section-translations", async (req: Request, res: Response) => {
    try {
      const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
      const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
      const includeComponents = req.query.includeComponents === "true";
      
      let translations = [];
      if (sectionId && languageId) {
        const translation = await storage.getSectionTranslationByLanguage(sectionId, languageId);
        translations = translation ? [translation] : [];
      } else if (sectionId) {
        translations = await storage.getSectionTranslationsBySectionId(sectionId);
      } else if (languageId) {
        translations = await storage.getSectionTranslationsByLanguageId(languageId);
      } else {
        return res.status(400).json({ message: "Either sectionId or languageId is required" });
      }
      
      // Se richiesto, arricchisci le traduzioni con i componenti BOM associati alle sezioni originali
      if (includeComponents && translations.length > 0) {
        translations = await Promise.all(translations.map(async (translation) => {
          const section = await storage.getSection(translation.sectionId);
          
          // Ottieni i componenti BOM associati alla sezione originale
          const sectionComponents = await storage.getSectionComponentsBySectionId(translation.sectionId);
          
          // Arricchisci con i dettagli completi dei componenti
          const componentsWithDetails = await Promise.all(
            sectionComponents.map(async (sc) => {
              const component = await storage.getComponent(sc.componentId);
              return {
                id: sc.id,
                sectionId: sc.sectionId,
                component,
                quantity: sc.quantity,
                notes: sc.notes
              };
            })
          );
          
          return {
            ...translation,
            section,
            components: componentsWithDetails
          };
        }));
      }
      
      res.json(translations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch section translations" });
    }
  });

  app.get("/api/section-translations/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const translation = await storage.getSectionTranslation(id);
      if (!translation) {
        return res.status(404).json({ message: "Section translation not found" });
      }
      
      // Recupera i dettagli della sezione originale
      const section = await storage.getSection(translation.sectionId);
      
      // Recupera i componenti BOM associati alla sezione originale
      const sectionComponents = await storage.getSectionComponentsBySectionId(translation.sectionId);
      
      // Arricchisci con i dettagli completi dei componenti
      const componentsWithDetails = await Promise.all(
        sectionComponents.map(async (sc) => {
          const component = await storage.getComponent(sc.componentId);
          return {
            id: sc.id,
            sectionId: sc.sectionId,
            component,
            quantity: sc.quantity,
            notes: sc.notes
          };
        })
      );
      
      // Restituisci la traduzione con le informazioni sui componenti BOM associati
      res.json({
        ...translation,
        section,
        components: componentsWithDetails
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch section translation" });
    }
  });

  app.post("/api/section-translations", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertSectionTranslationSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Check for existing translation
      const existingTranslation = await storage.getSectionTranslationByLanguage(
        data.sectionId, 
        data.languageId
      );
      
      if (existingTranslation) {
        return res.status(409).json({ 
          message: "Translation for this section and language already exists",
          existingId: existingTranslation.id
        });
      }
      
      const translation = await storage.createSectionTranslation(data);
      res.status(201).json(translation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create section translation" });
    }
  });

  app.put("/api/section-translations/:id", async (req: Request, res: Response) => {
    try {
      const translationId = Number(req.params.id);
      const { data, error } = validateBody(insertSectionTranslationSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const translation = await storage.updateSectionTranslation(translationId, data);
      if (!translation) {
        return res.status(404).json({ message: "Section translation not found" });
      }
      
      res.json(translation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update section translation" });
    }
  });

  app.delete("/api/section-translations/:id", async (req: Request, res: Response) => {
    try {
      const translationId = Number(req.params.id);
      const success = await storage.deleteSectionTranslation(translationId);
      if (!success) {
        return res.status(404).json({ message: "Section translation not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete section translation" });
    }
  });

  // Content module translation routes
  app.get("/api/module-translations", async (req: Request, res: Response) => {
    try {
      const moduleId = req.query.moduleId ? Number(req.query.moduleId) : undefined;
      const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
      
      let translations = [];
      if (moduleId && languageId) {
        const translation = await storage.getContentModuleTranslationByLanguage(moduleId, languageId);
        translations = translation ? [translation] : [];
      } else if (moduleId) {
        translations = await storage.getContentModuleTranslationsByModuleId(moduleId);
      } else if (languageId) {
        translations = await storage.getContentModuleTranslationsByLanguageId(languageId);
      } else {
        return res.status(400).json({ message: "Either moduleId or languageId is required" });
      }
      
      res.json(translations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch module translations" });
    }
  });

  app.get("/api/module-translations/:id", async (req: Request, res: Response) => {
    try {
      const translation = await storage.getContentModuleTranslation(Number(req.params.id));
      if (!translation) {
        return res.status(404).json({ message: "Module translation not found" });
      }
      res.json(translation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch module translation" });
    }
  });

  app.post("/api/module-translations", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertContentModuleTranslationSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Check for existing translation
      const existingTranslation = await storage.getContentModuleTranslationByLanguage(
        data.moduleId, 
        data.languageId
      );
      
      if (existingTranslation) {
        return res.status(409).json({ 
          message: "Translation for this module and language already exists",
          existingId: existingTranslation.id
        });
      }
      
      const translation = await storage.createContentModuleTranslation(data);
      res.status(201).json(translation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create module translation" });
    }
  });

  app.put("/api/module-translations/:id", async (req: Request, res: Response) => {
    try {
      const translationId = Number(req.params.id);
      const { data, error } = validateBody(insertContentModuleTranslationSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const translation = await storage.updateContentModuleTranslation(translationId, data);
      if (!translation) {
        return res.status(404).json({ message: "Module translation not found" });
      }
      
      res.json(translation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update module translation" });
    }
  });

  app.delete("/api/module-translations/:id", async (req: Request, res: Response) => {
    try {
      const translationId = Number(req.params.id);
      const success = await storage.deleteContentModuleTranslation(translationId);
      if (!success) {
        return res.status(404).json({ message: "Module translation not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete module translation" });
    }
  });

  // Translation import routes
  app.get("/api/translation-imports", async (req: Request, res: Response) => {
    try {
      const imports = await storage.getTranslationImports();
      res.json(imports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch translation imports" });
    }
  });

  app.get("/api/translation-imports/:id", async (req: Request, res: Response) => {
    try {
      const importRecord = await storage.getTranslationImport(Number(req.params.id));
      if (!importRecord) {
        return res.status(404).json({ message: "Translation import not found" });
      }
      res.json(importRecord);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch translation import" });
    }
  });

  app.post("/api/translation-imports", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertTranslationImportSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const importRecord = await storage.createTranslationImport(data);
      res.status(201).json(importRecord);
    } catch (error) {
      res.status(500).json({ message: "Failed to create translation import" });
    }
  });

  app.post("/api/translation-imports/:id/process", async (req: Request, res: Response) => {
    try {
      const importId = Number(req.params.id);
      const importData = req.body;
      
      if (!importData || !importData.sections && !importData.modules) {
        return res.status(400).json({ message: "Invalid import data format" });
      }
      
      const success = await storage.processTranslationImport(importId, importData);
      if (!success) {
        return res.status(400).json({ message: "Failed to process import" });
      }
      
      const updatedImport = await storage.getTranslationImport(importId);
      res.json(updatedImport);
    } catch (error) {
      res.status(500).json({ message: "Failed to process translation import" });
    }
  });

  // Translation AI routes
  app.get("/api/translation-ai-requests", async (req: Request, res: Response) => {
    try {
      const requests = await storage.getTranslationAIRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch translation AI requests" });
    }
  });

  app.get("/api/translation-ai-requests/:id", async (req: Request, res: Response) => {
    try {
      const request = await storage.getTranslationAIRequest(Number(req.params.id));
      if (!request) {
        return res.status(404).json({ message: "Translation AI request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch translation AI request" });
    }
  });

  app.post("/api/translation-ai-requests", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertTranslationAIRequestSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const request = await storage.createTranslationAIRequest({
        ...data,
        status: "pending"
      });
      
      res.status(201).json(request);
      
      // In a real implementation, this would trigger an asynchronous process to handle the AI request
      // For now, we'll simulate it with a delayed update
      setTimeout(async () => {
        try {
          // Simulate AI processing
          const sourceLanguage = await storage.getLanguage(request.sourceLanguageId);
          const targetLanguage = await storage.getLanguage(request.targetLanguageId);
          
          if (!sourceLanguage || !targetLanguage) {
            await storage.updateTranslationAIRequest(request.id, {
              status: "error",
              details: { error: "Source or target language not found" }
            });
            return;
          }
          
          // Mock translation based on request type
          if (request.requestType === "section") {
            const section = await storage.getSection(request.sourceId);
            if (!section) {
              await storage.updateTranslationAIRequest(request.id, {
                status: "error",
                details: { error: "Section not found" }
              });
              return;
            }
            
            // Create a mock translation - in real implementation, this would call an AI service
            const mockTranslation = {
              title: `[${targetLanguage.code}] ${section.title}`,
              description: section.description ? `[${targetLanguage.code}] ${section.description}` : null
            };
            
            // Check if translation already exists
            const existingTranslation = await storage.getSectionTranslationByLanguage(
              section.id,
              targetLanguage.id
            );
            
            if (existingTranslation) {
              await storage.updateSectionTranslation(existingTranslation.id, {
                ...mockTranslation,
                status: "ai_suggested",
                translatedById: request.requestedById
              });
            } else {
              await storage.createSectionTranslation({
                sectionId: section.id,
                languageId: targetLanguage.id,
                title: mockTranslation.title,
                description: mockTranslation.description,
                status: "ai_suggested",
                translatedById: request.requestedById,
                reviewedById: null
              });
            }
            
            await storage.updateTranslationAIRequest(request.id, {
              status: "completed",
              details: { 
                completed: new Date(),
                translation: mockTranslation
              }
            });
          } else if (request.requestType === "module") {
            const module = await storage.getContentModule(request.sourceId);
            if (!module) {
              await storage.updateTranslationAIRequest(request.id, {
                status: "error",
                details: { error: "Module not found" }
              });
              return;
            }
            
            // Create a mock translation - in real implementation, this would call an AI service
            let mockContent = module.content;
            if (typeof mockContent === "object") {
              // Handle different module types
              if ("text" in mockContent) {
                mockContent = { 
                  ...mockContent, 
                  text: `[${targetLanguage.code}] ${mockContent.text}` 
                };
              } else if ("caption" in mockContent) {
                mockContent = { 
                  ...mockContent, 
                  caption: mockContent.caption ? `[${targetLanguage.code}] ${mockContent.caption}` : undefined
                };
              }
            }
            
            // Check if translation already exists
            const existingTranslation = await storage.getContentModuleTranslationByLanguage(
              module.id,
              targetLanguage.id
            );
            
            if (existingTranslation) {
              await storage.updateContentModuleTranslation(existingTranslation.id, {
                content: mockContent,
                status: "ai_suggested",
                translatedById: request.requestedById
              });
            } else {
              await storage.createContentModuleTranslation({
                moduleId: module.id,
                languageId: targetLanguage.id,
                content: mockContent,
                status: "ai_suggested",
                translatedById: request.requestedById,
                reviewedById: null
              });
            }
            
            await storage.updateTranslationAIRequest(request.id, {
              status: "completed",
              details: { 
                completed: new Date(),
                translation: mockContent
              }
            });
          } else {
            await storage.updateTranslationAIRequest(request.id, {
              status: "error",
              details: { error: "Unsupported request type" }
            });
          }
        } catch (error) {
          console.error("Error processing AI request:", error);
          await storage.updateTranslationAIRequest(request.id, {
            status: "error",
            details: { error: "Internal server error" }
          });
        }
      }, 2000); // Simulate a 2-second delay for AI processing
      
    } catch (error) {
      res.status(500).json({ message: "Failed to create translation AI request" });
    }
  });

  // Document translation status
  app.get("/api/documents/:documentId/translation-status/:languageId", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.documentId);
      const languageId = Number(req.params.languageId);
      
      const status = await storage.getDocumentTranslationStatus(documentId, languageId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document translation status" });
    }
  });

  // File upload routes
  app.post("/api/upload", upload.single("file"), saveFileInfo, (req: Request, res: Response) => {
    if (!req.uploadedFile) {
      return res.status(400).json({ message: "Upload failed, no file information available" });
    }
    
    // Return the file information with a public URL
    const fileInfo = {
      ...req.uploadedFile,
      url: getFileUrl(req.uploadedFile.filename)
    };
    
    res.status(201).json(fileInfo);
  });

  // Route to serve uploaded files
  app.use("/uploads", (req: Request, res: Response, next: NextFunction) => {
    const filePath = path.join(process.cwd(), "uploads", req.path);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ message: "File not found" });
      }
      next();
    });
  }, express.static(path.join(process.cwd(), "uploads")));

  // Get file information
  app.get("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const fileId = Number(req.params.id);
      const file = await storage.getUploadedFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Add the URL to the file info
      const fileWithUrl = {
        ...file,
        url: getFileUrl(file.filename)
      };
      
      res.json(fileWithUrl);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch file information" });
    }
  });

  // Delete file
  app.delete("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const fileId = Number(req.params.id);
      const file = await storage.getUploadedFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Delete the physical file
      const filePath = path.join(process.cwd(), "uploads", file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete the database record
      const success = await storage.deleteUploadedFile(fileId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete file record" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
