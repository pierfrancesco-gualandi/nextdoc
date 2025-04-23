import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { uploadedFiles, type InsertUploadedFile } from '@shared/schema';

// Directory per i modelli WebGL
const uploadsDir = path.join(process.cwd(), 'uploads');

// Estrae il nome del modello 3D dal nome del file HTML
const extract3DModelName = (filename: string): string | null => {
  // Pattern per identificare i nomi dei modelli 3D (es. A4B10789.htm, A5B43041.htm)
  const modelPattern = /^([A-Z]\d[A-Z]\d+)\.(?:htm|html)$/i;
  const match = filename.match(modelPattern);
  console.log("Estrazione nome modello da:", filename, "risultato:", match ? match[1] : "null");
  return match ? match[1] : null;
};

/**
 * Middleware per gestire i file di modelli 3D WebGL
 * Mantiene la struttura della cartella originale e il nome del file originale
 * Utilizzato per modelli 3D WebGL complessi che richiedono una struttura di file specifica
 */
export const handleWebGLModelUpload = async (req: Request, res: Response, next: NextFunction) => {
  // Se non abbiamo un file, continua normalmente
  if (!req.file) {
    return next();
  }

  // Verifica se è un file HTML/HTM
  const isHtmlFile = req.file.originalname.toLowerCase().match(/\.(html|htm)$/);
  
  // Verifica se la request include la proprietà webglModel = true o è un file HTML/HTM
  // I file HTML/HTM sono sempre considerati potenziali modelli 3D WebGL
  const is3DModel = req.body.webglModel === 'true' || isHtmlFile;

  if (!is3DModel) {
    return next();
  }

  try {
    // Il file è un modello 3D HTML
    console.log('File upload - Nome:', req.file.originalname, 'Estensione:', path.extname(req.file.originalname), 'Tipo MIME:', req.file.mimetype);
    
    // Origine e destinazione file
    const originalFile = req.file;
    
    // Estrai il nome del modello dal file HTML
    let modelName = null;
    
    // Se è un file HTML/HTM, prova ad estrarre il nome del modello
    if (isHtmlFile) {
      modelName = extract3DModelName(originalFile.originalname);
      if (modelName) {
        console.log('Rilevato automaticamente modello 3D:', modelName, 'dal nome file', originalFile.originalname);
      }
    }
    
    // Usa il nome modello fornito o il nome estratto dal file o il nome file senza estensione
    const folderName = req.body.folderName || modelName || originalFile.originalname.replace(/\.(html|htm)$/i, '');
    
    console.log('Upload file singolo:', {
      originalName: originalFile.originalname,
      is3DModel: !!is3DModel,
      webglModel: req.body.webglModel,
      is3DModelParam: req.body.is3DModel,
      folderName: req.body.folderName || null,
      modelNameFromFileName: modelName
    });
    
    // Se è un modello 3D riconosciuto, avvia il processo di organizzazione in cartelle
    if (folderName) {
      console.log('Rilevato modello 3D:', folderName, 'da file', originalFile.originalname);
      console.log('Preparazione cartella per modello 3D:', folderName);
      
      const modelDir = path.join(uploadsDir, folderName);
      
      // Assicurati che la directory esista
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
      
      // Crea il percorso relativo per il file HTML
      const relativeModelPath = path.join(folderName, `${folderName}.htm`);
      console.log("Path relativo modello:", relativeModelPath);
      
      // Percorso di destinazione per il file HTML principale
      const destFilePath = path.join(modelDir, `${folderName}.htm`);
      
      // Copia il file nella nuova posizione con il nome standardizzato
      fs.copyFileSync(originalFile.path, destFilePath);
      console.log(`File copiato da ${originalFile.path} a ${destFilePath}`);
      
      // Aggiorna le informazioni del file
      req.uploadedFile = {
        filename: relativeModelPath,
        originalName: originalFile.originalname,
        path: destFilePath,
        mimetype: originalFile.mimetype,
        size: originalFile.size,
        folderName: folderName,
        uploadedById: req.body.userId || 1
      };
      
      // Aggiorna le informazioni sulla cartella
      req.folderName = folderName;
      req.viewerUrl = `/uploads/${relativeModelPath}`;
      
      // Genera file segnaposto
      initializeWebGLModelFiles(folderName);
      
      // Passa avanti per il salvataggio nel database
      next();
      return;
    }
    
    // Se non è un modello 3D riconosciuto o non ha un folderName, trattalo come un file normale
    // Passa avanti per essere gestito dal flusso standard
    next();
  } catch (err) {
    console.error('Errore nella gestione del modello WebGL:', err);
    
    // In caso di errore, elimina il file e passa l'errore
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Errore nella cancellazione del file temporaneo:', e);
      }
    }
    
    res.status(500).json({ 
      message: 'Errore nella gestione del modello WebGL',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

// Cerca i file di supporto per i modelli 3D e li copia nella cartella di destinazione
export const initializeWebGLModelFiles = (folderName: string, sourceDir?: string): void => {
  const modelDir = path.join(uploadsDir, folderName);
  
  // Verifica che la directory esista
  if (!fs.existsSync(modelDir)) {
    return;
  }
  
  // Utilizza la cartella di origine specificata, se fornita
  if (sourceDir && fs.existsSync(sourceDir)) {
    console.log(`Utilizzo della cartella di origine specificata: ${sourceDir}`);
    
    try {
      // Copia i file dalla cartella di origine specificata alla cartella di destinazione
      const sourceFiles = fs.readdirSync(sourceDir, { withFileTypes: true });
      
      for (const dirent of sourceFiles) {
        const sourcePath = path.join(sourceDir, dirent.name);
        const destPath = path.join(modelDir, dirent.name);
        
        // Salta il file .htm principale che è già stato copiato
        if (dirent.name === `${folderName}.htm`) {
          continue;
        }
        
        if (dirent.isDirectory()) {
          // Copia ricorsivamente le directory
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          
          const nestedFiles = fs.readdirSync(sourcePath, { withFileTypes: true });
          for (const nestedFile of nestedFiles) {
            const nestedSourcePath = path.join(sourcePath, nestedFile.name);
            const nestedDestPath = path.join(destPath, nestedFile.name);
            
            if (nestedFile.isFile()) {
              fs.copyFileSync(nestedSourcePath, nestedDestPath);
              console.log(`Copiato file di supporto: ${nestedSourcePath} -> ${nestedDestPath}`);
            }
          }
        } else if (dirent.isFile()) {
          // Copia i file
          fs.copyFileSync(sourcePath, destPath);
          console.log(`Copiato file di supporto: ${sourcePath} -> ${destPath}`);
        }
      }
      
      console.log(`File di supporto copiati da ${sourceDir} a ${modelDir}`);
      return;
    } catch (err) {
      console.error(`Errore durante la copia dei file dalla cartella di origine specificata: ${err}`);
    }
  }
  
  // File richiesti per un modello WebGL
  const requiredFiles = [
    { path: 'iv3d.js', isText: true, content: '// File di supporto iv3d.js mancante - Il modello potrebbe non funzionare correttamente' },
    { path: 'ivstyles.css', isText: true, content: '/* File di supporto ivstyles.css mancante - Il modello potrebbe non funzionare correttamente */' },
    { path: 'scene.iv3d', isText: true, content: '<!-- File di supporto scene.iv3d mancante - Il modello potrebbe non funzionare correttamente -->' },
    { path: 'treeicons.png', isText: false },
    { path: 'res/viewaxis.iv3d', isText: true, content: '<!-- File di supporto viewaxis.iv3d mancante - Il modello potrebbe non funzionare correttamente -->' },
    { path: 'test/checkmark.png', isText: false },
    { path: 'test/cogwheel.png', isText: false },
    { path: 'test/ivtest.css', isText: true, content: '/* File di supporto ivtest.css mancante - Il modello potrebbe non funzionare correttamente */' }
  ];
  
  // Se non abbiamo trovato file di supporto appropriati, creiamo segnaposto
  // ma con messaggi di avviso chiari
  console.log(`Nessun file di supporto trovato per il modello ${folderName}, creazione segnaposto`);
  
  // Crea i file mancanti
  for (const file of requiredFiles) {
    const filePath = path.join(modelDir, file.path);
    const fileDir = path.dirname(filePath);
    
    // Crea la directory se non esiste
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    
    // Crea il file se non esiste
    if (!fs.existsSync(filePath)) {
      if (file.isText && file.content) {
        fs.writeFileSync(filePath, file.content);
      } else {
        // Per i file binari, crea un file vuoto
        fs.writeFileSync(filePath, '');
      }
      console.log(`Creato file segnaposto: ${filePath}`);
    }
  }
};

// Estendi l'interfaccia Request di Express
declare global {
  namespace Express {
    interface Request {
      viewerUrl?: string;
      folderName?: string;
      folderPath?: string;
      uploadedFile?: InsertUploadedFile;
      uploadedFiles?: InsertUploadedFile[];
      fileStructure?: Record<string, string>;
    }
  }
}