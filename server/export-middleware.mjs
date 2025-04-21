/**
 * Middleware per l'esportazione del documento
 * Si occupa di intercettare e modificare l'esportazione HTML per gestire casi specifici
 */

import { generateSection21ComponentsTable, isSection21 } from './api/section21export.js';

/**
 * Middleware Express per intercettare le richieste di esportazione
 */
export const exportMiddleware = (req, res, next) => {
  // Permettiamo l'esecuzione normale del flusso
  next();
};

/**
 * Adatta i link ai modelli 3D per funzionare anche in formato HTML esportato
 * @param {string} html - HTML completo
 * @returns {string} - HTML con link corretti
 */
export const fixThreeDModels = (html) => {
  if (!html) return html;
  
  // Pattern per trovare i link al modello 3D
  const modelLinkPattern = /<a\s+href="[^"]*\/uploads\/A4B09778\/[^"]*"\s+class="download-button"[^>]*>[\s\S]*?Visualizza modello 3D[^<]*<\/a>/g;
  
  // Sostituisci con link al file ZIP e istruzioni
  const replacement = `
    <a href="A4B09778.zip" class="download-button" target="_blank" style="background-color: #0d7855;">
      <span class="download-icon">⬇</span> Scarica il modello 3D completo
    </a>
    <div class="model-instruction" style="margin-top: 10px;">
      <p><strong>Istruzioni:</strong></p>
      <ol style="text-align: left; margin-left: 20px;">
        <li>Scarica il file ZIP</li>
        <li>Estrai tutti i file in una cartella</li>
        <li>Apri il file "index.html" per visualizzare il modello</li>
      </ol>
    </div>
  `;
  
  // Sostituisci tutti i link
  return html.replace(modelLinkPattern, replacement);
};

/**
 * Processa l'HTML di una sezione specifica durante l'esportazione
 * @param {Object} sectionData - Dati della sezione
 * @param {string} html - HTML generato per la sezione 
 * @returns {string} - HTML eventualmente modificato
 */
export const processSectionExport = (sectionData, html) => {
  if (!sectionData || !html) return html;
  
  const { id, title } = sectionData;
  console.log(`Processando sezione per export: ID=${id}, titolo=${title}`);
  
  // Se è la sezione 2.1 DISEGNO 3D, sostituisci il contenuto BOM con quello fisso
  if (isSection21(id, title)) {
    console.log(`Sezione 2.1 DISEGNO 3D rilevata (ID=${id}), applicando tabella componenti specifica`);
    
    // Trova l'eventuale modulo BOM e sostituiscilo con la tabella fissa
    const bomRegex = /<div class="bom-container">[\s\S]*?<\/div>\s*<\/div>/g;
    
    // Se c'è un modulo BOM nella sezione, sostituiscilo
    if (bomRegex.test(html)) {
      console.log('Modulo BOM trovato nella sezione 2.1, sostituendo con tabella fissa');
      return html.replace(bomRegex, generateSection21ComponentsTable());
    } else {
      // Altrimenti aggiungi la tabella alla fine della sezione
      console.log('Nessun modulo BOM trovato nella sezione 2.1, aggiungendo tabella fissa');
      return html + generateSection21ComponentsTable();
    }
  }
  
  return html;
};

/**
 * Funzione principale per processare l'HTML del documento completo
 * @param {Object} documentData - Dati del documento
 * @param {Array} sectionsData - Dati delle sezioni
 * @param {string} html - HTML completo generato
 * @returns {string} - HTML eventualmente modificato
 */
export const processDocumentExport = (documentData, sectionsData, html) => {
  if (!html) return html;
  
  console.log(`Processando documento completo per export: ID=${documentData?.id}, titolo=${documentData?.title}`);
  
  // Trova la sezione 2.1 DISEGNO 3D
  const section21 = sectionsData.find(section => isSection21(section.id, section.title));
  
  if (section21) {
    console.log(`Sezione 2.1 trovata nel documento: ID=${section21.id}, titolo=${section21.title}`);
    
    // Pattern per trovare la sezione 2.1 nel documento HTML completo
    const sectionPattern = new RegExp(
      `<section id="section-${section21.id}"[^>]*>[\\s\\S]*?<\\/section>`, 'g'
    );
    
    // Estrai la sezione 2.1
    const sectionMatch = html.match(sectionPattern);
    
    if (sectionMatch && sectionMatch[0]) {
      const origSection = sectionMatch[0];
      const processedSection = processSectionExport(section21, origSection);
      
      // Se la sezione è stata modificata, sostituiscila nel documento
      if (processedSection !== origSection) {
        console.log(`Sostituendo sezione 2.1 (ID=${section21.id}) nel documento completo`);
        return html.replace(origSection, processedSection);
      }
    }
  }
  
  return html;
};