import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  insertUserSchema,
  insertDocumentSchema,
  insertSectionSchema,
  insertContentModuleSchema,
  insertDocumentVersionSchema,
  insertComponentSchema,
  insertBomSchema,
  insertBomItemSchema,
  insertCommentSchema
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

  const httpServer = createServer(app);
  return httpServer;
}
