import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyPassword } from "./auth-utils";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { upload, saveFileInfo, getFileUrl } from "./upload";
import { handleZipUpload, handleMultiZipUpload } from "./zip-handler";
import { handleWebGLModelUpload, initializeWebGLModelFiles } from "./webgl-model-handler";
import { upload as folderUpload, processUploadedFolder, extractZipFile } from "./api/upload-folder";
import { upload3DModel, handle3DModelUpload } from "./api/upload-3d-model";
import { listFiles, createModelFolder } from "./api/files";
import { createWordDocument } from "./word-export";
import path from "path";
// Importazioni dirette ESM
import { getComponentsForSection21 } from './api/components.js';
import { getSpecificComponentsForSection21 } from './api/section21components.js';
import { applyPostProcessing, saveExportedHtml } from './export-utils.mjs';
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Ottieni il percorso corrente in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { read, utils } from 'xlsx';
import { parse } from 'csv-parse/sync';
import type { jsonb } from "drizzle-orm/pg-core";
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
  insertTranslationAIRequestSchema,
  insertDocumentTranslationSchema
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
  // Middleware per estrarre l'ID utente dalla sessione
  app.use((req: Request, res: Response, next: NextFunction) => {
    const selectedUserId = (req.session as any)?.selectedUserId;
    console.log(`[Session Debug] Path: ${req.path}, Session ID: ${(req.session as any)?.id}, Selected User ID: ${selectedUserId}`);
    if (selectedUserId) {
      (req as any).userId = selectedUserId;
      console.log(`[Session Debug] User ID set to: ${selectedUserId}`);
    }
    next();
  });

  // Endpoint per la lista componenti della sezione 2.1
  app.get("/api/section21/components", (req: Request, res: Response) => {
    try {
      console.log("API section21/components chiamata");
      const components = getSpecificComponentsForSection21();
      
      // Genera l'HTML per la tabella dei componenti
      const htmlContent = `
        <div class="bom-container">
          <h4 class="bom-title">Elenco Componenti Disegno 3D</h4>
          <div class="bom-content">
            <table class="bom-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Codice</th>
                  <th>Descrizione</th>
                  <th>Quantità</th>
                </tr>
              </thead>
              <tbody>
                ${components.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.code || '-'}</td>
                    <td>${item.description || '-'}</td>
                    <td>${item.quantity || 1}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      
      console.log("HTML generato:", htmlContent.substring(0, 100) + "...");
      res.send(htmlContent);
    } catch (error) {
      console.error("Errore nell'API section21/components:", error);
      res.status(500).send("Errore nel recupero dei componenti specifici per la sezione 2.1");
    }
  });
  
  // Endpoint per verificare il riconoscimento della sezione 2.1
  app.get("/api/section21/check/:sectionId/:sectionTitle?", (req: Request, res: Response) => {
    try {
      const sectionId = parseInt(req.params.sectionId);
      const sectionTitle = req.params.sectionTitle || '';
      
      console.log(`Verifica sezione 2.1: ID=${sectionId}, Titolo=${sectionTitle}`);
      
      // Determina se è la sezione 2.1 (DISEGNO 3D)
      const isSection21 = (
        sectionId === 16 || 
        sectionId === 21 ||
        (sectionTitle && sectionTitle.includes('DISEGNO 3D')) ||
        sectionTitle.includes('2.1')
      );
      
      res.json({
        sectionId,
        sectionTitle,
        isSection21: isSection21,
        components: isSection21 ? getSpecificComponentsForSection21() : []
      });
    } catch (error) {
      console.error("Errore nella verifica della sezione 2.1:", error);
      res.status(500).json({ 
        error: "Errore nella verifica della sezione 2.1",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
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

  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username e password sono richiesti" });
      }
      
      // Trova l'utente per username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }
      
      // Verifica che l'utente sia attivo
      if (!user.isActive) {
        return res.status(401).json({ message: "Account disabilitato" });
      }
      
      // Verifica la password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }
      
      // Autenticazione riuscita - salva l'ID utente nella sessione
      (req.session as any).selectedUserId = user.id;
      console.log(`[Auth Debug] User authenticated: ${user.username}, ID: ${user.id}, Session ID: ${(req.session as any).id}`);
      console.log(`[Auth Debug] Session after save:`, (req.session as any));
      
      // Restituisci i dati utente senza password
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "Login effettuato con successo",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Errore durante il login:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  app.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID richiesto" });
      }
      
      // Verifica che l'utente esista e sia attivo
      const user = await storage.getUser(Number(userId));
      if (!user) {
        return res.status(401).json({ message: "Utente non trovato" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ message: "Account disabilitato" });
      }
      
      // Restituisci i dati utente senza password
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Errore durante la verifica:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // User-Document assignment routes
  app.get("/api/users/:userId/document-assignments", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      const assignments = await storage.getUserDocumentAssignments(userId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user document assignments" });
    }
  });

  app.get("/api/documents/:documentId/user-assignments", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.documentId);
      const assignments = await storage.getDocumentAssignments(documentId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document user assignments" });
    }
  });

  // Get user document assignments (for admin interface)
  app.get("/api/user-document-assignments", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      
      if (userId) {
        // Get assignments for specific user
        const assignments = await storage.getUserDocumentAssignments(userId);
        res.json(assignments);
      } else {
        // Get all assignments (for admin interface)
        const allAssignments = await storage.getAllUserDocumentAssignments();
        res.json(allAssignments);
      }
    } catch (error) {
      console.error("Error fetching user document assignments:", error);
      res.status(500).json({ message: "Failed to fetch user document assignments" });
    }
  });

  app.post("/api/user-document-assignments", async (req: Request, res: Response) => {
    try {
      const { userId, documentIds } = req.body;
      const assignedById = (req as any).userId || 1; // ID dell'utente che effettua l'assegnazione
      
      if (!userId || !documentIds || !Array.isArray(documentIds)) {
        return res.status(400).json({ message: "userId and documentIds are required" });
      }
      
      // First, delete all existing assignments for this user
      const existingAssignments = await storage.getUserDocumentAssignments(userId);
      for (const assignment of existingAssignments) {
        await storage.deleteUserDocumentAssignment(userId, assignment.documentId);
      }
      
      // Then create new assignments
      const assignments = [];
      for (const documentId of documentIds) {
        const assignment = await storage.createUserDocumentAssignment({ 
          userId, 
          documentId, 
          assignedById 
        });
        assignments.push(assignment);
      }
      
      res.status(201).json(assignments);
    } catch (error) {
      console.error("Error managing user document assignments:", error);
      res.status(500).json({ message: "Failed to create user document assignments" });
    }
  });

  app.delete("/api/users/:userId/documents/:documentId/assignment", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      const documentId = Number(req.params.documentId);
      const success = await storage.deleteUserDocumentAssignment(userId, documentId);
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user document assignment" });
    }
  });

  app.get("/api/users/:userId/assigned-documents", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      const documents = await storage.getAssignedDocumentsForUser(userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned documents for user" });
    }
  });

  // Endpoint di test per verificare il filtraggio documenti per utente specifico
  app.get("/api/test/user-documents/:userId", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      
      // Test diretto del filtro documenti
      const allDocuments = await storage.getDocuments();
      const filteredDocuments = await storage.getDocuments(userId);
      const assignedDocuments = await storage.getAssignedDocumentsForUser(userId);
      const user = await storage.getUser(userId);
      
      res.json({
        userId,
        userInfo: user ? {
          id: user.id,
          username: user.username,
          role: user.role
        } : null,
        totalDocuments: allDocuments.length,
        filteredDocuments: filteredDocuments.length,
        assignedDocuments: assignedDocuments.length,
        allDocuments: allDocuments.map(d => ({ id: d.id, title: d.title })),
        filteredDocumentsList: filteredDocuments.map(d => ({ id: d.id, title: d.title })),
        assignedDocumentsList: assignedDocuments.map(d => ({ id: d.id, title: d.title }))
      });
    } catch (error) {
      console.error("Error in test endpoint:", error);
      res.status(500).json({ message: "Test failed", error: String(error) });
    }
  });

  // Endpoint per creare assegnazioni di test (solo per sviluppo)
  app.post("/api/test/create-document-assignments", async (req: Request, res: Response) => {
    try {
      // Ottieni tutti gli utenti e documenti
      const users = await storage.getUsers();
      const documents = await storage.getDocuments();
      
      if (users.length === 0 || documents.length === 0) {
        return res.status(400).json({ message: "No users or documents found" });
      }

      // Crea assegnazioni di test
      const assignments = [];
      
      // Assegna alcuni documenti agli utenti non-admin
      const nonAdminUsers = users.filter(user => user.role !== 'admin');
      
      for (const user of nonAdminUsers) {
        // Assegna i primi 2 documenti a ogni utente non-admin
        for (let i = 0; i < Math.min(2, documents.length); i++) {
          try {
            const assignment = await storage.createUserDocumentAssignment({
              userId: user.id,
              documentId: documents[i].id,
              assignedById: 1 // Admin che crea le assegnazioni di test
            });
            assignments.push(assignment);
          } catch (error) {
            // Ignora errori di duplicazione
          }
        }
      }
      
      res.json({ 
        message: "Test assignments created",
        assignments: assignments.length,
        totalUsers: nonAdminUsers.length,
        totalDocuments: documents.length
      });
    } catch (error) {
      console.error("Error creating test assignments:", error);
      res.status(500).json({ message: "Failed to create test assignments" });
    }
  });

  // Document routes
  app.get("/api/documents", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string | undefined;
      const userIdParam = req.query.userId ? Number(req.query.userId) : null;
      const sessionUserId = (req as any).userId; // ID utente dalla sessione autenticata
      const userId = userIdParam || sessionUserId;
      
      console.log(`[Documents API] Query: ${query}, UserID param: ${userIdParam}, Session: ${sessionUserId}, Final: ${userId}`);
      
      let documents;
      
      if (query) {
        documents = await storage.searchDocuments(query);
        // Filtra i risultati della ricerca per utenti non-admin
        if (userId) {
          const user = await storage.getUser(userId);
          if (user?.role !== 'admin') {
            const assignedDocuments = await storage.getAssignedDocumentsForUser(userId);
            const assignedIds = assignedDocuments.map(d => d.id);
            documents = documents.filter(doc => assignedIds.includes(doc.id));
          }
        }
      } else {
        documents = await storage.getDocuments(userId);
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
  app.get("/api/documents/sections", async (req: Request, res: Response) => {
    try {
      // Return empty array for now, since this endpoint shouldn't be called
      // The frontend should use /api/documents/:documentId/sections instead
      res.json([]);
    } catch (error) {
      console.error("Error fetching all sections:", error);
      res.status(500).json({ message: "Failed to fetch document sections" });
    }
  });

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
      const moduleId = Number(req.params.id);
      const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
      
      // Ottieni il modulo di base
      const module = await storage.getContentModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Content module not found" });
      }
      
      // Se è richiesta una lingua specifica, ottieni anche la traduzione
      if (languageId) {
        try {
          // Cerca la traduzione per questo modulo nella lingua richiesta
          const translations = await storage.getContentModuleTranslationsByModuleId(moduleId, languageId);
          
          if (translations && translations.length > 0) {
            // Aggiungi la traduzione al modulo
            const moduleWithTranslation = {
              ...module,
              translation: translations[0]
            };
            return res.json(moduleWithTranslation);
          }
        } catch (translationError) {
          console.error("Errore nel recupero della traduzione:", translationError);
          // Non fallire se non troviamo la traduzione, restituisci solo il modulo di base
        }
      }
      
      // Restituisci il modulo senza traduzione
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
      
      // Calcola automaticamente l'ordine se non è specificato
      if (data.order === undefined) {
        try {
          // Ottieni tutti i moduli esistenti nella sezione
          const existingModules = await storage.getContentModulesBySectionId(data.sectionId);
          
          // Trova l'ordine più alto e aggiungi 1
          const highestOrder = existingModules.length > 0 
            ? Math.max(...existingModules.map(m => m.order)) 
            : -1;
            
          data.order = highestOrder + 1;
        } catch (err) {
          console.error("Errore nel calcolo dell'ordine automatico:", err);
          data.order = 100; // Valore di fallback
        }
      }
      
      try {
        const module = await storage.createContentModule(data);
        res.status(201).json(module);
      } catch (err) {
        console.error("Errore nella creazione del modulo:", err);
        res.status(500).json({ message: "Failed to create content module", error: err.message });
      }
    } catch (error) {
      console.error("Errore generico:", error);
      res.status(500).json({ message: "Failed to create content module" });
    }
  });

  app.put("/api/modules/:id", async (req: Request, res: Response) => {
    try {
      const moduleId = Number(req.params.id);
      
      // Gestione speciale per il formato del content
      let moduleData = req.body;
      
      // Se il contenuto è una stringa, proviamo a convertirlo in oggetto
      if (req.body.module && typeof req.body.module.content === 'string') {
        try {
          const parsedContent = JSON.parse(req.body.module.content);
          moduleData = {
            ...req.body.module,
            content: parsedContent
          };
        } catch (parseError) {
          console.error("Errore nel parsing del content:", parseError);
          // Mantieni il content così com'è se non può essere analizzato
        }
      }
      
      const { data, error } = validateBody(insertContentModuleSchema.partial(), moduleData);
      if (error) {
        console.error("Errore di validazione:", error);
        return res.status(400).json({ message: error });
      }
      
      const module = await storage.updateContentModule(moduleId, data);
      if (!module) {
        return res.status(404).json({ message: "Content module not found" });
      }
      
      res.json(module);
    } catch (error) {
      console.error("Errore nell'aggiornamento del modulo:", error);
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

  // Get BOMs associated with a document
  app.get("/api/documents/:documentId/boms", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.documentId);
      
      // Get all sections in the document
      const sections = await storage.getSectionsByDocumentId(documentId);
      
      // Get content modules for each section
      const bomModules = [];
      for (const section of sections) {
        const modules = await storage.getContentModulesBySectionId(section.id);
        
        // Filter for BOM modules
        const sectionBomModules = modules.filter(module => {
          if (module.type !== 'bom') return false;
          
          // Parse content to get BOM ID
          try {
            let content;
            if (typeof module.content === 'string') {
              content = JSON.parse(module.content);
            } else {
              content = module.content;
            }
            
            return content && content.bomId;
          } catch (e) {
            return false;
          }
        });
        
        bomModules.push(...sectionBomModules);
      }
      
      // Extract unique BOM IDs
      const bomIds = new Set();
      bomModules.forEach(module => {
        try {
          let content;
          if (typeof module.content === 'string') {
            content = JSON.parse(module.content);
          } else {
            content = module.content;
          }
          
          if (content && content.bomId) {
            bomIds.add(content.bomId);
          }
        } catch (e) {
          // Skip invalid content
        }
      });
      
      // Get BOM details for each ID
      const boms = [];
      const bomIdsArray = Array.from(bomIds);
      for (let i = 0; i < bomIdsArray.length; i++) {
        const bomId = bomIdsArray[i];
        const bom = await storage.getBom(Number(bomId));
        if (bom) {
          boms.push(bom);
        }
      }
      
      res.json(boms);
    } catch (error) {
      console.error("Error fetching document BOMs:", error);
      res.status(500).json({ message: "Failed to fetch document BOMs" });
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
      
      // Prima eliminiamo tutti i componenti BOM associati
      await storage.deleteBomItems(bomId);
      
      // Poi eliminiamo la BOM stessa
      const success = await storage.deleteBom(bomId);
      if (!success) {
        return res.status(404).json({ message: "BOM not found" });
      }
      
      // Risposta senza body per 204 No Content
      res.status(204).end();
    } catch (error) {
      console.error("Errore durante l'eliminazione della BOM:", error);
      res.status(500).json({ message: "Failed to delete BOM" });
    }
  });
  
  // Endpoint per l'importazione di BOM da file Excel o CSV
  app.post("/api/boms/import", upload.single("file"), async (req: Request, res: Response) => {
    console.log("Richiesta di importazione BOM ricevuta", req.body);
    console.log("File ricevuto:", req.file);
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nessun file caricato" });
      }
      
      const filePath = req.file.path;
      const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
      let bomItems = [];
      
      // Verifica il tipo di file e lo elabora di conseguenza
      if (fileExt === 'csv') {
        // Importazione CSV        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        
        if (!records || records.length === 0) {
          return res.status(400).json({
            message: "Il file CSV non contiene dati validi"
          });
        }
        
        bomItems = records;
        console.log("Dati CSV importati:", JSON.stringify(bomItems.slice(0, 2)));
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        // Importazione Excel
        const allowedTypes = [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/octet-stream',
          'application/xlsx', 
          'application/excel'
        ];
        
        if (!allowedTypes.includes(req.file.mimetype) && !['xlsx', 'xls'].includes(fileExt)) {
          return res.status(400).json({ 
            message: "Formato file non supportato. Caricare un file Excel (.xls o .xlsx) o CSV (.csv)" 
          });
        }
        
        const workbook = read(fs.readFileSync(filePath));
        
        // Assume che il primo foglio del file Excel contenga i dati BOM
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converte i dati del foglio in un array di oggetti
        bomItems = utils.sheet_to_json(worksheet);
        console.log("Dati Excel importati:", JSON.stringify(bomItems.slice(0, 2)));
      } else {
        return res.status(400).json({
          message: "Formato file non supportato. Caricare un file Excel (.xls o .xlsx) o CSV (.csv)"
        });
      }
      
      if (!bomItems || bomItems.length === 0) {
        return res.status(400).json({ 
          message: "Il file non contiene dati validi" 
        });
      }
      
      // Crea una nuova BOM
      const bomTitle = req.body.title || `BOM importata il ${new Date().toLocaleString()}`;
      const newBom = await storage.createBom({
        title: bomTitle,
        description: req.body.description || `Importata da ${fileExt.toUpperCase()}: ${req.file.originalname}`
      });
      
      // Converte ogni riga in un componente BOM
      const components = [];
      const bomItemsToCreate = [];
      
      // Identificazione delle colonne in base alle intestazioni
      const firstRow = bomItems[0];
      const columnHeaders = Object.keys(firstRow);
      
      // Mappa delle colonne
      const columnMap: { 
        level: string | null; 
        code: string | null; 
        description: string | null; 
        quantity: string | null; 
        uom: string | null; 
      } = {
        level: null,
        code: null,
        description: null,
        quantity: null,
        uom: null
      };
      
      // Rileva i nomi delle colonne cercando corrispondenze (più priorità ai match esatti)
      columnHeaders.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();
        
        // Priorità ai match esatti per livello
        if (lowerHeader === 'livello' || lowerHeader === 'level' || lowerHeader === 'liv') {
          columnMap.level = header;
        }
        // Match parziali per livello se non c'è un match esatto
        else if (!columnMap.level && (lowerHeader.includes('liv') || lowerHeader.includes('lev'))) {
          columnMap.level = header;
        }
        
        // Priorità ai match esatti per codice
        if (lowerHeader === 'codice' || lowerHeader === 'code' || lowerHeader === 'cod') {
          columnMap.code = header;
        }
        // Match parziali per codice se non c'è un match esatto
        else if (!columnMap.code && (lowerHeader.includes('cod') || lowerHeader.includes('part'))) {
          columnMap.code = header;
        }
        
        // Priorità ai match esatti per descrizione
        if (lowerHeader === 'descrizione' || lowerHeader === 'description' || lowerHeader === 'desc') {
          columnMap.description = header;
        }
        // Match parziali per descrizione se non c'è un match esatto
        else if (!columnMap.description && (lowerHeader.includes('desc') || lowerHeader.includes('nome'))) {
          columnMap.description = header;
        }
        
        // Opzionali: priorità ai match esatti per quantità
        if (lowerHeader === 'quantità' || lowerHeader === 'quantita' || lowerHeader === 'quantity' || lowerHeader === 'qty') {
          columnMap.quantity = header;
        }
        // Match parziali per quantità se non c'è un match esatto
        else if (!columnMap.quantity && (lowerHeader.includes('quant') || lowerHeader.includes('qty'))) {
          columnMap.quantity = header;
        }
        
        // Opzionali: priorità ai match esatti per unità di misura
        if (lowerHeader === 'unità di misura' || lowerHeader === 'unita di misura' || lowerHeader === 'uom' || lowerHeader === 'u.m.') {
          columnMap.uom = header;
        }
        // Match parziali per unità di misura se non c'è un match esatto
        else if (!columnMap.uom && (lowerHeader.includes('unità') || lowerHeader.includes('unita') || lowerHeader.includes('unit') || lowerHeader.includes('u.m'))) {
          columnMap.uom = header;
        }
      });
      
      console.log("Mappa delle colonne rilevata:", columnMap);
      
      // Controllo se abbiamo almeno le colonne essenziali
      if (!columnMap.level && !columnMap.code) {
        console.error("Colonne obbligatorie mancanti:", columnMap);
        return res.status(400).json({ 
          message: "Il file non contiene le colonne obbligatorie. Assicurarsi che il file contenga almeno le colonne 'Livello' e 'Codice' (o equivalenti)."
        });
      }
      
      // Log delle intestazioni rilevate
      console.log("Intestazioni colonne rilevate:", columnMap);
      
      // Elabora ogni riga del file
      for (const row of bomItems) {
        try {
          // Recupera i dati dalle colonne mappate o usa colonne standard
          
          // Estrazione del livello (obbligatorio)
          let level = 0;
          if (columnMap.level) {
            // Converte in numero e utilizza 0 come default se non è un numero valido
            const levelValue = row[columnMap.level];
            if (levelValue !== undefined && levelValue !== null && levelValue !== '') {
              // Gestisce sia stringhe che numeri
              level = typeof levelValue === 'number' ? levelValue : parseInt(String(levelValue).trim(), 10);
              if (isNaN(level)) level = 0; // Fallback se il parsing fallisce
            }
          } else {
            // Fallback se la colonna del livello non è stata identificata
            level = parseInt(String(row.Livello || row.Level || row['Livello'] || '0').trim(), 10) || 0;
          }
          
          // Estrazione del codice componente (obbligatorio)
          let code = '';
          if (columnMap.code) {
            const codeValue = row[columnMap.code];
            if (codeValue !== undefined && codeValue !== null) {
              code = String(codeValue).trim();
            }
          } else {
            code = String(row.Codice || row.Code || row['Codice'] || '').trim();
          }
          
          // Salta le righe senza codice
          if (!code) {
            console.log("Riga saltata: codice mancante", row);
            continue;
          }
          
          // Estrazione della descrizione (opzionale ma importante)
          let description = '';
          if (columnMap.description) {
            const descValue = row[columnMap.description];
            if (descValue !== undefined && descValue !== null) {
              description = String(descValue).trim();
            }
          } else {
            description = String(row.Descrizione || row.Description || row['Descrizione'] || '').trim();
          }
          
          // Estrazione della quantità (opzionale, default = 1)
          let quantity = 1;
          if (columnMap.quantity) {
            const qtyValue = row[columnMap.quantity];
            if (qtyValue !== undefined && qtyValue !== null && qtyValue !== '') {
              // Gestisce sia stringhe che numeri
              const parsedQty = typeof qtyValue === 'number' ? qtyValue : parseFloat(String(qtyValue).replace(',', '.').trim());
              if (!isNaN(parsedQty) && parsedQty > 0) {
                quantity = parsedQty;
              }
            }
          } else {
            const qtyFallback = row.Quantità || row.Quantity || row['Quantità'] || row['Quantita'];
            if (qtyFallback !== undefined && qtyFallback !== null && qtyFallback !== '') {
              const parsedQty = typeof qtyFallback === 'number' ? qtyFallback : parseFloat(String(qtyFallback).replace(',', '.').trim());
              if (!isNaN(parsedQty) && parsedQty > 0) {
                quantity = parsedQty;
              }
            }
          }
          
          // Estrazione dell'unità di misura (opzionale)
          let unitOfMeasure = '';
          if (columnMap.uom) {
            const uomValue = row[columnMap.uom];
            if (uomValue !== undefined && uomValue !== null) {
              unitOfMeasure = String(uomValue).trim();
            }
          } else {
            unitOfMeasure = String(row["Unità di misura"] || row["Unita di misura"] || row["Unità"] || row.UOM || '').trim();
          }
          
          // Crea il componente se non esiste già
          let component;
          
          // Prima cerca se il componente con lo stesso codice esiste già
          const existingComponent = await storage.getComponentByCode(code);
          if (existingComponent) {
            component = existingComponent;
          } else {
            component = await storage.createComponent({
              code,
              description,
              details: {
                level: level // Salviamo il livello nei dettagli del componente
              }
            });
            components.push(component);
          }
          
          // Aggiungi il componente alla BOM con il livello esplicito
          bomItemsToCreate.push({
            bomId: newBom.id,
            componentId: component.id,
            quantity,
            level // Questo livello sarà usato per la visualizzazione gerarchica
          });
        } catch (error: any) {
          console.error(`Errore nell'elaborazione della riga:`, error.message || error);
        }
      }
      
      try {
        // Crea gli elementi BOM
        const createdBomItems = [];
        for (const item of bomItemsToCreate) {
          try {
            const bomItem = await storage.createBomItem(item);
            createdBomItems.push(bomItem);
          } catch (err: any) {
            console.error(`Errore nella creazione del BOM item:`, err.message || err);
          }
        }
        
        // Elimina il file temporaneo
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        res.status(201).json({
          bom: newBom,
          components: components.length,
          bomItems: createdBomItems.length,
          message: `BOM importata con successo. ${createdBomItems.length} componenti importati.`
        });
      } catch (err: any) {
        console.error("Errore nella fase finale dell'importazione BOM:", err.message || err);
        res.status(500).json({ message: `Errore nella fase finale dell'importazione: ${err.message || 'Errore sconosciuto'}` });
      }
    } catch (error: any) {
      console.error("Errore nell'importazione della BOM:", error.message || error);
      res.status(500).json({ message: `Errore nell'importazione: ${error.message || 'Errore sconosciuto'}` });
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
      console.log(`[DELETE section-component] Tentativo eliminazione ID: ${id}`);
      
      // Prima verifica se esiste
      const existing = await storage.getSectionComponent(id);
      console.log(`[DELETE section-component] Componente esistente:`, existing ? 'TROVATO' : 'NON TROVATO');
      
      if (!existing) {
        console.log(`[DELETE section-component] Componente ${id} non trovato prima dell'eliminazione`);
        return res.status(404).json({ message: "Section component not found" });
      }
      
      const success = await storage.deleteSectionComponent(id);
      console.log(`[DELETE section-component] Risultato eliminazione:`, success ? 'SUCCESS' : 'FAILED');
      
      if (!success) {
        return res.status(404).json({ message: "Section component not found" });
      }
      res.status(204).end();
    } catch (error) {
      console.error(`[DELETE section-component] Errore:`, error);
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
          component,
          code: component?.code || "",
          description: component?.description || ""
        };
      }));
      
      const enhancedItems2 = await Promise.all(items2.map(async (item) => {
        const component = await storage.getComponent(item.componentId);
        return {
          ...item,
          component,
          code: component?.code || "",
          description: component?.description || ""
        };
      }));

      console.log(`BOM1 items count: ${enhancedItems1.length}`);
      console.log(`BOM2 items count: ${enhancedItems2.length}`);
      
      // Estrai tutti i codici per la ricerca rapida
      const allCodes1 = enhancedItems1.map(item => (item.code || "").trim().toUpperCase());
      const allCodes2 = enhancedItems2.map(item => (item.code || "").trim().toUpperCase());
      
      console.log(`BOM1 unique codes count: ${new Set(allCodes1).size}`);
      console.log(`BOM2 unique codes count: ${new Set(allCodes2).size}`);
      
      // Lista dei codici comuni
      const commonCodes = [];
      
      // Find similarities (based on component code and description)
      const similarities = [];
      for (const item1 of enhancedItems1) {
        for (const item2 of enhancedItems2) {
          const code1 = (item1.code || "").trim().toUpperCase();
          const code2 = (item2.code || "").trim().toUpperCase();
          const desc1 = (item1.description || "").trim().toUpperCase();
          const desc2 = (item2.description || "").trim().toUpperCase();
          
          // Calculate similarity
          let similarity = 0;
          
          // Check exact match (case-insensitive)
          if (code1 === code2) {
            similarity = 100;
            // Aggiungi alla lista dei codici comuni (se non già presente)
            if (!commonCodes.includes(code1)) {
              commonCodes.push(code1);
            }
          } 
          // Check if codes contain each other (case-insensitive)
          else if (code1.includes(code2) || code2.includes(code1)) {
            similarity = 85;
          } 
          // Check if codes match without symbols/spaces
          else if (code1.replace(/[\s\-\.]/g, '') === code2.replace(/[\s\-\.]/g, '')) {
            similarity = 95;
            if (!commonCodes.includes(code1)) {
              commonCodes.push(code1);
            }
          }
          // Check if they match numerically (just the numbers)
          else if (code1.replace(/\D/g, '') === code2.replace(/\D/g, '') && code1.replace(/\D/g, '').length > 3) {
            similarity = 80;
          }
          // Description matches
          else if (desc1 === desc2) {
            similarity = 80;
          } 
          else if (desc1.includes(desc2) || desc2.includes(desc1)) {
            similarity = 65;
          }
          
          if (similarity > 50) {
            console.log(`Match found: ${code1} vs ${code2} - Similarity: ${similarity}`);
            similarities.push({
              item1: { ...item1 },
              item2: { ...item2 },
              similarity
            });
          }
        }
      }
      
      console.log(`Similarities count: ${similarities.length}`);
      console.log(`Common codes count: ${commonCodes.length}`);
      
      // Find unique codes in BOM 2 (target)
      const uniqueTargetCodes = allCodes2.filter(code => !commonCodes.includes(code));
      console.log(`Unique target codes count: ${uniqueTargetCodes.length}`);
      
      // Preparazione dati per il frontend (simile al formato del confronto manuale nel client)
      const sourceItems = enhancedItems1.map(item => ({
        id: item.id,
        componentId: item.componentId, 
        bomId: item.bomId,
        level: item.level,
        parentId: item.parentId,
        quantity: item.quantity,
        notes: item.notes,
        code: item.code,
        description: item.description
      }));
      
      const targetItems = enhancedItems2.map(item => ({
        id: item.id,
        componentId: item.componentId, 
        bomId: item.bomId,
        level: item.level,
        parentId: item.parentId,
        quantity: item.quantity,
        notes: item.notes,
        code: item.code,
        description: item.description
      }));
      
      res.json({
        bom1: { id: bomId1, title: bom1.title },
        bom2: { id: bomId2, title: bom2.title },
        similarities,
        sourceItems,
        targetItems,
        commonCodes,
        uniqueTargetCodes,
        sourceBomId: bomId1,
        targetBomId: bomId2
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
      
      let assignments: any[] = [];
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
  
  // Document translation routes
  app.get("/api/document-translations", async (req: Request, res: Response) => {
    try {
      const documentId = req.query.documentId ? Number(req.query.documentId) : undefined;
      const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
      
      let translations = [];
      if (documentId && languageId) {
        const translation = await storage.getDocumentTranslationByLanguage(documentId, languageId);
        translations = translation ? [translation] : [];
      } else if (documentId) {
        translations = await storage.getDocumentTranslationsByDocumentId(documentId);
      } else if (languageId) {
        translations = await storage.getDocumentTranslationsByLanguageId(languageId);
      } else {
        // Se non sono specificati documentId o languageId, usa il filtro generico
        translations = await storage.getDocumentTranslationsByFilter({});
      }
      
      res.json(translations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document translations" });
    }
  });

  app.get("/api/document-translations/:id", async (req: Request, res: Response) => {
    try {
      // Verifica se è stato fornito un parametro languageId
      const documentId = Number(req.params.id);
      const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
      
      if (languageId) {
        // Carica la traduzione specifica per la lingua richiesta
        const translation = await storage.getDocumentTranslationByLanguage(documentId, languageId);
        if (!translation) {
          return res.status(404).json({ message: "Document translation not found for this language" });
        }
        return res.json(translation);
      } else {
        // Comportamento originale quando non è specificata una lingua
        const translation = await storage.getDocumentTranslation(documentId);
        if (!translation) {
          return res.status(404).json({ message: "Document translation not found" });
        }
        return res.json(translation);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document translation" });
    }
  });
  
  // Aggiunta endpoint per etichette statiche utilizzate nell'esportazione
  app.get("/api/static-labels", async (req: Request, res: Response) => {
    try {
      const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
      
      if (!languageId) {
        return res.status(400).json({ message: "Language ID is required" });
      }
      
      // Cerca le etichette statiche per la lingua richiesta
      const staticLabels = await storage.getStaticLabelsByLanguage(languageId);
      
      // Se non esistono etichette statiche per questa lingua, restituisci un oggetto vuoto
      if (!staticLabels) {
        return res.json({});
      }
      
      return res.json(staticLabels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch static labels" });
    }
  });

  app.post("/api/document-translations", async (req: Request, res: Response) => {
    try {
      const { data, error } = validateBody(insertDocumentTranslationSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verifica se esiste già una traduzione per questo documento e lingua
      const existingTranslation = await storage.getDocumentTranslationByLanguage(
        data.documentId, 
        data.languageId
      );
      
      if (existingTranslation) {
        return res.status(400).json({ 
          message: "A translation for this document and language already exists",
          existingId: existingTranslation.id
        });
      }
      
      const newTranslation = await storage.createDocumentTranslation(data);
      res.status(201).json(newTranslation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create document translation" });
    }
  });

  app.put("/api/document-translations/:id", async (req: Request, res: Response) => {
    try {
      const translationId = Number(req.params.id);
      const { data, error } = validateBody(insertDocumentTranslationSchema.partial(), req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const translation = await storage.updateDocumentTranslation(translationId, data);
      if (!translation) {
        return res.status(404).json({ message: "Document translation not found" });
      }
      
      res.json(translation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document translation" });
    }
  });

  app.delete("/api/document-translations/:id", async (req: Request, res: Response) => {
    try {
      const translationId = Number(req.params.id);
      const success = await storage.deleteDocumentTranslation(translationId);
      if (!success) {
        return res.status(404).json({ message: "Document translation not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document translation" });
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
            let mockContent: any = module.content;
            if (typeof mockContent === "object" && mockContent !== null) {
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
          } else if (request.requestType === "document") {
            const document = await storage.getDocument(request.sourceId);
            if (!document) {
              await storage.updateTranslationAIRequest(request.id, {
                status: "error",
                details: { error: "Document not found" }
              });
              return;
            }
            
            // Create a mock translation - in real implementation, this would call an AI service
            const mockTranslation = {
              title: `[${targetLanguage.code}] ${document.title}`,
              description: document.description ? `[${targetLanguage.code}] ${document.description}` : null
            };
            
            // Check if translation already exists
            const existingTranslation = await storage.getDocumentTranslationByLanguage(
              document.id,
              targetLanguage.id
            );
            
            if (existingTranslation) {
              await storage.updateDocumentTranslation(existingTranslation.id, {
                ...mockTranslation,
                translatedById: request.requestedById
              });
            } else {
              await storage.createDocumentTranslation({
                documentId: document.id,
                languageId: targetLanguage.id,
                title: mockTranslation.title,
                description: mockTranslation.description,
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

  // File explorer and management endpoints
  app.get("/api/files", listFiles);
  app.post("/api/files/create-model-folder", createModelFolder);
  
  // File upload routes
  app.post("/api/upload", upload.single("file"), saveFileInfo, (req: Request, res: Response) => {
    // Se il file è stato estratto da un ZIP e abbiamo un URL del visualizzatore, aggiungiamolo alla risposta
    if (req.viewerUrl) {
      return res.status(201).json({
        ...req.uploadedFile,
        viewerUrl: req.viewerUrl,
        isExtracted: true
      });
    }
    if (!req.uploadedFile) {
      return res.status(400).json({ message: "Upload failed, no file information available" });
    }
    
    // Return the file information with a public URL
    const fileInfo = {
      ...req.uploadedFile,
      url: getFileUrl(req.uploadedFile.filename)
    };
    
    // Se è un file ZIP e ha estratto i file, includi anche le informazioni sulla cartella
    if (req.file?.originalname.toLowerCase().endsWith('.zip') && req.uploadedFiles && req.folderName) {
      return res.status(201).json({
        ...fileInfo,
        isZipExtract: true,
        folderName: req.folderName,
        allFiles: req.uploadedFiles.map((file: any) => ({
          ...file,
          url: getFileUrl(file.filename)
        })),
        fileStructure: req.fileStructure || {}
      });
    }
    
    res.status(201).json(fileInfo);
  });
  
  // Route per caricare una cartella di file (per modelli 3D con HTML)
  app.post("/api/upload-folder", folderUpload, extractZipFile, processUploadedFolder);
  
  // Endpoint dedicato per l'upload di modelli 3D
  app.post("/api/upload-3d-model", upload3DModel, handle3DModelUpload);
  
  /* Vecchia implementazione mantenuta come riferimento */
  app.post("/api/upload-folder-old", upload.array("files", 50), saveFileInfo, (req: Request, res: Response) => {
    if (!req.uploadedFile || !req.uploadedFiles) {
      return res.status(400).json({ message: "Upload failed, no files information available" });
    }
    
    console.log("--------- CARICAMENTO CARTELLA 3D -----------");
    console.log("File principale:", req.uploadedFile.originalName);
    console.log("Totale file caricati:", req.uploadedFiles.length);
    console.log("Nome cartella:", req.folderName);
    console.log("Struttura cartelle:", req.fileStructure ? Object.keys(req.fileStructure).length : 0, "elementi");
    
    // Per ogni file nella cartella, genera un URL corretto
    const allFilesWithUrls = req.uploadedFiles.map(file => {
      // Genera l'URL corretto per il file, considerando sottocartelle
      let fileUrl = getFileUrl(file.filename);
      
      // Se è un file in una sottocartella del modello 3D, crea un URL che rispecchia la stessa struttura
      if (req.fileStructure && req.fileStructure[file.originalName]) {
        // Ottieni il percorso relativo del file dalla struttura
        const relativePath = req.fileStructure[file.originalName];
        console.log(`File ${file.originalName} - percorso relativo: ${relativePath}`);
      }
      
      return {
        id: file.id,
        filename: file.filename, 
        originalName: file.originalName,
        url: fileUrl,
        mimeType: file.mimeType,
        relativePath: req.fileStructure ? req.fileStructure[file.originalName] || '' : ''
      };
    });
    
    // Restituisci informazioni sul file principale (HTML) e informazioni sulla cartella
    const fileInfo = {
      ...req.uploadedFile,
      url: getFileUrl(req.uploadedFile.filename),
      folderName: req.folderName,
      totalFiles: req.uploadedFiles.length,
      // Include informazioni sulla struttura delle cartelle per il frontend
      fileStructure: req.fileStructure || {},
      // Aggiungi un array di tutti i file caricati con URL
      allFiles: allFilesWithUrls
    };
    
    console.log("URL file principale:", fileInfo.url);
    console.log("File totali restituiti:", fileInfo.allFiles.length);
    console.log("----------------------------------------");
    
    res.status(201).json(fileInfo);
  });

  // Route to serve uploaded files


  // Endpoint per scaricare il file esportato
  app.get("/api/exports/:filename", (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "../exports", filename);
    
    // Verifica che il file esista
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File esportato non trovato" });
    }
    
    // Imposta gli header per il download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    // Invia il file
    res.sendFile(filePath);
  });
  
  // Endpoint specifico per l'esportazione HTML con post-processing
  app.post("/api/documents/:id/export/html", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Recupera tutte le sezioni del documento
      const sections = await storage.getSectionsByDocumentId(documentId);
      
      // Recupera i moduli di contenuto delle sezioni
      const allModules: any[] = [];
      for (const section of sections) {
        const modules = await storage.getContentModulesBySectionId(section.id);
        allModules.push(...modules);
      }
      
      // Ottiene l'HTML fornito dal client (generato nel frontend)
      const { html } = req.body;
      
      if (!html) {
        return res.status(400).json({ message: "HTML content is missing" });
      }
      
      // Applica il post-processing all'HTML
      const processedHtml = applyPostProcessing(document, sections, html);
      
      // Salva l'HTML processato (per riferimento)
      const timestamp = new Date().getTime();
      const filename = `document_${documentId}_${timestamp}.html`;
      saveExportedHtml(processedHtml, filename);
      
      // Restituisci l'HTML processato
      res.status(200).json({ 
        html: processedHtml,
        filename,
        exportUrl: `/api/exports/${filename}`
      });
    } catch (error) {
      console.error("Error exporting document to HTML:", error);
      res.status(500).json({ message: "Failed to export document to HTML" });
    }
  });

  // Rotta specifica per il download dei file ZIP dei modelli 3D
  app.get("/downloads/:modelName\\.:extension", (req: Request, res: Response) => {
    if (req.params.extension !== 'zip') {
      return res.status(404).json({ message: "Solo file ZIP supportati" });
    }
    const modelName = req.params.modelName;
    const uploadsDir = path.join(process.cwd(), "uploads");
    
    // Cerca il file ZIP corrispondente
    let zipFilePath = path.join(uploadsDir, `${modelName}.zip`);
    
    // Se non esiste, cerca tra i file con timestamp
    if (!fs.existsSync(zipFilePath)) {
      const files = fs.readdirSync(uploadsDir);
      const matchingZip = files.find(file => 
        file.endsWith('.zip') && file.includes(modelName)
      );
      
      if (matchingZip) {
        zipFilePath = path.join(uploadsDir, matchingZip);
      }
    }
    
    // Verifica se il file esiste
    if (!fs.existsSync(zipFilePath)) {
      return res.status(404).json({ message: "File ZIP non trovato" });
    }
    
    // Imposta headers per il download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${modelName}.zip"`);
    
    // Invia il file
    res.sendFile(zipFilePath, (err) => {
      if (err) {
        console.error('Errore nel download del file ZIP:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Errore nel download del file" });
        }
      }
    });
  });

  app.use("/uploads", (req: Request, res: Response, next: NextFunction) => {
    // Path richiesto originale
    const requestedPath = req.path;
    
    // Verifica se il path richiesto è nella forma /NOME_CARTELLA/NOME_CARTELLA.htm
    const modelFolderMatch = requestedPath.match(/^\/([^\/]+)\/\1\.(htm|html)$/i);
    
    // Path completo al file richiesto
    let filePath = path.join(process.cwd(), "uploads", requestedPath);
    
    // Se stiamo cercando di accedere a un modello 3D nel formato specifico
    if (modelFolderMatch) {
      // Estrai il nome della cartella/file dal path
      const folderName = modelFolderMatch[1];
      const extension = modelFolderMatch[2];
      
      console.log(`Richiesto modello 3D: ${folderName}.${extension} - Verifico se esiste: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`File non trovato: ${filePath}`);
        
        // 1. Verifica se esiste un file caricato direttamente (senza cartella) con nome simile
        const uploadsDir = path.join(process.cwd(), "uploads");
        const files = fs.readdirSync(uploadsDir);
        
        // Cerca un file che termina con lo stesso nome di file
        const matchingFile = files.find(file => {
          return file.endsWith(`${folderName}.${extension}`) && fs.statSync(path.join(uploadsDir, file)).isFile();
        });
        
        if (matchingFile) {
          console.log(`Trovato file corrispondente: ${matchingFile}`);
          
          // Crea la cartella per il modello se non esiste
          const modelDir = path.join(uploadsDir, folderName);
          if (!fs.existsSync(modelDir)) {
            fs.mkdirSync(modelDir, { recursive: true });
          }
          
          // Crea anche le sottocartelle richieste per WebGL
          const subfolders = ["res", "test", "treeview"];
          for (const subfolder of subfolders) {
            const subfolderPath = path.join(modelDir, subfolder);
            if (!fs.existsSync(subfolderPath)) {
              fs.mkdirSync(subfolderPath, { recursive: true });
            }
          }
          
          // Copia il file nella posizione corretta con il nome corretto
          const sourceFile = path.join(uploadsDir, matchingFile);
          const targetFile = path.join(modelDir, `${folderName}.${extension}`);
          
          if (!fs.existsSync(targetFile)) {
            try {
              fs.copyFileSync(sourceFile, targetFile);
              console.log(`File copiato da ${sourceFile} a ${targetFile}`);
              
              // Aggiorna il percorso del file da servire
              filePath = targetFile;
            } catch (error) {
              console.error(`Errore nella copia del file: ${error}`);
            }
          } else {
            // Il file esiste già nella posizione target, usa quello
            filePath = targetFile;
          }
        } else {
          // Verifica se esiste un file ZIP con lo stesso nome di base
          const zipFile = files.find(file => {
            return file === `${folderName}.zip` && fs.statSync(path.join(uploadsDir, file)).isFile();
          });
          
          if (zipFile) {
            console.log(`Trovato file ZIP corrispondente: ${zipFile}`);
            
            try {
              // Estrai il file ZIP nella cartella
              const modelDir = path.join(uploadsDir, folderName);
              if (!fs.existsSync(modelDir)) {
                fs.mkdirSync(modelDir, { recursive: true });
              }
              
              // Normalmente qui ci sarebbe un'estrazione ZIP, ma per semplicità
              // assumiamo che i file siano già stati estratti
              
              // Verifica se ora esiste il file target
              const targetFile = path.join(modelDir, `${folderName}.${extension}`);
              if (fs.existsSync(targetFile)) {
                console.log(`File trovato dopo l'estrazione: ${targetFile}`);
                filePath = targetFile;
              }
            } catch (error) {
              console.error(`Errore nell'estrazione del file ZIP: ${error}`);
            }
          }
        }
      }
    }
    
    // Verifica l'esistenza del file
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Configura MIME types aggiuntivi per file 3D e supporto WebGL
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.gltf') {
        res.setHeader('Content-Type', 'model/gltf+json');
      } else if (ext === '.glb') {
        res.setHeader('Content-Type', 'model/gltf-binary');
      } else if (ext === '.html' || ext === '.htm') {
        res.setHeader('Content-Type', 'text/html');
      } else if (ext === '.js') {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css');
      } else if (ext === '.obj') {
        res.setHeader('Content-Type', 'text/plain');
      } else if (ext === '.stl') {
        // STL può essere binario o ASCII, ma usiamo application/octet-stream per sicurezza
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      
      // Configurazione CORS per consentire l'accesso da iframe
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Servi il file direttamente senza passare a express.static
      res.sendFile(filePath);
    });
  }, express.static(path.join(process.cwd(), "uploads"), {
    // Opzioni aggiuntive per express.static
    setHeaders: (res, filePath) => {
      // Aggiungi cache control per migliorare le prestazioni
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Assicurati che tutti i file HTML e JS possano essere caricati in un iframe
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.html' || ext === '.htm' || ext === '.js') {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }
  }));

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
  
  // Get recent files - questa route deve venire PRIMA della route con il parametro :id
  app.get("/api/files/recent", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      const files = await storage.getUploadedFiles(limit, userId);
      
      // Add URL to each file
      const filesWithUrls = files.map(file => ({
        ...file,
        url: getFileUrl(file.filename)
      }));
      
      res.json(filesWithUrls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent files" });
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

  // Export routes
  app.get("/api/documents/:id/export/word", async (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
      
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Generate the Word document
      const filename = await createWordDocument(documentId, languageId);
      
      // Set the path to the generated file
      const filePath = path.join(__dirname, "../exports", filename);
      
      // Send the file as a download
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).json({ message: "Failed to send file" });
        }
      });
    } catch (error) {
      console.error("Error exporting document to Word:", error);
      res.status(500).json({ message: "Failed to export document to Word" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
