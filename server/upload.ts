import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { uploadedFiles, insertUploadedFileSchema, type InsertUploadedFile } from '@shared/schema';
import { exec } from 'child_process';
import AdmZip from 'adm-zip';

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
    '.glb', '.gltf', '.stl', '.obj', '.fbx', '.3mf', '.sla', '.jt',
    
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
    } 
    // Eccezione per file 3D JT con MIME type non standard
    else if (fileExt === '.jt' && file.mimetype === 'application/octet-stream') {
      console.log("Accettando file JT (CAD) con MIME type non standard:", file.mimetype);
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

// Estrae il nome del modello 3D dal nome del file
const extract3DModelName = (filename: string): string | null => {
  // Pattern per identificare i nomi dei modelli 3D (es. A4B10789.htm, A5B43041.htm)
  const modelPattern = /^([A-Z]\d[A-Z]\d+)\.(?:htm|html)$/i;
  const match = filename.match(modelPattern);
  console.log("Estrazione nome modello da:", filename, "risultato:", match ? match[1] : "null");
  return match ? match[1] : null;
};

// Gestisce la preparazione della cartella per modelli 3D WebGL
const prepare3DModelFolder = (modelName: string, originalFilePath: string): string | null => {
  try {
    console.log(`Preparazione cartella per modello 3D: ${modelName}`);
    
    // Crea la cartella per il modello 3D
    const modelDir = path.join(uploadsDir, modelName);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
    
    // Crea le sottocartelle necessarie per i modelli WebGL
    const subfolders = ["res", "test", "treeview"];
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(modelDir, subfolder);
      if (!fs.existsSync(subfolderPath)) {
        fs.mkdirSync(subfolderPath, { recursive: true });
      }
    }
    
    // Copia il file HTML nella cartella del modello
    const htmlFileName = `${modelName}.htm`;
    const targetPath = path.join(modelDir, htmlFileName);
    
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(originalFilePath, targetPath);
      console.log(`File HTML copiato in: ${targetPath}`);
    }
    
    return path.join(modelName, htmlFileName);
  } catch (error) {
    console.error(`Errore nella preparazione della cartella per il modello 3D ${modelName}:`, error);
    return null;
  }
};

