import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { uploadedFiles, type InsertUploadedFile } from '@shared/schema';

// Directory dove vengono estratti i file ZIP
const uploadsDir = path.join(process.cwd(), 'uploads');
const extractsBaseDir = path.join(uploadsDir, 'extracts');

// Assicuriamoci che la directory esista
if (!fs.existsSync(extractsBaseDir)) {
  fs.mkdirSync(extractsBaseDir, { recursive: true });
}

/**
 * Estrae un file ZIP e crea una struttura di cartelle nel filesystem
 * @param zipFilePath Percorso del file ZIP
 * @param destinationDir Cartella di destinazione dove estrarre i file
 */
export const extractZip = (zipFilePath: string, destinationDir: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    try {
      // Verifica l'esistenza del file ZIP
      if (!fs.existsSync(zipFilePath)) {
        return reject(new Error(`Il file ZIP non esiste: ${zipFilePath}`));
      }

      // Crea la directory di destinazione se non esiste
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      // Estrai il file zip
      const zip = new AdmZip(zipFilePath);
      const zipEntries = zip.getEntries();

      // Tieni traccia dei file estratti
      const extractedFiles: string[] = [];
      
      console.log(`Estrazione di ${zipEntries.length} file da ${zipFilePath} in ${destinationDir}`);

      // Estrai i file
      zip.extractAllTo(destinationDir, true);
      
      // Registra i file estratti
      zipEntries.forEach(entry => {
        if (!entry.isDirectory) {
          extractedFiles.push(path.join(destinationDir, entry.entryName));
        }
      });

      resolve(extractedFiles);
    } catch (err) {
      console.error('Errore durante l\'estrazione del file ZIP:', err);
      reject(err);
    }
  });
};

/**
 * Middleware per gestire l'estrazione e il tracciamento dei file ZIP
 */
