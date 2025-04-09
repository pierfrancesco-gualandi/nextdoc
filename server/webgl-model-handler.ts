import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { uploadedFiles, type InsertUploadedFile } from '@shared/schema';

// Directory per i modelli WebGL
const uploadsDir = path.join(process.cwd(), 'uploads');

/**
 * Middleware per gestire i file di modelli 3D WebGL
 * Mantiene la struttura della cartella originale e il nome del file originale
 * Utilizzato per modelli 3D WebGL complessi che richiedono una struttura di file specifica
 */
export const handleWebGLModelUpload = async (req: Request, res: Response, next: NextFunction) => {
  // Se non abbiamo un file o se non è un file HTML/HTM, continua normalmente
  if (!req.file || !req.file.originalname.toLowerCase().match(/\.(html|htm)$/)) {
    return next();
  }

  // Verifica se la request include la proprietà webglModel = true
  if (!req.body.webglModel || req.body.webglModel !== 'true') {
    return next();
  }

  try {
    console.log('Gestione modello WebGL richiesta per:', req.file.originalname);

    // Origine e destinazione file
    const originalFile = req.file;
    const modelId = req.body.modelId || req.body.id || originalFile.originalname.replace(/\.(html|htm)$/i, '');
    
    const modelDir = path.join(uploadsDir, modelId);
    
    // Assicurati che la directory esista
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    // Crea anche le sottocartelle richieste
    if (!fs.existsSync(path.join(modelDir, 'res'))) {
      fs.mkdirSync(path.join(modelDir, 'res'), { recursive: true });
    }
    if (!fs.existsSync(path.join(modelDir, 'test'))) {
      fs.mkdirSync(path.join(modelDir, 'test'), { recursive: true });
    }

    // Percorso di destinazione per il file
    const destFilePath = path.join(modelDir, originalFile.originalname);
    
    // Copia il file nella nuova posizione con il nome originale
    fs.copyFileSync(originalFile.path, destFilePath);
    
    // Crea una copia con nome modelId.htm
    const modelIdFilePath = path.join(modelDir, `${modelId}.htm`);
    fs.copyFileSync(originalFile.path, modelIdFilePath);
    
    console.log(`File copiato da ${originalFile.path} a ${destFilePath}`);
    console.log(`Creata anche copia come ${modelIdFilePath}`);
    
    // Aggiorna le informazioni del file
    req.uploadedFile = {
      filename: path.relative(uploadsDir, destFilePath),
      originalName: originalFile.originalname,
      path: destFilePath,
      mimetype: originalFile.mimetype,
      size: originalFile.size,
      folderName: modelId,
      uploadedById: req.body.userId || 1
    };
    
    // Aggiorna le informazioni sulla cartella
    req.folderName = modelId;
    req.folderPath = modelDir;
    
    // Passa avanti per il salvataggio nel database
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

// Genera una struttura di file segnaposto se mancano file richiesti per modelli WebGL
export const initializeWebGLModelFiles = async (modelId: string): Promise<void> => {
  const modelDir = path.join(uploadsDir, modelId);
  
  // Verifica che la directory esista
  if (!fs.existsSync(modelDir)) {
    return;
  }
  
  // File richiesti per un modello WebGL
  const requiredFiles = [
    { path: 'iv3d.js', isText: true, content: '// Placeholder for iv3d.js' },
    { path: 'ivstyles.css', isText: true, content: '/* Placeholder for ivstyles.css */' },
    { path: 'scene.iv3d', isText: true, content: '<!-- Placeholder for scene.iv3d -->' },
    { path: 'treeicons.png', isText: false },
    { path: 'res/viewaxis.iv3d', isText: true, content: '<!-- Placeholder for viewaxis.iv3d -->' },
    { path: 'test/checkmark.png', isText: false },
    { path: 'test/cogwheel.png', isText: false },
    { path: 'test/ivtest.css', isText: true, content: '/* Placeholder for ivtest.css */' }
  ];
  
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
      webglModelId?: string;
    }
  }
}