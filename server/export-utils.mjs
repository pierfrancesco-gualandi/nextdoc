/**
 * Utilità per il post-processing degli export HTML e la gestione di componenti specifici per sezione
 */

/**
 * Controlla se una sezione è la sezione 2.1
 * @param {string} sectionTitle - Titolo della sezione
 * @returns {boolean} - True se è la sezione 2.1
 */
export function isSection21(sectionTitle) {
  return /^2\.1\s/.test(sectionTitle);
}

/**
 * Restituisce i componenti fissi per la sezione 2.1
 * @returns {Array} - Array di componenti per la sezione 2.1
 */
export function getSection21Components() {
  // Gli 9 componenti specificati per la sezione 2.1
  return [
    { code: "A8B25040509", description: "SHAFT Ø82 L=913", quantity: 1 },
    { code: "A8C614-31", description: "BEARING SHAFT", quantity: 1 },
    { code: "A8C624-54", description: "WASHER", quantity: 1 },
    { code: "A8C624-55", description: "PRESSURE DISK", quantity: 1 },
    { code: "A8C815-45", description: "END LID", quantity: 1 },
    { code: "A8C815-48", description: "SHAFT", quantity: 1 },
    { code: "A8C815-61", description: "WASHER, 030x5", quantity: 1 },
    { code: "A8C910-7", description: "WHEEL", quantity: 1 },
    { code: "A8C942-67", description: "WHEEL", quantity: 1 }
  ];
}

/**
 * Post-processa l'HTML esportato per correggere problemi di visualizzazione
 * @param {string} html - HTML originale
 * @returns {string} - HTML post-processato
 */
export function postProcessExportHtml(html) {
  if (!html) return html;
  
  // Correzione dei moduli di avviso per garantire il testo bianco
  html = fixWarningModuleStyles(html);
  
  // Correzione delle liste di componenti per la sezione 2.1
  html = fixSection21Components(html);
  
  return html;
}

/**
 * Corregge gli stili dei moduli di avviso per garantire testo bianco
 * @param {string} html - HTML originale
 * @returns {string} - HTML con stili corretti
 */
export function fixWarningModuleStyles(html) {
  // Sostituisce gli stili inline nei div con classe warning-module
  return html.replace(
    /<div class="warning-module ([^"]+)"[^>]*style="([^"]*)"/g, 
    (match, warningType, style) => {
      // Aggiungi color: white al style esistente
      const newStyle = `${style}; color: white !important; border-color: inherit !important;`;
      return `<div class="warning-module ${warningType}" style="${newStyle}"`;
    }
  ).replace(
    /<div class="warning-title"[^>]*style="([^"]*)"/g,
    (match, style) => {
      // Aggiungi color: white allo stile del titolo
      const newStyle = `${style}; color: white !important;`;
      return `<div class="warning-title" style="${newStyle}"`;
    }
  ).replace(
    /<div class="warning-message"[^>]*style="([^"]*)"/g,
    (match, style) => {
      // Aggiungi color: white allo stile del messaggio
      const newStyle = `${style}; color: white !important;`;
      return `<div class="warning-message" style="${newStyle}"`;
    }
  ).replace(
    /<i class="warning-icon[^"]*"[^>]*style="([^"]*)"/g,
    (match, style) => {
      // Aggiungi color: white per le icone
      const newStyle = `${style}; color: white !important;`;
      return `<i class="warning-icon" style="${newStyle}"`;
    }
  );
}

/**
 * Rileva la sezione 2.1 e sostituisce la tabella dei componenti con i componenti fissi
 * @param {string} html - HTML originale
 * @returns {string} - HTML con tabella componenti corretta
 */