export const handleZipUpload = async (req: Request, res: Response, next: NextFunction) => {
  // Verifica se è stato caricato un file e se è un file ZIP
  if (!req.file || !req.file.originalname.toLowerCase().endsWith('.zip')) {
    return next();
  }

  try {
    const zipFilePath = req.file.path;
    const zipFileName = req.file.filename;
    const folderName = path.basename(zipFileName, '.zip');
    const extractDir = path.join(extractsBaseDir, folderName);

    // Estrai il file ZIP
    const extractedFiles = await extractZip(zipFilePath, extractDir);
    
    console.log(`File estratti (${extractedFiles.length}):`, extractedFiles);

    // Trova i file HTML nella directory estratta
    const htmlFiles = extractedFiles.filter(file => 
      file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.htm')
    );

    // Se non ci sono file HTML, continua normalmente
    if (htmlFiles.length === 0) {
      return next();
    }

    // Aggiungiamo il percorso di estrazione alla request
    req.extractedZipDir = extractDir;
    req.extractedZipFiles = extractedFiles;
    req.mainHtmlFile = htmlFiles[0]; // Prendiamo il primo file HTML come principale

    // Aggiorna le informazioni sul file
    const userId = req.body.userId || 1;
    
    // Registro i dettagli dell'estrazione nel database
    const fileEntries: InsertUploadedFile[] = [];
    
    // Aggiungi l'entry per il file ZIP originale
    fileEntries.push({
      filename: zipFileName,
      originalName: req.file.originalname,
      path: zipFilePath,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedById: userId,
      folderName: folderName
    });
    
    // Ottieni i percorsi relativi per i file estratti
    const relativeFiles: Record<string, string> = {};
    extractedFiles.forEach(fullPath => {
      const relativePath = path.relative(extractDir, fullPath);
      relativeFiles[path.basename(fullPath)] = relativePath;
    });
    
    // Imposta i dati da passare alle fasi successive
    req.uploadedFile = {
      filename: htmlFiles[0].replace(extractsBaseDir, '').replace(/^\/+/, ''),
      originalName: path.basename(htmlFiles[0]),
      path: htmlFiles[0],
      isExtracted: true,
      folderName: folderName,
    };
    
    req.folderName = folderName;
    req.folderPath = extractDir;
    req.fileStructure = relativeFiles;
    
    // Copia i file estratti nella cartella finale per il servizio
    const finalDir = path.join(process.cwd(), 'uploads', folderName);
    
    // Crea la cartella finale se non esiste
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    
    // Copia tutti i file mantenendo la struttura delle cartelle
    for (const extractedFilePath of extractedFiles) {
      const relativePath = path.relative(extractDir, extractedFilePath);
      const finalFilePath = path.join(finalDir, relativePath);
      
      // Crea la cartella di destinazione se necessaria
      const finalFileDir = path.dirname(finalFilePath);
      if (!fs.existsSync(finalFileDir)) {
        fs.mkdirSync(finalFileDir, { recursive: true });
      }
      
      // Copia il file
      try {
        fs.copyFileSync(extractedFilePath, finalFilePath);
        console.log(`File copiato: ${relativePath} -> ${finalFilePath}`);
      } catch (err) {
        console.error(`Errore copia file ${relativePath}:`, err);
      }
    }
    
    // Aggiorna l'URL del file HTML principale per usare la cartella finale
    const mainHtmlFilename = path.basename(htmlFiles[0]);
    const finalHtmlPath = path.join(finalDir, mainHtmlFilename);
    const viewerUrl = `/uploads/${folderName}/${mainHtmlFilename}`;
    req.viewerUrl = viewerUrl;
    
    console.log(`URL Visualizzatore aggiornato: ${viewerUrl}`);
    console.log(`File HTML principale copiato in: ${finalHtmlPath}`);
    console.log(`Totale file copiati: ${extractedFiles.length}`);

    next();
  } catch (err) {
    console.error('Errore nella gestione del file ZIP:', err);
    
    // In caso di errore, elimina il file ZIP e passa l'errore
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Errore nella cancellazione del file ZIP:', e);
      }
    }
    
    // Passa l'errore
    res.status(500).json({ 
      message: 'Errore nell\'elaborazione del file ZIP',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

/**
 * Middleware per gestire l'estrazione di ZIP come parte di un caricamento multiplo
 */
export const handleMultiZipUpload = async (req: Request, res: Response, next: NextFunction) => {
  // Verifica se ci sono file caricati
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return next();
  }
  
  // Filtra i file ZIP
  const zipFiles = (req.files as Express.Multer.File[]).filter(file => 
    file.originalname.toLowerCase().endsWith('.zip')
  );
  
  // Se non ci sono file ZIP, continua normalmente
  if (zipFiles.length === 0) {
    return next();
  }
  
  try {
    // Elabora tutti i file ZIP
    for (const zipFile of zipFiles) {
      const zipFilePath = zipFile.path;
      const zipFileName = zipFile.filename;
      const folderName = path.basename(zipFileName, '.zip');
      const extractDir = path.join(extractsBaseDir, folderName);
      
      // Estrai il file ZIP
      const extractedFiles = await extractZip(zipFilePath, extractDir);
      console.log(`File estratti da ${zipFileName} (${extractedFiles.length}):`, extractedFiles);
      
      // Memorizza le informazioni sull'estrazione
      if (!req.zipExtractions) {
        req.zipExtractions = [];
      }
      
      req.zipExtractions.push({
        zipFile,
        extractDir,
        extractedFiles,
        folderName
      });
    }
    
    next();
  } catch (err) {
    console.error('Errore nella gestione dei file ZIP multipli:', err);
    
    // In caso di errore, elimina i file ZIP e passa l'errore
    for (const zipFile of zipFiles) {
      if (zipFile.path && fs.existsSync(zipFile.path)) {
        try {
          fs.unlinkSync(zipFile.path);
        } catch (e) {
          console.error(`Errore nella cancellazione del file ZIP ${zipFile.originalname}:`, e);
        }
      }
    }
    
    // Passa l'errore
    res.status(500).json({ 
      message: 'Errore nell\'elaborazione dei file ZIP',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

// Estendi l'interfaccia Request di Express
declare global {
  namespace Express {
    interface Request {
      extractedZipDir?: string;
      extractedZipFiles?: string[];
      mainHtmlFile?: string;
      folderPath?: string;
      viewerUrl?: string;
      zipExtractions?: Array<{
        zipFile: Express.Multer.File;
        extractDir: string;
        extractedFiles: string[];
        folderName: string;
      }>;
    }
  }
}