import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { uploadedFiles, type InsertUploadedFile } from '@shared/schema';

// Cartella per i file estratti
const uploadsDir = path.join(process.cwd(), 'uploads');

/**
 * Estrae un file ZIP e salva i file estratti nel database
 * @param zipFilePath Percorso del file ZIP da estrarre
 * @param userId ID dell'utente che ha caricato il file
 * @returns Informazioni sui file estratti
 */
export async function extractZipFile(zipFilePath: string, userId: number = 1) {
  if (!fs.existsSync(zipFilePath)) {
    throw new Error(`Il file ZIP non esiste: ${zipFilePath}`);
  }

  try {
    // Leggi il file ZIP
    const zipData = fs.readFileSync(zipFilePath);
    const zip = new JSZip();
    
    // Carica il file ZIP
    const zipContents = await zip.loadAsync(zipData);
    
    // Crea una cartella basata sul nome del file ZIP
    const zipFileName = path.basename(zipFilePath, '.zip');
    const extractFolder = `${zipFileName}_${Date.now()}`;
    const extractPath = path.join(uploadsDir, extractFolder);
    
    // Crea la cartella se non esiste
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }
    
    // Array per memorizzare le informazioni sui file estratti
    const extractedFiles: any[] = [];
    const insertFileData: InsertUploadedFile[] = [];
    
    // Struttura dei file per mappare i percorsi originali
    const fileStructure: Record<string, string> = {};
    
    // Estrai tutti i file
    const filePromises = [];
    
    // Itera su tutti i file nel ZIP
    for (const [filename, zipEntry] of Object.entries(zipContents.files)) {
      // Salta le cartelle
      if (zipEntry.dir) continue;
      
      // Costruisci il percorso di destinazione
      const entryPath = path.join(extractPath, filename);
      const entryDir = path.dirname(entryPath);
      
      // Crea le sottocartelle necessarie
      if (!fs.existsSync(entryDir)) {
        fs.mkdirSync(entryDir, { recursive: true });
      }
      
      // Estrai il file
      const promise = zipEntry.async('nodebuffer').then(content => {
        // Scrivi il file sul disco
        fs.writeFileSync(entryPath, content);
        
        // Determina il MIME type
        let mimeType = 'application/octet-stream'; // Default
        const ext = path.extname(filename).toLowerCase();
        
        // Mappa delle estensioni comuni ai MIME type
        const mimeMap: Record<string, string> = {
          '.html': 'text/html',
          '.htm': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.json': 'application/json',
          '.glb': 'model/gltf-binary',
          '.gltf': 'model/gltf+json',
          '.jt': 'application/octet-stream', // JT files
          '.iv3d': 'application/octet-stream', // iv3d files
        };
        
        if (mimeMap[ext]) {
          mimeType = mimeMap[ext];
        }
        
        // Genera un nome file univoco per evitare collisioni
        const uniqueFilename = `${Date.now()}_${path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        // Percorso relativo alla cartella di estrazione
        const relativePath = path.join(extractFolder, filename);
        
        // Informazioni sul file estratto
        const fileInfo = {
          filename: uniqueFilename,
          originalName: path.basename(filename),
          path: entryPath,
          mimetype: mimeType,
          size: content.length,
          uploadedById: userId,
          folderName: extractFolder,
          relativePath: relativePath
        };
        
        // Aggiungi il file alla lista
        extractedFiles.push(fileInfo);
        
        // Prepara i dati per l'inserimento nel database
        insertFileData.push({
          filename: uniqueFilename,
          originalName: path.basename(filename),
          path: entryPath,
          mimetype: mimeType,
          size: content.length,
          uploadedById: userId,
          folderName: extractFolder
        });
        
        // Aggiungi alla struttura dei file
        fileStructure[path.basename(filename)] = relativePath;
        
        console.log(`File estratto: ${filename} → ${entryPath}`);
      });
      
      filePromises.push(promise);
    }
    
    // Attendi che tutti i file siano estratti
    await Promise.all(filePromises);
    
    // Salva le informazioni dei file nel database
    const savedFiles = await db.insert(uploadedFiles).values(insertFileData).returning();
    
    // Trova il file HTML principale
    const mainHtmlFile = savedFiles.find(file => 
      file.originalName.toLowerCase().endsWith('.html') || 
      file.originalName.toLowerCase().endsWith('.htm')
    );
    
    // Se non c'è un file HTML, verifica se c'è un file .JT o .GLB come principale
    const mainFile = mainHtmlFile || 
      savedFiles.find(file => file.originalName.toLowerCase().endsWith('.jt')) ||
      savedFiles.find(file => file.originalName.toLowerCase().endsWith('.glb')) ||
      savedFiles.find(file => file.originalName.toLowerCase().endsWith('.gltf')) ||
      savedFiles[0]; // Altrimenti usa il primo file
    
    // Restituisci le informazioni necessarie
    return {
      extractFolder,
      extractPath,
      mainFile,
      files: savedFiles,
      fileStructure
    };
  } catch (error) {
    console.error('Errore nell\'estrazione del file ZIP:', error);
    throw error;
  }
}

/**
 * Middleware per gestire il caricamento dei file ZIP
 */
export const handleZipUpload = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file || !req.file.path || !req.file.originalname.toLowerCase().endsWith('.zip')) {
    return next(); // Non è un file ZIP, passa al middleware successivo
  }

  try {
    const userId = req.body.userId || 1; // Default all'admin se non specificato
    const zipPath = req.file.path;
    
    console.log(`Elaborazione file ZIP: ${req.file.originalname}`);
    
    // Estrai il file ZIP
    const extractResult = await extractZipFile(zipPath, userId);
    
    // Aggiungi le informazioni alla richiesta
    req.uploadedFile = extractResult.mainFile;
    req.uploadedFiles = extractResult.files;
    req.folderName = extractResult.extractFolder;
    req.fileStructure = extractResult.fileStructure;
    
    // Continua con il middleware successivo
    next();
  } catch (error) {
    console.error('Errore nell\'elaborazione del file ZIP:', error);
    res.status(500).json({ message: 'Errore nell\'elaborazione del file ZIP', error });
  }
};