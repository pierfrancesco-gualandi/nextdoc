import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { db } from '../db';
import { uploadedFiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);

const rootPath = path.resolve(process.cwd());
const uploadsPath = path.join(rootPath, 'uploads');

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
  mimeType?: string;
}

/**
 * Elenca i file e le cartelle in un determinato percorso
 */
export const listFiles = async (req: Request, res: Response) => {
  try {
    // Ottieni il percorso dalla query
    let requestedPath = req.query.path ? String(req.query.path) : '/uploads';
    
    // Normalizza e sanitizza il percorso per evitare traversal
    if (!requestedPath.startsWith('/uploads')) {
      requestedPath = '/uploads';
    }
    
    // Rimuovi il leading slash per il percorso relativo
    const relativePath = requestedPath.replace(/^\//, '');
    
    // Costruisci il percorso completo
    const fullPath = path.join(rootPath, relativePath);
    
    // Controlla che il percorso esista
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Percorso non trovato' });
    }
    
    // Controlla che sia una directory
    if (!fs.statSync(fullPath).isDirectory()) {
      return res.status(400).json({ error: 'Il percorso non è una directory' });
    }
    
    // Leggi i contenuti della directory
    const items = fs.readdirSync(fullPath, { withFileTypes: true });
    
    // Prepara l'array dei risultati
    const files: FileInfo[] = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item.name);
        const stats = fs.statSync(itemPath);
        const relativePath = '/' + path.relative(rootPath, itemPath).replace(/\\/g, '/');
        
        let mimeType = undefined;
        
        // Se è un file, prova a determinare il MIME type
        if (!item.isDirectory()) {
          try {
            const { stdout } = await execAsync(`file --mime-type -b "${itemPath}"`);
            mimeType = stdout.trim();
          } catch (error) {
            console.error(`Errore nel determinare il MIME type per ${itemPath}:`, error);
            // Per i file HTML/HTM impostiamo manualmente
            if (item.name.endsWith('.html') || item.name.endsWith('.htm')) {
              mimeType = 'text/html';
            }
          }
        }
        
        return {
          name: item.name,
          path: relativePath,
          isDirectory: item.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
          mimeType
        };
      })
    );
    
    // Filtra i file temporanei o con pattern specifici se necessario
    const filteredFiles = files.filter(file => 
      // Mantieni solo le cartelle e alcuni tipi di file
      file.isDirectory || 
      file.name.endsWith('.htm') || 
      file.name.endsWith('.html') ||
      file.name.endsWith('.js') || 
      file.name.endsWith('.css') || 
      file.name.endsWith('.png') || 
      file.name.endsWith('.jpg') || 
      file.name.endsWith('.jpeg') ||
      file.name.endsWith('.glb') ||
      file.name.endsWith('.gltf')
    );
    
    res.json(filteredFiles);
  } catch (error) {
    console.error('Errore nella lista dei file:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

/**
 * Crea una nuova struttura di cartelle per un modello 3D
 */
export const createModelFolder = async (req: Request, res: Response) => {
  try {
    // Ottieni il nome della cartella dal body
    const { folderName, sourceModelName } = req.body;
    
    if (!folderName || typeof folderName !== 'string') {
      return res.status(400).json({ error: 'Nome cartella non valido' });
    }
    
    // Normalizza il nome della cartella
    const sanitizedFolderName = folderName.trim().replace(/[^a-zA-Z0-9-_]/g, '');
    
    if (sanitizedFolderName.length === 0) {
      return res.status(400).json({ error: 'Nome cartella non valido dopo la sanitizzazione' });
    }
    
    // Percorso della nuova cartella
    const newFolderPath = path.join(uploadsPath, sanitizedFolderName);
    
    // Verifica se la cartella esiste già
    if (fs.existsSync(newFolderPath)) {
      return res.status(409).json({ error: 'Una cartella con questo nome esiste già' });
    }
    
    // Crea la cartella
    fs.mkdirSync(newFolderPath, { recursive: true });
    
    // Nome del file HTM principale
    const htmlFileName = `${sanitizedFolderName}.htm`;
    const htmlFilePath = path.join(newFolderPath, htmlFileName);
    
    // Crea un file HTML minimale
    fs.writeFileSync(htmlFilePath, `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Modello 3D: ${sanitizedFolderName}</title>
  <script src="iv3d.js"></script>
  <link rel="stylesheet" href="ivstyles.css">
</head>
<body>
  <div id="model-container" style="width: 100%; height: 600px;">
    <!-- Contenitore per il modello 3D -->
  </div>
  <script>
    // Placeholder per inizializzazione modello 3D
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Modello 3D: ${sanitizedFolderName}');
    });
  </script>
</body>
</html>`);
    
    // Struttura di file richiesti
    const requiredStructure = [
      { path: 'res', isDirectory: true },
      { path: 'test', isDirectory: true },
      { path: 'treeview', isDirectory: true }
    ];
    
    // Crea le directory richieste
    for (const item of requiredStructure) {
      if (item.isDirectory) {
        fs.mkdirSync(path.join(newFolderPath, item.path), { recursive: true });
      }
    }
    
    let filesCopied = false;
    
    // Se è specificata una cartella sorgente, copia i file da essa
    if (sourceModelName && typeof sourceModelName === 'string') {
      const sourceFolderPath = path.join(uploadsPath, sourceModelName);
      
      if (fs.existsSync(sourceFolderPath) && fs.statSync(sourceFolderPath).isDirectory()) {
        // Copia i file di supporto dalla cartella sorgente
        const sourceFiles = [
          'iv3d.js',
          'ivstyles.css',
          'scene.iv3d',
          'treeicons.png'
        ];
        
        for (const file of sourceFiles) {
          const sourceFilePath = path.join(sourceFolderPath, file);
          const destFilePath = path.join(newFolderPath, file);
          
          if (fs.existsSync(sourceFilePath)) {
            fs.copyFileSync(sourceFilePath, destFilePath);
            filesCopied = true;
          }
        }
        
        // Copia le sottocartelle
        const subfolders = ['res', 'test'];
        
        for (const folder of subfolders) {
          const sourceFolderPath = path.join(uploadsPath, sourceModelName, folder);
          const destFolderPath = path.join(newFolderPath, folder);
          
          if (fs.existsSync(sourceFolderPath) && fs.statSync(sourceFolderPath).isDirectory()) {
            // Copia ricorsivamente i file nella sottocartella
            const files = fs.readdirSync(sourceFolderPath);
            
            for (const file of files) {
              const sourceFilePath = path.join(sourceFolderPath, file);
              const destFilePath = path.join(destFolderPath, file);
              
              if (fs.statSync(sourceFilePath).isFile()) {
                fs.copyFileSync(sourceFilePath, destFilePath);
                filesCopied = true;
              }
            }
          }
        }
      }
    }
    
    // Se non abbiamo copiato i file, creiamo dei segnaposto
    if (!filesCopied) {
      // Copia treeicons.png dalla cartella di riferimento A4B09778
      // Questo file è essenziale per il funzionamento del visualizzatore
      const referenceTreeIconsPath = path.join(uploadsPath, 'A4B09778', 'treeicons.png');
      const treeiconsDestPath = path.join(newFolderPath, 'treeicons.png');
      
      if (fs.existsSync(referenceTreeIconsPath)) {
        try {
          // Copia il file di riferimento
          fs.copyFileSync(referenceTreeIconsPath, treeiconsDestPath);
          console.log('File treeicons.png copiato dalla cartella di riferimento');
        } catch (err) {
          console.error('Errore nella copia di treeicons.png:', err);
        }
      }
      
      // File segnaposto per gli altri file di supporto richiesti
      const placeholderFiles = [
        { path: 'iv3d.js', content: '// File di supporto iv3d.js mancante - Il modello potrebbe non funzionare correttamente' },
        { path: 'ivstyles.css', content: '/* File di supporto ivstyles.css mancante - Il modello potrebbe non funzionare correttamente */' },
        { path: 'scene.iv3d', content: '<!-- File di supporto scene.iv3d mancante - Il modello potrebbe non funzionare correttamente -->' },
        { path: 'res/viewaxis.iv3d', content: '<!-- File di supporto viewaxis.iv3d mancante - Il modello potrebbe non funzionare correttamente -->' },
        { path: 'test/checkmark.png', content: '' }, // File binario vuoto
        { path: 'test/cogwheel.png', content: '' }, // File binario vuoto
        { path: 'test/ivtest.css', content: '/* File di supporto ivtest.css mancante - Il modello potrebbe non funzionare correttamente */' }
      ];
      
      // Crea tutti i file segnaposto
      for (const file of placeholderFiles) {
        const filePath = path.join(newFolderPath, file.path);
        const fileDir = path.dirname(filePath);
        
        // Crea la directory se non esiste
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        // Crea il file segnaposto
        fs.writeFileSync(filePath, file.content);
      }
    }
    
    // Crea il record nel database per il file HTM principale
    try {
      const userId = req.user?.id || 1; // Usa l'ID utente corrente o default a 1
      
      const [newFile] = await db.insert(uploadedFiles).values({
        filename: `${sanitizedFolderName}/${htmlFileName}`,
        originalName: htmlFileName,
        path: htmlFilePath,
        mimetype: 'text/html',
        size: fs.statSync(htmlFilePath).size,
        uploadedById: userId,
        folderName: sanitizedFolderName,
      }).returning();
      
      console.log(`File principale del modello creato nel database: ${htmlFilePath}`);
      
      res.status(201).json({
        success: true,
        folderName: sanitizedFolderName,
        fileUrl: `/uploads/${sanitizedFolderName}/${htmlFileName}`,
        file: newFile
      });
    } catch (dbError) {
      console.error('Errore nel salvataggio del file nel database:', dbError);
      // Anche se c'è un errore nel database, non fallire completamente l'operazione
      // poiché i file sono stati comunque creati correttamente
      res.status(201).json({
        success: true,
        folderName: sanitizedFolderName,
        fileUrl: `/uploads/${sanitizedFolderName}/${htmlFileName}`,
        dbError: 'Errore nel salvataggio del file nel database'
      });
    }
  } catch (error) {
    console.error('Errore nella creazione della cartella del modello:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};