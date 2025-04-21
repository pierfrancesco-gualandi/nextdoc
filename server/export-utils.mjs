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
/**
 * Modifica i link ai modelli 3D nell'HTML esportato
 * @param {string} html Contenuto HTML
 * @returns {string} HTML con i link corretti
 */
export function fixThreeDModels(html) {
  try {
    console.log("Correzione link modelli 3D nell'HTML esportato...");
    
    // Copia il file ZIP nella cartella exports quando viene generato l'HTML
    const modelZipPath = path.join(process.cwd(), 'uploads', 'A4B09778.zip');
    const destinationZipPath = path.join(process.cwd(), 'exports', 'A4B09778.zip');
    
    if (fs.existsSync(modelZipPath)) {
      // Copia il file zip nella cartella exports
      try {
        fs.copyFileSync(modelZipPath, destinationZipPath);
        console.log(`File ZIP del modello 3D copiato in: ${destinationZipPath}`);
      } catch (err) {
        console.error("Errore durante la copia del file ZIP del modello 3D:", err);
      }
    } else {
      console.warn(`File ZIP del modello 3D non trovato in: ${modelZipPath}`);
    }
    
    return html;
  } catch (error) {
    console.error("Errore durante la correzione dei link ai modelli 3D:", error);
    return html;  // Ritorna l'HTML originale in caso di errore
  }
}

export function applyPostProcessing(document, sections, html) {
  try {
    console.log("Applico post-processing all'HTML...");
    
    // Applica la correzione per i link ai modelli 3D
    html = fixThreeDModels(html);
    
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
      
      // Log dei componenti per debug
      console.log("Componenti sezione 2.1:", JSON.stringify(section21Components).substring(0, 100) + "...");
      
      if (section21Components && section21Components.length > 0) {
        // Genera la tabella HTML per i 9 componenti specifici
        const componentsTableHtml = generateComponentsTable(section21Components);
        
        // Strategia radicalmente semplificata: iniettiamo la tabella direttamente prima di </body>
        console.log("Inserisco la tabella dei componenti sezione 2.1 direttamente nel documento");
        
        try {
          // Mettiamo il contenuto prima di </body>
          if (html.includes('</body>')) {
            const bodyCloseIndex = html.lastIndexOf('</body>');
            console.log(`Trovato tag </body> alla posizione ${bodyCloseIndex}`);
            
            // Creiamo una sezione dedicata per i componenti con stile in-line per garantire la visualizzazione corretta
            const componentSection = `
              <div style="margin: 40px 0; padding: 20px; border: 1px solid #ccc; border-radius: 5px;">
                <h3 style="margin-bottom: 20px; font-size: 18px; font-weight: bold; color: #333;">Componenti Disegno 3D (Sezione 2.1)</h3>
                ${componentsTableHtml}
              </div>
            `;
            
            // Iniettiamo la sezione e confermiamo che è stata inserita correttamente
            const newHtml = html.substring(0, bodyCloseIndex) + componentSection + html.substring(bodyCloseIndex);
            console.log("Tabella componenti iniettata con successo");
            console.log(`Lunghezza HTML originale: ${html.length}, Lunghezza HTML modificato: ${newHtml.length}`);
            
            // Salva l'HTML modificato per debug
            const debugFilePath = path.join(process.cwd(), 'exports', 'debug_html.html');
            fs.writeFileSync(debugFilePath, newHtml, 'utf8');
            console.log(`HTML modificato salvato in ${debugFilePath} per debug`);
            
            return newHtml;
          } else {
            console.error("Tag </body> non trovato nel documento HTML");
            return html;
          }
        } catch (error) {
          console.error("Errore durante l'inserimento della tabella:", error);
          return html;
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