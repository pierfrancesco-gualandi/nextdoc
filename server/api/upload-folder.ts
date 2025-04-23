import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db } from '../db';
import { uploadedFiles } from '@shared/schema';
import AdmZip from 'adm-zip';

// Configura la directory per gli upload
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configura multer per l'upload dei file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB per supportare cartelle grandi
  }
}).array('files', 100); // Supporta fino a 100 file per upload

// Estrae il nome del modello 3D dal nome del file HTML
const extract3DModelName = (filename: string): string | null => {
  // Pattern per identificare i nomi dei modelli 3D (es. A4B10789.htm, A5B43041.htm)
  const modelPattern = /^([A-Z]\d[A-Z]\d+)\.(?:htm|html)$/i;
  const match = filename.match(modelPattern);
  console.log("Estrazione nome modello da:", filename, "risultato:", match ? match[1] : "null");
  return match ? match[1] : null;
};

// Processa i file caricati per determinare la struttura della cartella
export const processUploadedFolder = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Nessun file caricato' });
    }

    console.log(`Ricevuto upload di cartella con ${files.length} file`);
    
    // 1. Determina il nome della cartella principale
    let folderName = req.body.folderName;
    
    // Se non viene specificato un nome cartella, cerca il file HTML principale
    if (!folderName) {
      // Trova il file HTML principale
      const htmlFiles = files.filter(file => 
        file.originalname.toLowerCase().endsWith('.htm') || 
        file.originalname.toLowerCase().endsWith('.html')
      );
      
      if (htmlFiles.length > 0) {
        // Prova a estrarre il nome del modello dal nome del file
        const htmlFile = htmlFiles[0];
        const modelName = extract3DModelName(htmlFile.originalname);
        
        if (modelName) {
          folderName = modelName;
          console.log(`Nome cartella estratto dal file HTML: ${folderName}`);
        } else {
          // Se non è un nome standard, usa il nome del file senza estensione
          folderName = htmlFile.originalname.split('.')[0];
          console.log(`Nome cartella derivato dal nome file: ${folderName}`);
        }
      } else {
        // Se non ci sono file HTML, usa un timestamp
        folderName = `model_${Date.now()}`;
        console.log(`Nessun file HTML trovato, usando nome temporaneo: ${folderName}`);
      }
    }
    
    console.log(`Usando nome cartella: ${folderName}`);
    
    // 2. Crea la cartella principale e le sottocartelle necessarie
    const modelDir = path.join(uploadsDir, folderName);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
    
    // Crea le sottocartelle standard per i modelli WebGL
    const subfolders = ["res", "test", "treeview"];
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(modelDir, subfolder);
      if (!fs.existsSync(subfolderPath)) {
        fs.mkdirSync(subfolderPath, { recursive: true });
      }
    }
    
    // 3. Elabora la struttura delle cartelle dai file (se specificata)
    let fileStructure: Record<string, string> = {};
    let allFiles: string[] = [];
    
    try {
      if (req.body.fileStructure) {
        fileStructure = JSON.parse(req.body.fileStructure);
        console.log("Struttura cartelle ricevuta:", fileStructure);
      }
    } catch (e) {
      console.error("Errore nel parsing di fileStructure:", e);
    }
    
    // 4. Copia i file nelle posizioni corrette
    const savedFiles = [];
    const userId = req.body.userId || 1;
    
    for (const file of files) {
      let targetPath: string;
      let relativePath: string;
      
      // Se abbiamo informazioni sulla struttura del file, usale
      if (fileStructure[file.originalname]) {
        relativePath = fileStructure[file.originalname];
        const dirPath = path.dirname(relativePath);
        
        // Crea la struttura delle cartelle se necessario
        if (dirPath && dirPath !== '.') {
          const targetDir = path.join(modelDir, dirPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
        }
        
        // Percorso completo del file
        targetPath = path.join(modelDir, relativePath);
      } else {
        // File senza informazioni specifiche, mettilo nella cartella principale
        targetPath = path.join(modelDir, file.originalname);
        relativePath = file.originalname;
      }
      
      // Copia il file nella posizione corretta
      fs.copyFileSync(file.path, targetPath);
      console.log(`File copiato in: ${targetPath}`);
      
      // Se è un file HTML con nome modello standard, crea anche una copia con nome standardizzato
      if (file.originalname.toLowerCase().endsWith('.htm') || file.originalname.toLowerCase().endsWith('.html')) {
        const standardFileName = `${folderName}.htm`;
        const standardPath = path.join(modelDir, standardFileName);
        
        // Copia solo se non esiste già il file standard
        if (!fs.existsSync(standardPath)) {
          fs.copyFileSync(file.path, standardPath);
          console.log(`Creata copia del file HTML come: ${standardPath}`);
        }
      }
      
      // Aggiungi all'elenco di tutti i file
      allFiles.push(path.join(folderName, relativePath));
      
      // Salva le informazioni del file nel database
      const fileData = {
        filename: path.join(folderName, relativePath),
        originalName: file.originalname,
        path: targetPath,
        mimetype: file.mimetype,
        size: file.size,
        uploadedById: userId,
        folderName: folderName
      };
      
      savedFiles.push(fileData);
    }
    
    // 5. Salva le informazioni nel database
    if (savedFiles.length > 0) {
      try {
        const result = await db.insert(uploadedFiles).values(savedFiles).returning();
        console.log(`Salvati ${result.length} file nel database`);
      } catch (error) {
        console.error("Errore nel salvataggio dei file nel database:", error);
      }
    }
    
    // 6. Determina il file HTML principale per la risposta
    const mainHtmlFile = savedFiles.find(file => 
      file.originalName.toLowerCase().endsWith('.html') || 
      file.originalName.toLowerCase().endsWith('.htm')
    );
    
    // Trova il file HTML standardizzato
    const standardHtmlPath = path.join(folderName, `${folderName}.htm`);
    
    // 7. Invia la risposta
    res.status(201).json({
      folderName,
      url: mainHtmlFile 
        ? `/uploads/${mainHtmlFile.filename}`
        : `/uploads/${standardHtmlPath}`,
      originalName: mainHtmlFile ? mainHtmlFile.originalName : `${folderName}.htm`,
      fileStructure,
      allFiles,
      filesCount: savedFiles.length,
      message: `Cartella modello 3D '${folderName}' caricata con successo`
    });
    
  } catch (error) {
    console.error("Errore nell'elaborazione della cartella:", error);
    
    // Se ci sono file caricati, elimina i file temporanei
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        if (file.path && fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.error(`Errore nell'eliminazione del file temporaneo ${file.path}:`, e);
          }
        }
      }
    }
    
    res.status(500).json({ 
      message: 'Errore durante l\'elaborazione della cartella di modello 3D',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Middleware per l'estrazione dei file ZIP
export const extractZipFile = async (req: Request, res: Response, next: Function) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }
  
  const zipFiles = (req.files as Express.Multer.File[]).filter(file => 
    file.originalname.toLowerCase().endsWith('.zip')
  );
  
  if (zipFiles.length === 0) {
    return next();
  }
  
  try {
    // Usa solo il primo file ZIP trovato
    const zipFile = zipFiles[0];
    console.log(`Estrazione del file ZIP: ${zipFile.originalname}`);
    
    const zipPath = zipFile.path;
    const zip = new AdmZip(zipPath);
    
    // Determina il nome della cartella per l'estrazione
    let extractFolderName = req.body.folderName;
    
    // Se non è specificato, usa il nome del file ZIP senza estensione
    if (!extractFolderName) {
      extractFolderName = zipFile.originalname.replace(/\.zip$/i, '');
      
      // Controlla se è un nome di modello standard
      const modelName = extract3DModelName(extractFolderName + '.htm');
      if (modelName) {
        extractFolderName = modelName;
      }
    }
    
    console.log(`Estrazione in cartella: ${extractFolderName}`);
    
    // Crea la cartella di destinazione
    const extractDir = path.join(uploadsDir, extractFolderName);
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    
    // Estrai tutti i file del ZIP
    zip.extractAllTo(extractDir, true);
    console.log(`File ZIP estratto in: ${extractDir}`);
    
    // Trova tutti i file estratti
    const extractedFiles: Express.Multer.File[] = [];
    const fileStructure: Record<string, string> = {};
    const walkDir = (dir: string, baseDir = '') => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath, path.join(baseDir, file));
        } else {
          // Crea un file fittizio per ogni file estratto
          const relativePath = path.join(baseDir, file);
          const fakeTempPath = path.join(uploadsDir, `temp_${Date.now()}_${file}`);
          
          // Copia il file in una posizione temporanea
          fs.copyFileSync(filePath, fakeTempPath);
          
          // @ts-ignore - creiamo un oggetto File semplificato
          const fakeFile: Express.Multer.File = {
            fieldname: 'files',
            originalname: file,
            encoding: '7bit',
            mimetype: 'application/octet-stream',
            size: stat.size,
            destination: uploadsDir,
            filename: path.basename(fakeTempPath),
            path: fakeTempPath,
            buffer: Buffer.alloc(0),
            stream: null as any // Non necessario per il nostro uso
          };
          
          extractedFiles.push(fakeFile);
          fileStructure[file] = relativePath;
        }
      }
    };
    
    walkDir(extractDir);
    
    console.log(`Estratti ${extractedFiles.length} file dal ZIP`);
    
    // Sostituisci i file con quelli estratti
    req.files = extractedFiles;
    req.body.folderName = extractFolderName;
    req.body.fileStructure = JSON.stringify(fileStructure);
    req.body.isZipExtract = 'true';
    
    next();
  } catch (error) {
    console.error("Errore nell'estrazione del file ZIP:", error);
    next(error);
  }
};