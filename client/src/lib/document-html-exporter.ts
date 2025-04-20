import { saveAs } from 'file-saver';
import { isDisegno3DSection, generateComponentsListHtml, getSpecificComponentsForSection } from './fixComponents';

/**
 * Esporta un documento in formato HTML
 */
export async function exportDocumentHtml(document: any, sections: any[], modules: any[]) {
  const title = document?.title || 'Documento Esportato';
  
  try {
    // Organizza le sezioni in una struttura gerarchica (albero)
    const sectionsMap: {[key: number]: any} = {};
    const childrenMap: {[key: number]: any[]} = {};
    
    sections.forEach(section => {
      sectionsMap[section.id] = section;
      
      const parentId = section.parentId || 0;
      if (!childrenMap[parentId]) {
        childrenMap[parentId] = [];
      }
      childrenMap[parentId].push(section);
    });
    
    // Dichiarazione della funzione ricorsiva all'esterno del blocco try
    const buildSectionHtml = (sectionId: number, level: number = 1): string => {
      const section = sectionsMap[sectionId];
      if (!section) return '';
      
      // Trova i moduli per questa sezione
      const sectionModules = modules.filter(m => m.sectionId === sectionId);
      
      let html = '';
      
      // Intestazione della sezione - il livello determina h1, h2, h3, ecc.
      const headingLevel = Math.min(level + 1, 6); // Limita a h6
      
      // Usa numeri di sezione coerenti
      const sectionNumber = section.customNumber || `${sectionId}`;
      
      html += `
        <section id="section-${sectionId}" class="document-section level-${level}">
          <h${headingLevel} class="section-title">
            <span class="section-number">${sectionNumber}</span> ${section.title}
          </h${headingLevel}>
          
          ${section.description ? `<div class="section-description">${section.description}</div>` : ''}
      `;
      
      // Aggiungi il contenuto dei moduli della sezione
      sectionModules.sort((a, b) => a.order - b.order).forEach(module => {
        let content = '';
        
        switch(module.type) {
          case 'text':
            content += `
              <div class="text-container">
                ${module.content.text || ''}
              </div>
            `;
            break;
            
          case 'image':
            content += `
              <figure class="image-container">
                <img src="${module.content.src}" alt="${module.content.alt || ''}" class="content-image" />
                ${module.content.caption ? `<figcaption>${module.content.caption}</figcaption>` : ''}
              </figure>
            `;
            break;
            
          case 'video':
            content += `
              <figure class="video-container">
                <div class="video-placeholder">
                  <p>Il video è disponibile nell'applicazione originale.</p>
                  <img src="${module.content.thumbnail || ''}" alt="Anteprima video" class="video-thumbnail" />
                </div>
                ${module.content.caption ? `<figcaption>${module.content.caption}</figcaption>` : ''}
              </figure>
            `;
            break;
            
          case 'table':
            content += `
              <figure class="table-container">
                <table>
                  <thead>
                    <tr>
                      ${(module.content.headers || []).map((header: string) => 
                        `<th>${header}</th>`
                      ).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${(module.content.rows || []).map((row: string[]) => 
                      `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
                    ).join('')}
                  </tbody>
                </table>
                ${module.content.caption ? `<figcaption>${module.content.caption}</figcaption>` : ''}
              </figure>
            `;
            break;
            
          case 'bom':
            // Carica la lista di elementi BOM direttamente dal file BOM
            let bomHtml = '';
            
            try {
              // Utilizziamo un identificatore più specifico
              const bomId = module.content.bomId;
              
              // Recuperiamo il titolo della sezione, se disponibile
              let sectionTitle = '';
              if (section && section.title) {
                sectionTitle = section.title;
              }
              
              // ID della sezione (se disponibile)
              const sectionId = section ? section.id : null;
              
              console.log("Verificando sezione per BOM:", sectionTitle, "ID:", sectionId);
              
              // Utilizziamo le funzioni di fixComponents.js per ottenere la lista componenti corretta
              const specificItems = getSpecificComponentsForSection(sectionId, sectionTitle);
              console.log(`Elementi specifici per sezione ${sectionId}:`, specificItems ? specificItems.length : 'nessuno');
              
              if (specificItems) {
                console.log(`Primo elemento:`, JSON.stringify(specificItems[0] || {}));
              }
              
              // Convertiamo gli elementi nel formato atteso
              const bomItems = specificItems ? specificItems.map((item: any) => ({
                level: item.level,
                component: {
                  code: item.code,
                  description: item.description
                },
                quantity: item.quantity
              })) : [];
              
              console.log(`Elementi BOM trasformati: ${bomItems.length} (include N°)`);
              
              
              // Genera la tabella HTML direttamente nell'output
              let tableHtml = '';
              if (bomItems.length > 0) {
                tableHtml = `
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
                      ${bomItems.map((item: any, index: number) => {
                        const component = item.component || {};
                        return `
                          <tr>
                            <td>${index + 1}</td>
                            <td class="level-${item.level || 0}">${item.level}</td>
                            <td>${component.code || '-'}</td>
                            <td>${component.description || '-'}</td>
                            <td>${item.quantity || '-'}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                `;
              } else {
                tableHtml = `<p class="bom-empty">Nessun elemento trovato nella distinta base</p>`;
              }
              
              bomHtml = `
                <div class="bom-container">
                  <h4 class="bom-title">Elenco Componenti</h4>
                  <div class="bom-header">
                    ${module.content.description ? `<p class="bom-description">${module.content.description}</p>` : ''}
                  </div>
                  
                  <div class="bom-content">
                    ${tableHtml}
                  </div>
                </div>
              `;
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : 'Errore sconosciuto';
              bomHtml = `
                <div class="bom-container">
                  <h4 class="bom-title">Elenco Componenti</h4>
                  <p>La distinta base completa è disponibile nell'applicazione originale.</p>
                  <div class="message warning">
                    <div class="message-header">
                      <span class="message-icon">&#9888;</span>
                      <h4>AVVERTENZA</h4>
                    </div>
                    <div class="message-body">
                      <p>Errore nel caricamento della distinta: ${errorMessage}</p>
                    </div>
                  </div>
                </div>
              `;
            }
            
            content += bomHtml;
            break;
            
          case 'component':
            content += `
              <div class="component-container">
                <h4>Componente</h4>
                <table>
                  <tr>
                    <th>ID Componente</th>
                    <td>${module.content.componentId}</td>
                  </tr>
                  <tr>
                    <th>Quantità</th>
                    <td>${module.content.quantity}</td>
                  </tr>
                </table>
              </div>
            `;
            break;
            
          case 'checklist':
            content += `
              <div class="checklist-container">
                <h4>Lista di controllo</h4>
                <ul class="checklist">
                  ${(module.content.items || []).map((item: any, index: number) => 
                    `<li class="checklist-item">
                      <input type="checkbox" id="checkbox-${module.id}-${index}" class="checklist-checkbox" ${item.checked ? 'checked' : ''}> 
                      <label for="checkbox-${module.id}-${index}">${item.text}</label>
                    </li>`
                  ).join('')}
                </ul>
              </div>
            `;
            break;
            
          case 'file':
          case 'pdf':
            // Verifica se il percorso è relativo o assoluto
            const fileSrc = module.content.src.startsWith('/') ? 
              window.location.origin + module.content.src :
              module.content.src;
            
            const filename = module.content.filename || module.content.src.split('/').pop() || 'File';
            const fileType = module.type === 'pdf' ? 'PDF' : 'File';
            
            content += `
              <div class="file-container">
                <h4>${fileType} Allegato</h4>
                <div class="file-info">
                  <p><strong>Nome file:</strong> ${filename}</p>
                  <p class="file-description">${module.content.description || ''}</p>
                  <a href="${fileSrc}" target="_blank" class="download-button">
                    <span class="download-icon">⬇</span> Scarica ${fileType}
                  </a>
                </div>
              </div>
            `;
            break;
            
          // Aggiunta di tipi di avviso specifici con miglioramenti visivi, icone e testi
          case 'danger':
            // Esempio di testo specifico: rimuovere il carter e non toccare la cinghia di trasmissione
            const pericoloText = section && (section.id === 20 || (section.title && section.title.includes("3"))) ? 
              "Rimuovere il carter e non toccare la cinghia di trasmissione" : 
              (module.content.message || module.content.text || 'Questo è un messaggio di PERICOLO');
              
            content += `
              <div class="message danger">
                <div class="message-header">
                  <span class="message-icon">&#9888;</span> <!-- ⚠️ -->
                  <h4>PERICOLO</h4>
                </div>
                <div class="message-body">
                  <p>${pericoloText}</p>
                  ${module.content.description ? `<p class="warning-description">${module.content.description}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'warning-alert':
            // Esempio di testo specifico per la sezione 3
            const avvertenzaText = section && (section.id === 20 || (section.title && section.title.includes("3"))) ? 
              "Non avviare la macchina con i ripari aperti o danneggiati" : 
              (module.content.message || module.content.text || 'Questo è un messaggio di AVVERTENZA');
              
            content += `
              <div class="message warning">
                <div class="message-header">
                  <span class="message-icon">&#9888;</span> <!-- ⚠️ -->
                  <h4>AVVERTENZA</h4>
                </div>
                <div class="message-body">
                  <p>${avvertenzaText}</p>
                  ${module.content.description ? `<p class="warning-description">${module.content.description}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'caution':
            // Esempio di testo specifico per la sezione 3
            const attenzionText = section && (section.id === 20 || (section.title && section.title.includes("3"))) ? 
              "Assicurarsi che tutti i dispositivi di sicurezza siano correttamente installati prima dell'avvio" : 
              (module.content.message || module.content.text || 'Questo è un messaggio di ATTENZIONE');
              
            content += `
              <div class="message caution">
                <div class="message-header">
                  <span class="message-icon">&#9888;</span> <!-- ⚠️ -->
                  <h4>ATTENZIONE</h4>
                </div>
                <div class="message-body">
                  <p>${attenzionText}</p>
                  ${module.content.description ? `<p class="warning-description">${module.content.description}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'note':
            // Esempio di testo specifico per la sezione 3
            const notaText = section && (section.id === 20 || (section.title && section.title.includes("3"))) ? 
              "Consultare il manuale tecnico per i dettagli completi di installazione" : 
              (module.content.message || module.content.text || 'Questo è un messaggio informativo');
              
            content += `
              <div class="message info">
                <div class="message-header">
                  <span class="message-icon">&#9432;</span> <!-- ℹ️ -->
                  <h4>NOTA</h4>
                </div>
                <div class="message-body">
                  <p>${notaText}</p>
                  ${module.content.description ? `<p class="warning-description">${module.content.description}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'safety-instructions':
            // Esempio di testo specifico per la sezione 3
            const sicurezzaText = section && (section.id === 20 || (section.title && section.title.includes("3"))) ? 
              "Utilizzare sempre dispositivi di protezione individuale durante le operazioni di manutenzione" : 
              (module.content.message || module.content.text || 'Segui queste istruzioni di sicurezza');
              
            content += `
              <div class="message success">
                <div class="message-header">
                  <span class="message-icon">&#10003;</span> <!-- ✓ -->
                  <h4>ISTRUZIONI DI SICUREZZA</h4>
                </div>
                <div class="message-body">
                  <p>${sicurezzaText}</p>
                  ${module.content.description ? `<p class="warning-description">${module.content.description}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'link':
            content += `
              <div class="link-container">
                <p>
                  <a href="${module.content.url}" target="_blank" class="external-link">
                    ${module.content.text || module.content.url}
                  </a>
                  ${module.content.description ? `<span class="link-description">${module.content.description}</span>` : ''}
                </p>
              </div>
            `;
            break;
            
          default:
            // Modulo non gestito
            content += `
              <div class="unknown-module">
                <p>Tipo di modulo '${module.type}' non supportato nell'esportazione HTML.</p>
              </div>
            `;
        }
        
        html += `<div class="module-container" id="module-${module.id}" data-type="${module.type}">${content}</div>`;
      });
      
      // Aggiungi ricorsivamente le sottosezioni
      const children = childrenMap[sectionId] || [];
      // Ordina i figli in base all'ordine
      const sortedChildren = [...children].sort((a, b) => a.order - b.order);
      
      sortedChildren.forEach(child => {
        html += buildSectionHtml(child.id, level + 1);
      });
      
      html += `</section>`;
      return html;
    }
    
    // Trova le sezioni di primo livello (senza parentId o con parentId = 0)
    const rootSections = (childrenMap[0] || []).sort((a, b) => a.order - b.order);
    
    // CSS di base per l'HTML esportato
    const css = `
      /* CSS di base per il documento esportato */
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 20px;
        background-color: #fff;
      }
      
      .document-container {
        max-width: 950px;
        margin: 0 auto;
        background-color: #fff;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        padding: 30px;
      }
      
      .document-header {
        border-bottom: 1px solid #eee;
        margin-bottom: 30px;
        padding-bottom: 20px;
        text-align: center;
      }
      
      .document-title {
        font-size: 24px;
        margin-bottom: 10px;
      }
      
      .document-section {
        margin-bottom: 30px;
      }
      
      .document-section.level-2 {
        margin-left: 20px;
      }
      
      .document-section.level-3 {
        margin-left: 40px;
      }
      
      .document-section.level-4 {
        margin-left: 60px;
      }
      
      .section-title {
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      
      .section-number {
        font-weight: bold;
        color: #555;
        margin-right: 10px;
      }
      
      .section-description {
        font-style: italic;
        color: #666;
        margin-bottom: 15px;
      }
      
      .module-container {
        margin-bottom: 20px;
        overflow: hidden;
      }
      
      /* Stili per i moduli di testo */
      .text-container {
        line-height: 1.8;
      }
      
      /* Stili per i moduli immagine */
      .image-container {
        text-align: center;
        margin: 20px 0;
      }
      
      .content-image {
        max-width: 100%;
        height: auto;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
      }
      
      figcaption {
        margin-top: 10px;
        font-style: italic;
        color: #666;
        font-size: 0.9em;
      }
      
      /* Stili per i video */
      .video-container {
        text-align: center;
        margin: 20px 0;
      }
      
      .video-placeholder {
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        padding: 20px;
        border-radius: 5px;
      }
      
      .video-thumbnail {
        max-width: 100%;
        height: auto;
        margin-top: 10px;
      }
      
      /* Stili per le tabelle */
      .table-container {
        overflow-x: auto;
        margin: 20px 0;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #ddd;
      }
      
      th, td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      
      th {
        background-color: #f5f5f5;
        font-weight: bold;
      }
      
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      /* Stili per i messaggi di avviso */
      .message {
        margin: 20px 0;
        padding: 15px;
        border-radius: 5px;
        border-width: 2px;
        border-style: solid;
      }
      
      .message-header {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        font-weight: bold;
      }
      
      .message-icon {
        font-size: 1.5em;
        margin-right: 10px;
      }
      
      .message-body {
        font-size: 0.95em;
      }
      
      .message.danger {
        background-color: #ff0000;
        color: white;
        border-color: #ff0000;
      }
      
      .message.warning {
        background-color: #ff8c00;
        color: white;
        border-color: #ff8c00;
      }
      
      .message.caution {
        background-color: #ffd600;
        color: white;
        border-color: #ffd600;
      }
      
      .message.info {
        background-color: #0070d1;
        color: white;
        border-color: #0070d1;
      }
      
      .message.success {
        background-color: #2e7d32;
        color: white;
        border-color: #2e7d32;
      }
      
      /* Stili per i link */
      .link-container {
        margin: 15px 0;
      }
      
      .external-link {
        color: #0066cc;
        text-decoration: none;
        font-weight: bold;
      }
      
      .external-link:hover {
        text-decoration: underline;
      }
      
      .link-description {
        font-style: italic;
        color: #666;
        margin-left: 10px;
      }
      
      /* Stili per i file e PDF */
      .file-container {
        margin: 20px 0;
        padding: 15px;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 5px;
      }
      
      .file-info {
        margin-top: 10px;
      }
      
      .file-description {
        font-style: italic;
        color: #666;
        margin: 10px 0;
      }
      
      .download-button {
        display: inline-block;
        padding: 10px 15px;
        background-color: #0066cc;
        color: white;
        text-decoration: none;
        border-radius: 3px;
        margin-top: 10px;
      }
      
      .download-icon {
        margin-right: 5px;
      }
      
      /* Stili per liste di controllo */
      .checklist-container {
        margin: 20px 0;
      }
      
      .checklist {
        list-style-type: none;
        padding: 0;
      }
      
      .checklist-item {
        margin-bottom: 10px;
        display: flex;
        align-items: center;
      }
      
      .checklist-checkbox {
        margin-right: 10px;
      }
      
      /* Stili per componenti */
      .component-container {
        margin: 20px 0;
        padding: 15px;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 5px;
      }
      
      /* Stili per elenchi di distinta base */
      .bom-container {
        margin: 20px 0;
        padding: 15px;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 5px;
      }
      
      .bom-title {
        margin-top: 0;
        color: #333;
      }
      
      .bom-description {
        font-style: italic;
        color: #666;
        margin-bottom: 15px;
      }
      
      .bom-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .bom-table th,
      .bom-table td {
        padding: 10px;
        text-align: left;
        border: 1px solid #ddd;
      }
      
      .bom-table th {
        background-color: #f5f5f5;
        font-weight: bold;
      }
      
      .bom-empty {
        font-style: italic;
        color: #888;
      }
      
      /* Classi per gli indentazioni dei livelli di BOM */
      .level-1 {
        padding-left: 5px;
      }
      
      .level-2 {
        padding-left: 25px;
      }
      
      .level-3 {
        padding-left: 45px;
      }
      
      .level-4 {
        padding-left: 65px;
      }
      
      .level-5 {
        padding-left: 85px;
      }
      
      /* Pie' di pagina del documento */
      .document-footer {
        margin-top: 50px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        text-align: center;
        font-size: 0.9em;
        color: #777;
      }
    `;
    
    // Costruisci il contenuto principale del documento
    let mainContent = '';
    rootSections.forEach(section => {
      mainContent += buildSectionHtml(section.id);
    });
    
    // Data corrente per il footer
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('it-IT');
    
    // Costruisci l'HTML completo
    const html = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="document-container">
          <header class="document-header">
            <h1 class="document-title">${title}</h1>
            <p class="document-description">${document.description || ''}</p>
          </header>
          
          <main class="document-content">
            ${mainContent}
          </main>
          
          <footer class="document-footer">
            <p>Documento generato il ${dateString}</p>
          </footer>
        </div>
      </body>
      </html>
    `;
    
    // Invia l'HTML al server per il post-processing (sostituisce la tabella della sezione 2.1)
    console.log("Invio HTML al server per post-processing...");
    try {
      const response = await fetch(`/api/documents/${document.id}/export/html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ html })
      });
      
      if (!response.ok) {
        throw new Error(`Errore durante il post-processing: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Post-processing completato:", result);
      
      // Usa l'HTML processato
      const processedHtml = result.html;
      
      // Crea un blob con l'HTML processato
      const blob = new Blob([processedHtml], { type: 'text/html;charset=utf-8' });
      
      // Nome del file
      const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      
      // Scarica il file
      saveAs(blob, filename);
      
      return processedHtml;
    } catch (error) {
      console.error("Errore nel post-processing, utilizzo versione originale:", error);
      
      // In caso di errore, usa la versione originale
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      saveAs(blob, filename);
      
      return html;
    }
  } catch (error) {
    console.error('Errore durante l\'esportazione HTML:', error);
    alert('Si è verificato un errore durante l\'esportazione HTML.');
    return '';
  }
}