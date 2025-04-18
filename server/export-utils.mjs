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
  // Trova la sezione 2.1
  const section21Regex = /<h2[^>]*>2\.1[^<]*<\/h2>/;
  const section21Match = html.match(section21Regex);
  
  if (!section21Match) return html;
  
  // Posizione della sezione 2.1
  const section21Pos = section21Match.index;
  
  // Cerca la tabella dei componenti dopo questa posizione
  const tableRegex = /<table[^>]*class="[^"]*component-table[^"]*"[^>]*>([\s\S]*?)<\/table>/g;
  tableRegex.lastIndex = section21Pos;
  
  const tableMatch = tableRegex.exec(html);
  if (!tableMatch) return html;
  
  // Crea la tabella di sostituzione con i componenti fissi
  const components = getSection21Components();
  let replacementTable = `<table class="component-table" style="width: 100%; border-collapse: collapse; margin: 10px 0;">
    <thead>
      <tr style="background-color: #f3f3f3;">
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Codice</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descrizione</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantità</th>
      </tr>
    </thead>
    <tbody>`;
  
  components.forEach(comp => {
    replacementTable += `
      <tr>
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