// Middleware per salvare le informazioni del file nel database
export const saveFileInfo = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && (!req.files || Object.keys(req.files || {}).length === 0)) {
    return res.status(400).json({ message: 'Nessun file caricato' });
  }

  try {
    const userId = req.body.userId || 1; // Default all'admin se non specificato
    
    // Gestisce un singolo file
    if (req.file) {
      // Verifica se il nome del file corrisponde a un modello 3D standard
      const modelNameFromFileName = extract3DModelName(req.file.originalname);
      
      // Determina se il file è un modello 3D in base ai flag o al nome del file
      const isHtmlFile = req.file.originalname.toLowerCase().match(/\.(html|htm)$/i);
      const hasModelFlag = req.body.webglModel === 'true' || req.body.is3DModel === 'true';
      const isStandardModelName = modelNameFromFileName !== null;
      
      // Un file è un modello 3D se è HTML E (ha il flag oppure ha un nome standard)
      const is3DModel = isHtmlFile && (hasModelFlag || isStandardModelName);
      
      if (isStandardModelName && isHtmlFile) {
        console.log(`Rilevato automaticamente modello 3D: ${modelNameFromFileName} dal nome file ${req.file.originalname}`);
      }
      
      let folderName = req.body.folderName || null;
      let targetFilename = req.file.filename;
      
      console.log("Upload file singolo:", {
        originalName: req.file.originalname,
        is3DModel: is3DModel,
        webglModel: req.body.webglModel,
        is3DModelParam: req.body.is3DModel,
        folderName: folderName,
        modelNameFromFileName: modelNameFromFileName
      });
      
      // Se è un modello 3D, gestisci la preparazione della cartella
      if (is3DModel) {
        const modelName = extract3DModelName(req.file.originalname);
        
        if (modelName) {
          folderName = modelName;
          console.log(`Rilevato modello 3D: ${modelName} da file ${req.file.originalname}`);
          
          // Prepara la cartella per il modello 3D
          const relativePath = prepare3DModelFolder(modelName, req.file.path);
          if (relativePath) {
            targetFilename = relativePath;
            console.log(`Path relativo modello: ${relativePath}`);
          } else {
            console.error(`Errore nella preparazione della cartella per il modello ${modelName}`);
          }
        } else {
          console.log("Nessun nome modello valido trovato nel nome del file:", req.file.originalname);
        }
      }
      
      const fileData: InsertUploadedFile = {
        filename: targetFilename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedById: userId,
        folderName: folderName
      };

      // Salva le informazioni nel database
      const [newFile] = await db.insert(uploadedFiles).values(fileData).returning();
      
      // Aggiunge le informazioni del file alla request
      req.uploadedFile = newFile;
      
      // Se è un modello 3D, aggiungi l'informazione
      if (is3DModel && folderName) {
        req.is3DModel = true;
        req.modelFolderName = folderName;
      }
      
      next();
    } 
    // Gestisce array di file (upload multiplo)
    else if (req.files && Array.isArray(req.files)) {
      const fileInfos: InsertUploadedFile[] = [];
      const savedFiles = [];
      
      // Verifica se c'è un file HTML di modello 3D
      const htmlFile = (req.files as Express.Multer.File[]).find(file => 
        file.originalname.toLowerCase().match(/\.(html|htm)$/i)
      );
      
      // Se è specificato un modello 3D o c'è un file HTML, cerchiamo di estrarre il nome del modello
      let folderName = req.body.folderName;
      let modelName = null;
      
      // Verifica se c'è un file HTML e se contiene un nome modello standard
      if (htmlFile) {
        const detectedModelName = extract3DModelName(htmlFile.originalname);
        
        // Se abbiamo trovato un nome modello valido o è stato specificato il flag del modello 3D
        if (detectedModelName || (req.body.webglModel === 'true' || req.body.is3DModel === 'true')) {
          // Usa il nome rilevato o crea un nome generico
          modelName = detectedModelName || htmlFile.originalname.split('.')[0];
          folderName = modelName;
          console.log(`Rilevato modello 3D in upload multiplo: ${modelName} (Auto-rilevato: ${!!detectedModelName})`);
        }
      }
      
      // Se non abbiamo un nome di cartella, creiamone uno basato sul timestamp
      if (!folderName) {
        folderName = `folder_${Date.now()}`;
      }
      
      // Prepara la cartella principale
      const folderBasePath = path.join(uploadsDir, folderName);
      if (!fs.existsSync(folderBasePath)) {
        fs.mkdirSync(folderBasePath, { recursive: true });
      }
      
      // Se è un modello 3D, prepara anche le sottocartelle
      if (modelName) {
        const subfolders = ["res", "test", "treeview"];
        for (const subfolder of subfolders) {
          const subfolderPath = path.join(folderBasePath, subfolder);
          if (!fs.existsSync(subfolderPath)) {
            fs.mkdirSync(subfolderPath, { recursive: true });
          }
        }
      }
      
      // Processa tutti i file
      for (const file of req.files as Express.Multer.File[]) {
        let targetFilename = file.filename;
        
        // Se è il file HTML principale del modello 3D
        if (modelName && file === htmlFile) {
          const htmlFileName = `${modelName}.htm`;
          const targetPath = path.join(folderBasePath, htmlFileName);
          
          if (!fs.existsSync(targetPath)) {
            fs.copyFileSync(file.path, targetPath);
            console.log(`File HTML copiato in: ${targetPath}`);
          }
          
          targetFilename = path.join(folderName, htmlFileName);
        }
        
        const fileData: InsertUploadedFile = {
          filename: targetFilename,
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
      
      // Trova il file HTML (se esiste)
      const mainHtmlFile = savedFiles.find(file => 
        file.originalName.endsWith('.html') || file.originalName.endsWith('.htm')
      );
      
      // Controlla se è stato passato un oggetto fileStructure
      let fileStructureData: Record<string, string> = {};
      if (req.body.fileStructure) {
        try {
          fileStructureData = JSON.parse(req.body.fileStructure) as Record<string, string>;
          console.log("Struttura cartelle ricevuta:", fileStructureData);
          
          // Sposta i file nelle sottocartelle appropriate
          for (const file of savedFiles) {
            const relativePath = fileStructureData[file.originalName];
            if (relativePath) {
              // Estrae il percorso della cartella dal percorso relativo
              const dirPath = path.dirname(relativePath);
              if (dirPath && dirPath !== '.') {
                const targetDir = path.join(folderBasePath, dirPath);
                if (!fs.existsSync(targetDir)) {
                  fs.mkdirSync(targetDir, { recursive: true });
                }
                
                // Sposta il file nella sottocartella
                const currentPath = path.join(uploadsDir, file.filename);
                const newFileName = path.basename(relativePath);
                const newPath = path.join(targetDir, newFileName);
                
                try {
                  // Copia il file nella sottocartella
                  fs.copyFileSync(currentPath, newPath);
                  console.log(`File spostato in: ${newPath}`);
                  
                  // Aggiorna il percorso nel database
                  file.path = newPath;
                  file.filename = path.join(folderName, dirPath, newFileName);
                } catch (e) {
                  console.error(`Errore nello spostamento del file ${file.originalName}:`, e);
                }
              }
            }
          }
        } catch (e) {
          console.error("Errore nel parsing di fileStructure:", e);
        }
      }
      
      // Aggiunge le informazioni dei file alla request
      req.uploadedFiles = savedFiles;
      req.uploadedFile = mainHtmlFile || savedFiles[0]; // Usa il file HTML o il primo file
      req.folderName = folderName;
      req.fileStructure = fileStructureData;
      
      // Se è un modello 3D, aggiungi l'informazione
      if (modelName) {
        req.is3DModel = true;
        req.modelFolderName = modelName;
      }
      
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
      fileStructure?: Record<string, string>;
      is3DModel?: boolean;
      modelFolderName?: string;
    }
  }
}