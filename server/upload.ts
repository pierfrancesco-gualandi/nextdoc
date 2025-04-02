import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { uploadedFiles, insertUploadedFileSchema, type InsertUploadedFile } from '@shared/schema';

// Creazione della cartella uploads se non esiste
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurazione dello storage di multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Genera un nome file random per evitare collisioni
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const fileExt = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${fileExt}`);
  }
});

// Filtro per i tipi di file accettati
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Controlla il mime type
  const allowedMimeTypes = [
    // Immagini
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/svg+xml',
    
    // Documenti
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    
    // Video e audio
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/ogg',
    
    // Modelli 3D
    'model/gltf-binary',  // GLB
    'model/gltf+json',    // GLTF
    'application/octet-stream', // Altri formati binari come STL, OBJ, FBX
    'application/vnd.ms-3mfdocument', // 3MF
    'application/sla',    // SLA
    'model/stl',          // STL
    'model/obj',          // OBJ
    'model/fbx'           // FBX
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo di file non supportato: ${file.mimetype}`));
  }
};

// Configurazione di multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB per consentire modelli 3D più grandi
  }
});

// Middleware per salvare le informazioni del file nel database
export const saveFileInfo = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Nessun file caricato' });
  }

  try {
    const userId = req.body.userId || 1; // Default all'admin se non specificato
    
    const fileData: InsertUploadedFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedById: userId
    };

    // Salva le informazioni nel database
    const [newFile] = await db.insert(uploadedFiles).values(fileData).returning();
    
    // Aggiunge le informazioni del file alla request
    req.uploadedFile = newFile;
    
    next();
  } catch (error) {
    // In caso di errore nel salvataggio sul database, elimina il file
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Errore nel salvataggio del file:', error);
    res.status(500).json({ message: 'Errore nel caricamento del file', error });
  }
};

// Ottiene il percorso pubblico del file
export const getFileUrl = (filename: string): string => {
  return `/uploads/${filename}`;
};

// Estendi l'interfaccia Request di Express
declare global {
  namespace Express {
    interface Request {
      uploadedFile?: any;
    }
  }
}