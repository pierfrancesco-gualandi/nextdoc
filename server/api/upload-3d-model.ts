import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { uploadedFiles, insertUploadedFileSchema } from '@shared/schema';
import AdmZip from 'adm-zip';

// Directory per i file caricati
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurazione per il caricamento dei file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Salva inizialmente nella cartella uploads
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Usa il nome originale per i file di modelli 3D
    cb(null, file.originalname);
  }
});

export const upload3DModel = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // Limite di 100MB per i file
  }
}).fields([
  { name: 'mainFile', maxCount: 1 }, // File principale del modello
  { name: 'supportFiles', maxCount: 50 } // File di supporto
]);

// Estrae il nome del modello 3D dal nome del file HTML
const extract3DModelName = (filename: string): string | null => {
  // Pattern per identificare i nomi dei modelli 3D (es. A4B10789.htm, A5B43041.htm)
  const modelPattern = /^([A-Z]\d[A-Z]\d+)\.(?:htm|html)$/i;
  const match = filename.match(modelPattern);
  console.log("Estrazione nome modello da:", filename, "risultato:", match ? match[1] : "null");
  return match ? match[1] : null;
};

/**
 * Handler per il caricamento di modelli 3D
 */
export const handle3DModelUpload = async (req: Request, res: Response) => {
  // Verifica i file caricati
  if (!req.files || typeof req.files !== 'object') {
    return res.status(400).json({ message: 'Nessun file caricato' });
  }

  try {
    const mainFiles = req.files['mainFile'] as Express.Multer.File[];
    const supportFiles = req.files['supportFiles'] as Express.Multer.File[] || [];

    if (!mainFiles || mainFiles.length === 0) {
      return res.status(400).json({ message: 'File principale del modello 3D mancante' });
    }

    // Prendiamo il primo file principale
    const mainFile = mainFiles[0];
    console.log('Gestione modello 3D - File principale:', mainFile.originalname);

    // Estrai il nome del modello o usa quello fornito
    let folderName = req.body.folderName || '';
    
    // Se non è stato fornito un nome cartella, prova a estrarlo dal nome file
    if (!folderName && mainFile.originalname.toLowerCase().match(/\.(html|htm)$/)) {
      const extractedName = extract3DModelName(mainFile.originalname);
      if (extractedName) {
        folderName = extractedName;
        console.log('Nome cartella estratto automaticamente:', folderName);
      } else {
        // Usa il nome file senza estensione
        folderName = mainFile.originalname.replace(/\.[^/.]+$/, "");
        console.log('Usando nome file senza estensione come nome cartella:', folderName);
      }
    }

    // Crea la cartella per il modello
    const modelDir = path.join(uploadsDir, folderName);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    // Crea le sottocartelle necessarie
    const subfolders = ["res", "test", "treeview"];
    for (const subfolder of subfolders) {
      const subfolderPath = path.join(modelDir, subfolder);
      if (!fs.existsSync(subfolderPath)) {
        fs.mkdirSync(subfolderPath, { recursive: true });
      }
    }

    // Salva il file principale nella cartella del modello
    const mainFileDestName = `${folderName}.htm`;
    const mainFileDest = path.join(modelDir, mainFileDestName);
    fs.copyFileSync(mainFile.path, mainFileDest);
    console.log(`File principale copiato in ${mainFileDest}`);

    // Copia anche i file di supporto nella cartella del modello
    for (const supportFile of supportFiles) {
      const supportFileDest = path.join(modelDir, supportFile.originalname);
      fs.copyFileSync(supportFile.path, supportFileDest);
      console.log(`File di supporto copiato in ${supportFileDest}`);
    }

    // Opzionalmente, gestisci i file ZIP se presenti
    for (const supportFile of supportFiles) {
      if (supportFile.originalname.toLowerCase().endsWith('.zip')) {
        try {
          console.log(`Estrazione del file ZIP: ${supportFile.originalname}`);
          const zip = new AdmZip(supportFile.path);
          zip.extractAllTo(modelDir, true);
          console.log(`ZIP estratto in ${modelDir}`);
        } catch (err) {
          console.error('Errore durante l\'estrazione del file ZIP:', err);
        }
      }
    }

    // Costruisci il percorso di accesso relativo
    const relativeModelPath = path.join(folderName, mainFileDestName);
    const accessPath = `/uploads/${relativeModelPath}`;
    console.log('Percorso di accesso al modello:', accessPath);

    // Registra il file nel database
    const fileInfo = {
      filename: relativeModelPath,
      originalName: mainFile.originalname,
      path: mainFileDest,
      mimetype: mainFile.mimetype,
      size: mainFile.size,
      folderName,
      uploadedById: req.body.userId || 1
    };

    const insertedFile = await db.insert(uploadedFiles)
      .values(fileInfo)
      .returning();

    // Pulisci i file temporanei
    try {
      fs.unlinkSync(mainFile.path);
      for (const supportFile of supportFiles) {
        fs.unlinkSync(supportFile.path);
      }
    } catch (err) {
      console.error('Errore durante la pulizia dei file temporanei:', err);
    }

    // Restituisci le informazioni sul modello 3D
    return res.status(201).json({
      id: insertedFile[0].id,
      filename: relativeModelPath,
      folderName,
      url: accessPath,
      filesCount: 1 + supportFiles.length,
      mainFile: mainFile.originalname,
      supportFiles: supportFiles.map(f => f.originalname)
    });
  } catch (error) {
    console.error('Errore durante la gestione del modello 3D:', error);
    return res.status(500).json({ 
      message: 'Errore durante il caricamento del modello 3D', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};