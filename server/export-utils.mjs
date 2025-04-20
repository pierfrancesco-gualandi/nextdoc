/**
 * Utility di supporto per l'esportazione dei documenti
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processDocumentExport } from './export-middleware.mjs';

// Ottieni la directory corrente
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Applica il middleware di post-processing all'HTML esportato
 * @param {Object} document - Dati del documento
 * @param {Array} sections - Dati delle sezioni
 * @param {string} html - HTML da processare
 * @returns {string} - HTML processato
 */
export const applyPostProcessing = (document, sections, html) => {
  console.log(`Post-processing per l'esportazione del documento ${document?.id}: ${document?.title}`);
  
  try {
    // Applica il middleware di esportazione
    return processDocumentExport(document, sections, html);
  } catch (error) {
    console.error('Errore durante il post-processing del documento:', error);
    return html; // In caso di errore, restituisci l'HTML originale
  }
};

/**
 * Salva l'HTML esportato su file temporaneo (per debugging)
 * @param {string} html - Contenuto HTML
 * @param {string} filename - Nome del file
 */
export const saveExportedHtml = (html, filename = 'exported-document.html') => {
  try {
    const outputPath = path.join(__dirname, '..', 'exports', filename);
    
    // Crea la directory exports se non esiste
    const exportsDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, html);
    console.log(`Documento HTML salvato in: ${outputPath}`);
  } catch (error) {
    console.error('Errore durante il salvataggio del documento HTML:', error);
  }
};