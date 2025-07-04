import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { Request, Response, NextFunction } from 'express';

// Estendi l'interfaccia Request per includere le proprietà personalizzate
declare global {
  namespace Express {
    interface Request {
      uploadedFile?: any;
      folderName?: string;
      folderPath?: string;
      viewerUrl?: string;
    }
  }
}

/**
 * Middleware semplificato per gestire i file ZIP senza duplicazioni
 * Estrae direttamente nella cartella finale mantenendo il nome originale
 */
export const handleSimpleZipUpload = async (req: Request, res: Response, next: NextFunction) => {
  // Verifica se è stato caricato un file ZIP
  if (!req.file || !req.file.originalname.toLowerCase().endsWith('.zip')) {
    return next();
  }

  try {
    const zipFilePath = req.file.path;
    // Usa il nome originale del file senza l'estensione
    const folderName = path.basename(req.file.originalname, '.zip');
    
    console.log(`Gestione ZIP semplificata: ${req.file.originalname} -> cartella: ${folderName}`);

    // Directory finale dove estrarre i file
    const finalDir = path.join(process.cwd(), 'uploads', folderName);
    
    // Elimina la cartella se esiste già
    if (fs.existsSync(finalDir)) {
      fs.rmSync(finalDir, { recursive: true, force: true });
    }
    
    // Crea la cartella finale
    fs.mkdirSync(finalDir, { recursive: true });
    
    // Estrai il ZIP in una cartella temporanea per gestire strutture annidate
    const tempDir = path.join(process.cwd(), 'uploads', `temp_${Date.now()}`);
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(tempDir, true);
    
    // Controlla se tutto è contenuto in una singola cartella
    const tempContents = fs.readdirSync(tempDir);
    let sourceDir = tempDir;
    
    if (tempContents.length === 1 && fs.statSync(path.join(tempDir, tempContents[0])).isDirectory()) {
      // Se c'è una sola cartella, usa quella come sorgente
      sourceDir = path.join(tempDir, tempContents[0]);
    }
    
    // Copia tutti i file dalla sorgente alla destinazione finale
    const copyRecursively = (src: string, dest: string) => {
      const items = fs.readdirSync(src);
      
      items.forEach(item => {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        
        if (fs.statSync(srcPath).isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copyRecursively(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      });
    };
    
    copyRecursively(sourceDir, finalDir);
    
    // Rimuovi la cartella temporanea
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    // Ottieni la lista dei file estratti (ora nella cartella finale)
    const getAllFiles = (dir: string): string[] => {
      const files: string[] = [];
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          files.push(...getAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      });
      
      return files;
    };
    
    const extractedFiles = getAllFiles(finalDir);

    // Trova i file HTML
    const htmlFiles = extractedFiles.filter(file => 
      file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.htm')
    );

    if (htmlFiles.length === 0) {
      console.log('Nessun file HTML trovato, non è un modello WebGL');
      return next();
    }

    // File HTML principale (cerca quello con il nome del modello)
    const mainHtmlFile = htmlFiles.find(file => 
      path.basename(file, path.extname(file)).toLowerCase() === folderName.toLowerCase()
    ) || htmlFiles[0];
    
    const mainHtmlFilename = path.basename(mainHtmlFile);
    
    // Imposta i dati per le fasi successive
    req.uploadedFile = {
      filename: `${folderName}/${mainHtmlFilename}`,
      originalName: req.file.originalname,
      path: mainHtmlFile,
      folderName: folderName,
    };
    
    req.folderName = folderName;
    req.folderPath = folderName;
    req.viewerUrl = `/uploads/${folderName}/${mainHtmlFilename}`;
    
    // Rimuovi il file ZIP temporaneo
    if (fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
    }
    
    console.log(`✓ ZIP estratto: ${extractedFiles.length} file in /uploads/${folderName}/`);
    console.log(`✓ File principale: ${mainHtmlFilename}`);
    console.log(`✓ URL: /uploads/${folderName}/${mainHtmlFilename}`);

    next();
  } catch (error) {
    console.error('Errore nell\'estrazione ZIP:', error);
    return res.status(500).json({ message: 'Errore nell\'estrazione del file ZIP' });
  }
};