export function fixSection21Components(html) {
  // Trova la sezione 2.1 - usa un pattern più flessibile per catturare diverse varianti
  // Può essere <h2>2.1 Disegno 3D</h2> oppure <h3 class="section-title"><span class="section-number">2.1</span> Disegno 3D</h3>
  const section21Patterns = [
    /<h[1-6][^>]*>(?:\s*2\.1\s|.*?<span[^>]*>\s*2\.1\s*<\/span>).*?<\/h[1-6]>/i,
    /<h[1-6][^>]*>.*?disegno 3d.*?<\/h[1-6]>/i,
    /<h[1-6][^>]*>.*?sezione 2\.1.*?<\/h[1-6]>/i,
    /<span[^>]*class="section-number"[^>]*>\s*2\.1\s*<\/span>/i
  ];
  
  let section21Match = null;
  let section21Pos = -1;
  
  // Prova tutti i pattern per trovare la sezione 2.1
  for (const pattern of section21Patterns) {
    const match = html.match(pattern);
    if (match) {
      section21Match = match;
      section21Pos = match.index;
      console.log("Sezione 2.1 trovata con pattern:", pattern.toString());
      break;
    }
  }
  
  // Se non troviamo la sezione 2.1 con i pattern, cerchiamo un tag section con id che contiene "2.1" o "disegno"
  if (!section21Match) {
    const sectionIdPattern = /<section[^>]*id="[^"]*(?:2\.1|disegno)[^"]*"[^>]*>/i;
    const sectionMatch = html.match(sectionIdPattern);
    if (sectionMatch) {
      section21Match = sectionMatch;
      section21Pos = sectionMatch.index;
      console.log("Sezione 2.1 trovata tramite id section");
    }
  }
  
  // Se ancora non troviamo la sezione, cerchiamo una tabella con classe "bom-table"
  if (!section21Match) {
    const bomTablePattern = /<table[^>]*class="[^"]*bom-table[^"]*"[^>]*>/i;
    const tableMatches = [...html.matchAll(new RegExp(bomTablePattern, 'gi'))];
    
    // Per ogni tabella BOM trovata
    for (const tableMatch of tableMatches) {
      // Prendiamo un blocco di testo prima della tabella per cercare riferimenti alla sezione 2.1
      const startPos = Math.max(0, tableMatch.index - 500);
      const contextBefore = html.substring(startPos, tableMatch.index);
      
      // Verifichiamo se questo contesto contiene riferimenti alla sezione 2.1 o disegno 3D
      if (/\b2\.1\b|\bdisegno\s+3d\b/i.test(contextBefore)) {
        section21Match = tableMatch;
        section21Pos = tableMatch.index;
        console.log("Sezione 2.1 identificata tramite contesto vicino alla tabella BOM");
        break;
      }
    }
  }
  
  if (!section21Match) {
    console.log("Sezione 2.1 non trovata nell'HTML");
    return html;
  }
  
  console.log("Posizione sezione 2.1:", section21Pos);
  
  // Cerca la tabella dei componenti dopo questa posizione
  // Usiamo pattern più flessibili per trovare le tabelle BOM
  const tablePatterns = [
    /<table[^>]*class="[^"]*bom-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i,
    /<table[^>]*class="[^"]*component-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i,
    /<div[^>]*class="[^"]*bom-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  ];
  
  let tableMatch = null;
  
  // Cerca solo nel contenuto dopo la posizione della sezione 2.1
  // e limita la ricerca a 2000 caratteri dopo quella posizione
  const searchSegment = html.substring(section21Pos, section21Pos + 3000);
  
  for (const pattern of tablePatterns) {
    const regex = new RegExp(pattern, 'i');
    const match = searchSegment.match(regex);
    if (match) {
      tableMatch = {
        index: section21Pos + match.index,
        [0]: match[0],
        length: match[0].length
      };
      console.log("Tabella BOM trovata con pattern:", pattern.toString());
      break;
    }
  }
  
  if (!tableMatch) {
    console.log("Tabella dei componenti non trovata dopo la sezione 2.1");
    
    // Se non troviamo una tabella BOM esistente, cerchiamo il punto dove inserirla
    // Cerca un punto adatto dopo la sezione 2.1 per inserire la tabella
    const insertPoints = [
      /<\/section>\s*(?=<)/i,  // Fine di un tag section
      /<\/div>\s*(?=<div)/i,   // Fine di un div seguito da un altro div
      /<\/p>\s*(?=<)/i         // Fine di un paragrafo
    ];
    
    let insertPoint = -1;
    const searchArea = html.substring(section21Pos, section21Pos + 1000);
    
    for (const pattern of insertPoints) {
      const match = searchArea.match(pattern);
      if (match) {
        insertPoint = section21Pos + match.index + match[0].length;
        console.log("Punto di inserimento trovato:", insertPoint);
        break;
      }
    }
    
    // Se non troviamo un punto di inserimento, inseriamo alla fine della sezione 2.1
    if (insertPoint === -1) {
      insertPoint = section21Pos + section21Match[0].length;
      console.log("Usando punto di inserimento predefinito:", insertPoint);
    }
    
    // Crea la tabella con i componenti fissi
    const components = getSection21Components();
    let newTable = `
    <div class="bom-container">
      <h4 class="bom-title">Elenco Componenti Sezione 2.1</h4>
      <div class="bom-content">
        <table class="bom-table" style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">N°</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Livello</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Codice</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descrizione</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantità</th>
            </tr>
          </thead>
          <tbody>`;
    
    components.forEach((comp, index) => {
      newTable += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">3</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${comp.code}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${comp.description}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${comp.quantity}</td>
        </tr>`;
    });
    
    newTable += `
          </tbody>
        </table>
      </div>
    </div>`;
    
    // Inserisce la nuova tabella
    return html.substring(0, insertPoint) + newTable + html.substring(insertPoint);
  }
  
  // Se abbiamo trovato una tabella esistente, la sostituiamo
  console.log("Sostituendo la tabella esistente con i componenti fissi");
  
  // Crea la tabella di sostituzione con i componenti fissi
  const components = getSection21Components();
  let replacementTable = `<table class="bom-table" style="width: 100%; border-collapse: collapse; margin: 15px 0;">
    <thead>
      <tr style="background-color: #f5f5f5;">
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">N°</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Livello</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Codice</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descrizione</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantità</th>
      </tr>
    </thead>
    <tbody>`;
  
  components.forEach((comp, index) => {
    replacementTable += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">3</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${comp.code}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${comp.description}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${comp.quantity}</td>
      </tr>`;
  });
  
  replacementTable += `
    </tbody>
  </table>`;
  
  // Sostituisce la tabella originale con quella fissa
  return html.substring(0, tableMatch.index) + replacementTable + html.substring(tableMatch.index + tableMatch[0].length);
}