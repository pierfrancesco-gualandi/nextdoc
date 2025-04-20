/**
 * Utility per il post-processing HTML
 * Gestisce la sostituzione delle tabelle dei componenti nelle sezioni specifiche
 */
import fs from 'fs';
import path from 'path';
import { getSpecificComponentsForSection21 } from './api/section21components.js';

/**
 * Salva il file HTML esportato nella cartella exports
 * @param {string} html Contenuto HTML
 * @param {string} filename Nome del file
 * @returns {boolean} True se il salvataggio è avvenuto con successo
 */
export function saveExportedHtml(html, filename) {
  try {
    // Assicurati che la directory exports esista
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Scrivi il file
    const filepath = path.join(exportsDir, filename);
    fs.writeFileSync(filepath, html, 'utf8');
    console.log(`File HTML esportato salvato in: ${filepath}`);
    return true;
  } catch (error) {
    console.error('Errore nel salvataggio del file HTML:', error);
    return false;
  }
}

/**
 * Applica post-processing all'HTML prima dell'esportazione
 * - Sostituisce i componenti nella sezione 2.1 con quelli specifici
 * @param {object} document Documento
 * @param {array} sections Sezioni del documento
 * @param {string} html HTML originale
 * @returns {string} HTML processato
 */
export function applyPostProcessing(document, sections, html) {
  try {
    console.log("Applico post-processing all'HTML...");
    
    // Trova la sezione 2.1 Disegno 3D
    const section21 = sections.find(section => {
      // Verifica sia per ID che per titolo
      return (
        section.id === 16 || 
        section.id === 21 ||
        (section.title && section.title.includes('DISEGNO 3D')) ||
        (section.customNumber && (
          section.customNumber === '2.1' || 
          section.customNumber.includes('2.1')
        ))
      );
    });
    
    if (section21) {
      console.log("Sezione 2.1 DISEGNO 3D trovata, ID:", section21.id);
      
      // Ottieni i componenti specifici per la sezione 2.1
      const section21Components = getSpecificComponentsForSection21();
      
      if (section21Components && section21Components.length > 0) {
        // Genera la tabella HTML per i 9 componenti specifici
        const componentsTableHtml = generateComponentsTable(section21Components);
        
        // Cerca il punto nell'HTML dove inserire questa tabella
        const section21ContentRegex = new RegExp(`<section id="section-${section21.id}"[^>]*>([\\s\\S]*?)(?:<section id="section-|<\\/body>)`, 'i');
        const match = html.match(section21ContentRegex);
        
        if (match) {
          console.log("Sezione 2.1 trovata nell'HTML");
          
          // Verifica se esiste una tabella BOM nella sezione
          const bomTableRegex = /<div class="bom-container">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i;
          const sectionContent = match[1];
          const bomTableMatch = sectionContent.match(bomTableRegex);
          
          if (bomTableMatch) {
            console.log("Tabella BOM esistente trovata, procedo con la sostituzione");
            
            // Sostituisci la tabella BOM con quella specifica per la sezione 2.1
            const originalBomTable = bomTableMatch[0];
            const newContent = sectionContent.replace(originalBomTable, componentsTableHtml);
            
            // Sostituisci nella sezione
            const newSectionContent = `<section id="section-${section21.id}"${match[0].substring(
              match[0].indexOf('>'), 
              match[0].length - match[1].length
            )}${newContent}`;
            
            // Sostituisci nell'HTML
            html = html.replace(match[0], newSectionContent);
            console.log("Sostituzione completata con successo");
          } else {
            console.log("Nessuna tabella BOM trovata, aggiungo in fondo alla sezione");
            
            // Punto di inserimento: prima della chiusura della sezione
            const insertionPoint = match[0].length - match[1].length;
            const newSectionContent = match[0].substring(0, insertionPoint) + 
                                      componentsTableHtml + 
                                      match[0].substring(insertionPoint);
            
            // Sostituisci nell'HTML
            html = html.replace(match[0], newSectionContent);
            console.log("Aggiunta tabella completata con successo");
          }
        } else {
          console.warn("Sezione 2.1 non trovata nell'HTML, tabella non inserita");
        }
      } else {
        console.warn("Nessun componente specifico trovato per la sezione 2.1");
      }
    } else {
      console.log("Sezione 2.1 DISEGNO 3D non trovata nel documento");
    }
    
    return html;
  } catch (error) {
    console.error("Errore durante il post-processing HTML:", error);
    return html;  // Ritorna l'HTML originale in caso di errore
  }
}

/**
 * Genera l'HTML della tabella dei componenti per la sezione 2.1
 * @param {array} components Lista dei componenti
 * @returns {string} HTML della tabella
 */
function generateComponentsTable(components) {
  return `
    <div class="bom-container">
      <h4 class="bom-title">Elenco Componenti</h4>
      <div class="bom-header">
        <p class="bom-description">Componenti del disegno 3D</p>
      </div>
      
      <div class="bom-content">
        <table class="bom-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Livello</th>
              <th>Codice</th>
              <th>Descrizione</th>
              <th>Quantità</th>
            </tr>
          </thead>
          <tbody>
            ${components.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td class="level-${item.level || 3}">${item.level || 3}</td>
                <td>${item.code || '-'}</td>
                <td>${item.description || '-'}</td>
                <td>${item.quantity || 1}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}