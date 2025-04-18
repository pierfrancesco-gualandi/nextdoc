/**
 * Utility per post-elaborare l'HTML esportato
 */

/**
 * Verifica se una sezione è la sezione 2.1 (disegno 3D)
 * @param {string} sectionId - ID della sezione
 * @param {string} sectionTitle - Titolo della sezione
 * @returns {boolean} - True se la sezione è 2.1/disegno 3D
 */
export function isSection21(sectionId, sectionTitle) {
  return sectionId === '16' || 
    (sectionTitle && (
      sectionTitle.toLowerCase().includes("2.1") || 
      sectionTitle.toLowerCase().includes("disegno 3d")
    ));
}

/**
 * Genera l'HTML per la tabella componenti della sezione 2.1
 * @returns {string} - HTML della tabella
 */
export function generateSection21ComponentsTable() {
  const components = [
    { 
      level: 3, 
      code: 'A8B25040509', 
      description: 'SHAFT Ø82 L=913',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C614-31', 
      description: 'BEARING SHAFT',
      quantity: 1
    },
    { 
      level: 3, 
      code: 'A8C624-54', 
      description: 'WASHER',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C624-55', 
      description: 'PRESSURE DISK',
      quantity: 1
    },
    { 
      level: 3, 
      code: 'A8C815-45', 
      description: 'END LID',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C815-48', 
      description: 'SHAFT',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C815-61', 
      description: 'WASHER, 030x5',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C910-7', 
      description: 'WHEEL',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C942-67', 
      description: 'WHEEL',
      quantity: 1 
    }
  ];

  return `
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
            <td class="level-${item.level}">${item.level}</td>
            <td>${item.code}</td>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Fissa i moduli di avviso per garantire testo bianco e stili corretti
 * @param {string} html - HTML da elaborare
 * @returns {string} - HTML elaborato
 */
export function fixWarningModules(html) {
  // Fix moduli PERICOLO (rosso)
  html = html.replace(
    /<div class="message danger">([\s\S]*?)<\/div>[\s\S]*?<\/div>/g, 
    '<div class="message danger" style="background-color:#ff0000; border-color:#ff0000; color:#ffffff;">$1</div></div>'
  );
  
  // Fix moduli AVVERTENZA (arancione)
  html = html.replace(
    /<div class="message warning">([\s\S]*?)<\/div>[\s\S]*?<\/div>/g, 
    '<div class="message warning" style="background-color:#ff8c00; border-color:#ff8c00; color:#ffffff;">$1</div></div>'
  );
  
  // Fix moduli NOTA (blu)
  html = html.replace(
    /<div class="message info">([\s\S]*?)<\/div>[\s\S]*?<\/div>/g, 
    '<div class="message info" style="background-color:#0070d1; border-color:#0070d1; color:#ffffff;">$1</div></div>'
  );
  
  // Fix header messaggi per garantire testo bianco
  html = html.replace(
    /<div class="message-header">([\s\S]*?)<\/div>/g, 
    '<div class="message-header" style="color:#ffffff;">$1</div>'
  );
  
  // Fix body messaggi per garantire testo bianco
  html = html.replace(
    /<div class="message-body">([\s\S]*?)<\/div>/g, 
    '<div class="message-body" style="color:#ffffff;">$1</div>'
  );
  
  return html;
}

/**
 * Sostituisce la tabella componenti nella sezione 2.1
 * @param {string} html - HTML da elaborare
 * @returns {string} - HTML elaborato
 */
export function fixSection21Components(html) {
  // Cerca <h2> o <h3> per sezione 2.1
  const sectionRegex = /<h[23] id="section-16"[^>]*>.*?2\.1.*?<\/h[23]>|<h[23][^>]*>.*?disegno 3d.*?<\/h[23]>/i;
  
  if (sectionRegex.test(html)) {
    console.log("Sezione 2.1 trovata - sostituendo tabella componenti");
    
    // Trova la tabella BOM dopo l'intestazione della sezione 2.1
    const bomContainerRegex = /<div class="bom-container">[\s\S]*?<h4 class="bom-title">Elenco Componenti<\/h4>[\s\S]*?<div class="bom-content">[\s\S]*?<table.*?>[\s\S]*?<\/table>[\s\S]*?<\/div>[\s\S]*?<\/div>/i;
    
    // Sostituzione con la tabella corretta
    const replacement = `
      <div class="bom-container">
        <h4 class="bom-title">Elenco Componenti</h4>
        <div class="bom-header">
        </div>
        <div class="bom-content">
          ${generateSection21ComponentsTable()}
        </div>
      </div>
    `;
    
    html = html.replace(bomContainerRegex, replacement);
  }
  
  return html;
}

/**
 * Elabora l'HTML esportato per correggere tutti i problemi
 * @param {string} html - HTML da elaborare
 * @returns {string} - HTML elaborato
 */
export function processExportedHtml(html) {
  // Correggi i moduli di avviso per garantire testo bianco
  html = fixWarningModules(html);
  
  // Sostituisci i componenti della sezione 2.1
  html = fixSection21Components(html);
  
  return html;
}