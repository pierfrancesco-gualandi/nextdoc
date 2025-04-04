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
  // Estensione del file
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    // Immagini
    '.jpg', '.jpeg', '.png', '.gif', '.svg',
    
    // Documenti
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.zip',
    
    // Video e audio
    '.mp4', '.webm', '.mp3', '.ogg',
    
    // Modelli 3D
    '.glb', '.gltf', '.stl', '.obj', '.fbx', '.3mf', '.sla',
    
    // WebGL e HTML
    '.html', '.htm'
  ];
  
  // Controlla il mime type o l'estensione del file
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
    'text/csv',
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
    'model/fbx',          // FBX
    
    // HTML e WebGL
    'text/html',
    'application/xhtml+xml',
    
    // Altri tipi per Excel e documenti
    'application/excel',
    'application/xlsx',
    'application/csv',
    'application/x-excel',
  ];
  
  // Per debugging
  console.log(`File upload - Nome: ${file.originalname}, Estensione: ${fileExt}, Tipo MIME: ${file.mimetype}`);
  
  // Accetta il file se il suo tipo MIME è nell'elenco o l'estensione è valida
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    // Eccezione per file HTML con MIME type non standard
    if ((fileExt === '.html' || fileExt === '.htm')) {
      console.log("Accettando file HTML con MIME type non standard:", file.mimetype);
      cb(null, true);
    } 
    // Eccezione per file Excel e CSV con MIME type non standard
    else if ((fileExt === '.xlsx' || fileExt === '.xls' || fileExt === '.csv') && 
        (file.mimetype === 'application/octet-stream' || file.mimetype.includes('sheet') || file.mimetype.includes('excel') || file.mimetype.includes('csv'))) {
      console.log("Accettando file Excel/CSV con MIME type non standard:", file.mimetype);
      cb(null, true);
    } else {
      cb(new Error(`Tipo di file non supportato: ${file.mimetype} con estensione ${fileExt}`));
    }
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
  if (!req.file && (!req.files || Object.keys(req.files || {}).length === 0)) {
    return res.status(400).json({ message: 'Nessun file caricato' });
  }

  try {
    const userId = req.body.userId || 1; // Default all'admin se non specificato
    
    // Gestisce un singolo file
    if (req.file) {
      const fileData: InsertUploadedFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedById: userId,
        folderName: req.body.folderName || null
      };

      // Salva le informazioni nel database
      const [newFile] = await db.insert(uploadedFiles).values(fileData).returning();
      
      // Aggiunge le informazioni del file alla request
      req.uploadedFile = newFile;
      
      next();
    } 
    // Gestisce array di file
    else if (req.files && Array.isArray(req.files)) {
      const fileInfos: InsertUploadedFile[] = [];
      const savedFiles = [];
      
      // Crea un nome di cartella basato sul timestamp se non è fornito
      const folderName = req.body.folderName || `folder_${Date.now()}`;
      
      for (const file of req.files as Express.Multer.File[]) {
        const fileData: InsertUploadedFile = {
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
          uploadedById: userId,
          folderName: folderName
        };
        
        fileInfos.push(fileData);
      }
      
      // Salva tutte le informazioni nel database
      if (fileInfos.length > 0) {
        savedFiles.push(...await db.insert(uploadedFiles).values(fileInfos).returning());
      }
      
      // Se c'è un file HTML, memorizzalo come file principale
      const htmlFile = savedFiles.find(file => 
        file.originalName.endsWith('.html') || file.originalName.endsWith('.htm')
      );
      
      // Aggiunge le informazioni dei file alla request
      req.uploadedFiles = savedFiles;
      req.uploadedFile = htmlFile || savedFiles[0]; // Usa il file HTML o il primo file
      req.folderName = folderName;
      
      next();
    } else {
      next();
    }
  } catch (error) {
    // In caso di errore nel salvataggio sul database, elimina il file
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    // Elimina più file se necessario
    else if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
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
      uploadedFiles?: any[];
      folderName?: string;
    }
  }
}