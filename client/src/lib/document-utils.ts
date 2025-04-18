import { saveAs } from 'file-saver';

/**
 * Helper function to format document status
 */
export function formatDocumentStatus(status: string) {
  switch (status) {
    case 'draft':
      return 'Bozza';
    case 'review':
      return 'In Revisione';
    case 'approved':
      return 'Approvato';
    case 'published':
      return 'Pubblicato';
    default:
      return status;
  }
}

/**
 * Retrieves a full document with all sections and modules
 */
export async function getFullDocument(documentId: string) {
  // First get the document
  const documentResponse = await fetch(`/api/documents/${documentId}`);
  if (!documentResponse.ok) throw new Error('Failed to fetch document');
  const document = await documentResponse.json();
  
  // Then get all sections for this document
  const sectionsResponse = await fetch(`/api/documents/${documentId}/sections`);
  if (!sectionsResponse.ok) throw new Error('Failed to fetch sections');
  const sections = await sectionsResponse.json();
  
  // For each section, get all modules
  const sectionsWithModules = await Promise.all(sections.map(async (section: any) => {
    const modulesResponse = await fetch(`/api/sections/${section.id}/modules`);
    if (!modulesResponse.ok) return { ...section, modules: [] };
    
    const modules = await modulesResponse.json();
    
    // Parse module content if it's a string
    const parsedModules = modules.map((module: any) => {
      if (module.content && typeof module.content === 'string') {
        try {
          return { ...module, content: JSON.parse(module.content) };
        } catch (e) {
          return module;
        }
      }
      return module;
    });
    
    return { ...section, modules: parsedModules };
  }));
  
  return { ...document, sections: sectionsWithModules };
}

/**
 * Crea e scarica un file di testo
 * @param fileName Nome del file da scaricare
 * @param content Contenuto del file
 * @param type Tipo MIME del file
 */
export function downloadTextFile(fileName: string, content: string, type: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  saveAs(blob, fileName);
}

/**
 * Esporta un documento in formato HTML
 * @param documentId ID del documento da esportare
 */
export async function exportToHtml(documentId: string): Promise<void> {
  try {
    const document = await getFullDocument(documentId);
    
    // Genera il contenuto HTML
    let content = `
      <h1>${document.title}</h1>
      <p>${document.description || ''}</p>
      <p><strong>Versione:</strong> ${document.version}</p>
    `;
    
    // Ordina le sezioni in base all'ordine del campo "order"
    const sortedSections = [...document.sections].sort((a, b) => a.order - b.order);
    
    // Organizza le sezioni in struttura gerarchica
    const mainSections = sortedSections.filter(s => !s.parentId);
    const childrenMap = sortedSections.reduce((map, section) => {
      if (section.parentId) {
        if (!map[section.parentId]) map[section.parentId] = [];
        map[section.parentId].push(section);
      }
      return map;
    }, {} as Record<number, any[]>);
    
    // Definita fuori dallo scope del blocco per evitare errori in strict mode
    const addSectionContent = (section: any, level: number = 2) => {
      // Crea tag h appropriato in base al livello (h2, h3, h4, ecc.)
      const headingTag = `h${Math.min(level, 6)}`;
      content += `
        <${headingTag} id="section-${section.id}">${section.title}</${headingTag}>
        <p>${section.description || ''}</p>
      `;
      
      // Aggiungi i moduli della sezione
      const modules = section.modules || [];
      const sortedModules = [...modules].sort((a, b) => a.order - b.order);
      
      for (const module of sortedModules) {
        switch (module.type) {
          case 'text':
            content += `<div>${module.content.text}</div>`;
            break;
            
          case 'image':
            // Verifica se il percorso è relativo o assoluto
            const imgSrc = module.content.src.startsWith('/') ? 
              // Se è un percorso assoluto, utilizza il percorso completo
              window.location.origin + module.content.src :
              // Altrimenti, usa il percorso come è
              module.content.src;
              
            content += `
              <div class="image-container">
                <img src="${imgSrc}" alt="${module.content.alt || ''}" />
                ${module.content.caption ? `<p class="caption">${module.content.caption}</p>` : ''}
              </div>
            `;
            break;
            
          case 'video':
            // Verifica se il percorso è relativo o assoluto
            const videoSrc = module.content.src.startsWith('/') ? 
              window.location.origin + module.content.src :
              module.content.src;
            
            content += `
              <div class="video-container">
                <video controls width="100%">
                  <source src="${videoSrc}" type="video/${module.content.format || 'mp4'}">
                  Il tuo browser non supporta i video HTML5.
                </video>
                ${module.content.caption ? `<p class="caption">${module.content.caption}</p>` : ''}
              </div>
            `;
            break;
            
          case 'warning':
            let warningClass = 'info';
            if (module.content.level === 'error') {
              warningClass = 'danger';
            } else if (module.content.level === 'warning') {
              warningClass = 'warning';
            }
            
            content += `
              <div class="message ${warningClass}">
                <h4>${module.content.title}</h4>
                <p>${module.content.message}</p>
              </div>
            `;
            break;
            
          case 'table':
            content += `
              <div style="margin: 15px 0;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                  <thead>
                    <tr>
                      ${(module.content.headers || []).map((header: string) => 
                        `<th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">${header}</th>`
                      ).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${(module.content.rows || []).map((row: string[]) => 
                      `<tr>
                        ${row.map((cell: string) => 
                          `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`
                        ).join('')}
                      </tr>`
                    ).join('')}
                  </tbody>
                </table>
                ${module.content.caption ? `<p style="text-align: center;"><em>${module.content.caption}</em></p>` : ''}
              </div>
            `;
            break;
            
          case '3d':
          case '3d-model':
            // Verifica se il percorso è relativo o assoluto e usa l'URL completo
            const modelSrc = module.content.src.startsWith('/') ? 
              window.location.origin + module.content.src :
              module.content.src;
            
            // Determina il percorso per il download
            const modelDownloadPath = module.content.src.startsWith('/') ? 
              window.location.origin + module.content.src :
              module.content.src;
            
            // Incorpora il modello 3D
            content += `
              <div class="model-container">
                <h4>Modello 3D</h4>
                <p><strong>File:</strong> ${module.content.title || module.content.filename || 'Modello 3D'}</p>
                
                <div class="controls">
                  <button class="btn btn-primary" onclick="rotateModel('left', ${module.id})">Ruota Sinistra</button>
                  <button class="btn btn-primary" onclick="rotateModel('right', ${module.id})">Ruota Destra</button>
                  <button class="btn btn-primary" onclick="zoomModel('in', ${module.id})">Zoom In</button>
                  <button class="btn btn-primary" onclick="zoomModel('out', ${module.id})">Zoom Out</button>
                  <button class="btn btn-danger" onclick="resetModel(${module.id})">Reset</button>
                </div>
                
                <iframe id="model-viewer-${module.id}" src="${modelSrc}" style="width: 100%; height: 400px;"></iframe>
                
                <p style="margin-top: 15px;">
                  <a href="${modelDownloadPath}" download="${module.content.title || 'modello3D'}.html" class="btn btn-success">
                    Scarica il file 3D
                  </a>
                </p>
              </div>
            `;
            break;
            
          case 'bom':
            // Carica la lista di elementi BOM direttamente dal file BOM
            let bomHtml = '';
            
            try {
              // Utilizziamo un identificatore più specifico
              const bomId = module.content.bomId;
              
              bomHtml = `
                <div class="bom-container">
                  <h4>Distinta Base (BOM)</h4>
                  <p><strong>ID Distinta:</strong> ${bomId}</p>
                  
                  <iframe id="bom-data-${bomId}" srcdoc="
                    <html>
                    <head>
                      <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .level-0 { padding-left: 10px; }
                        .level-1 { padding-left: 30px; }
                        .level-2 { padding-left: 50px; }
                        .level-3 { padding-left: 70px; }
                        .level-4 { padding-left: 90px; }
                      </style>
                    </head>
                    <body>
                      <p style='color:red;'>Caricamento in corso...</p>
                      <script>
                        // Richiesta asincrona per caricare la BOM completa
                        const url = '/api/boms/${bomId}/items';
                        fetch(url)
                          .then(response => response.json())
                          .then(items => {
                            if (items && items.length) {
                              // Ordina gli elementi per livello
                              items.sort((a, b) => a.level - b.level || a.order - b.order);
                              
                              // Crea la tabella
                              let tableHtml = '<table><thead><tr>' +
                                '<th>Livello</th>' +
                                '<th>Codice</th>' +
                                '<th>Descrizione</th>' +
                                '<th>Quantità</th>' +
                                '</tr></thead><tbody>';
                              
                              items.forEach(item => {
                                const component = item.component || {};
                                tableHtml += '<tr>' +
                                  '<td class="level-' + (item.level || 0) + '">' + item.level + '</td>' +
                                  '<td>' + (component.code || '-') + '</td>' +
                                  '<td>' + (component.description || '-') + '</td>' +
                                  '<td>' + (item.quantity || '-') + '</td>' +
                                  '</tr>';
                              });
                              
                              tableHtml += '</tbody></table>';
                              document.body.innerHTML = tableHtml;
                            } else {
                              document.body.innerHTML = '<p>Nessun elemento trovato nella distinta base</p>';
                            }
                          })
                          .catch(error => {
                            document.body.innerHTML = '<p>Errore nel caricamento della distinta: ' + error.message + '</p>';
                          });
                      </script>
                    </body>
                    </html>
                  " style="width: 100%; height: 300px; border: none;"></iframe>
                </div>
              `;
            } catch (e) {
              bomHtml = `
                <div class="bom-container">
                  <h4>Distinta Base (BOM) - ID: ${module.content.bomId}</h4>
                  <p>La distinta base completa è disponibile nell'applicazione originale.</p>
                  <p class="message warning">Errore nel caricamento della distinta: ${e.message}</p>
                </div>
              `;
            }
            
            content += bomHtml;
            break;
            
          case 'component':
            content += `
              <div style="margin: 15px 0; padding: 10px; border: 1px solid #ddd;">
                <h4>Componente</h4>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; margin-top: 10px;">
                  <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">ID Componente</th>
                    <td style="border: 1px solid #ddd; padding: 8px;">${module.content.componentId}</td>
                  </tr>
                  <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Quantità</th>
                    <td style="border: 1px solid #ddd; padding: 8px;">${module.content.quantity}</td>
                  </tr>
                </table>
              </div>
            `;
            break;
            
          case 'checklist':
            content += `
              <div style="margin: 15px 0;">
                <h4>Lista di controllo</h4>
                <ul style="list-style-type: none; padding-left: 0;">
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
            
            content += `
              <div class="file-container">
                <h4>File Allegato</h4>
                <p><strong>Nome file:</strong> ${filename}</p>
                <p><a href="${fileSrc}" target="_blank" class="btn btn-primary" style="display: inline-block; padding: 8px 16px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Scarica il file</a></p>
              </div>
            `;
            break;
            
          // Aggiunta di tipi di avviso specifici
          case 'danger':
            content += `
              <div class="message danger">
                <h4>PERICOLO</h4>
                <p>${module.content.message || module.content.text || ''}</p>
              </div>
            `;
            break;
            
          case 'caution':
          case 'warning-alert':
            content += `
              <div class="message warning">
                <h4>AVVERTENZA</h4>
                <p>${module.content.message || module.content.text || ''}</p>
              </div>
            `;
            break;
            
          case 'note':
            content += `
              <div class="message info">
                <h4>NOTA</h4>
                <p>${module.content.message || module.content.text || ''}</p>
              </div>
            `;
            break;
            
          case 'safety-instructions':
            content += `
              <div class="message success">
                <h4>ISTRUZIONI DI SICUREZZA</h4>
                <p>${module.content.message || module.content.text || ''}</p>
              </div>
            `;
            break;
            
          case 'link':
            content += `
              <div style="margin: 15px 0;">
                <p><a href="${module.content.url}" target="_blank" style="color: #2563eb; text-decoration: underline;">${module.content.text || module.content.url}</a></p>
              </div>
            `;
            break;
            
          default:
            // Aggiungi un placeholder più informativo per tipi sconosciuti
            content += `
              <div style="margin: 15px 0; padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9;">
                <h4>Contenuto: ${module.type}</h4>
                <p>Questo tipo di contenuto viene visualizzato meglio nell'applicazione originale.</p>
                <pre style="background-color: #f5f5f5; padding: 10px; overflow: auto; max-height: 200px;">${JSON.stringify(module.content, null, 2)}</pre>
              </div>
            `;
        }
      }
    }
    
    // Aggiungiamo JavaScript per i controlli dei modelli 3D
    const scriptContent = `
    <script>
      // Funzioni per il controllo dei modelli 3D
      function rotateModel(direction, modelId) {
        console.log('Rotate model: ' + direction + ' for model: ' + modelId);
        try {
          if (modelId) {
            // Ruota uno specifico modello
            const frame = document.getElementById('model-viewer-' + modelId);
            if (frame && frame.contentWindow) {
              frame.contentWindow.postMessage({
                action: 'rotate',
                direction: direction
              }, '*');
            }
          } else {
            // Ruota tutti i modelli (retrocompatibilità)
            const frames = document.querySelectorAll('iframe[id^="model-viewer-"]');
            frames.forEach(frame => {
              frame.contentWindow.postMessage({
                action: 'rotate',
                direction: direction
              }, '*');
            });
          }
        } catch(e) {
          console.error('Failed to communicate with 3D model:', e);
        }
      }
      
      function zoomModel(direction, modelId) {
        console.log('Zoom model: ' + direction + ' for model: ' + modelId);
        try {
          if (modelId) {
            // Zoom su uno specifico modello
            const frame = document.getElementById('model-viewer-' + modelId);
            if (frame && frame.contentWindow) {
              frame.contentWindow.postMessage({
                action: 'zoom',
                direction: direction
              }, '*');
            }
          } else {
            // Zoom su tutti i modelli (retrocompatibilità)
            const frames = document.querySelectorAll('iframe[id^="model-viewer-"]');
            frames.forEach(frame => {
              frame.contentWindow.postMessage({
                action: 'zoom',
                direction: direction
              }, '*');
            });
          }
        } catch(e) {
          console.error('Failed to communicate with 3D model:', e);
        }
      }
      
      function resetModel(modelId) {
        console.log('Reset model: ' + modelId);
        try {
          if (modelId) {
            // Reset di uno specifico modello
            const frame = document.getElementById('model-viewer-' + modelId);
            if (frame && frame.contentWindow) {
              frame.contentWindow.postMessage({
                action: 'reset'
              }, '*');
            }
          } else {
            // Reset di tutti i modelli (retrocompatibilità)
            const frames = document.querySelectorAll('iframe[id^="model-viewer-"]');
            frames.forEach(frame => {
              frame.contentWindow.postMessage({
                action: 'reset'
              }, '*');
            });
          }
        } catch(e) {
          console.error('Failed to communicate with 3D model:', e);
        }
      }
    </script>
    `;
    
    // Chiamiamo la funzione ricorsiva per ogni sezione principale
    for (const section of mainSections.sort((a, b) => a.order - b.order)) {
      addSectionContent(section, 2);
      
      // Processa ricorsivamente tutte le sottosezioni
      const processChildren = (parentId: number, level: number) => {
        const children = childrenMap[parentId] || [];
        // Ordina i figli in base all'ordine
        const sortedChildren = [...children].sort((a, b) => a.order - b.order);
        
        for (const child of sortedChildren) {
          addSectionContent(child, level);
          // Processa ricorsivamente i figli di questo figlio
          processChildren(child.id, level + 1);
        }
      }
      
      // Avvia il processamento ricorsivo per questa sezione principale
      processChildren(section.id, 3);
    }
    
    // Genera il documento HTML completo con lo script
    const htmlDocument = generateHtml(document.title, content + scriptContent);
    
    // Scarica il file
    downloadTextFile(`${document.title.replace(/\s+/g, '_')}_v${document.version}.html`, htmlDocument, 'text/html;charset=utf-8');
  } catch (error) {
    console.error('Errore durante l\'esportazione HTML:', error);
    throw error;
  }
}

/**
 * Esporta un documento in formato PDF
 * @param documentId ID del documento da esportare
 * @param languageId ID opzionale della lingua per traduzioni
 */
export async function exportToPdf(documentId: string, languageId?: string): Promise<void> {
  try {
    // Costruisci l'URL con i parametri opzionali
    let url = `/api/documents/${documentId}/export/pdf`;
    
    // Aggiungi parametri di query se necessario
    if (languageId) {
      url += `?languageId=${languageId}`;
    }
    
    console.log(`Richiesta esportazione PDF per documento ${documentId} con URL: ${url}`);
    
    // Prima esportiamo in HTML per avere un fallback in caso di problemi con il PDF
    // Questo assicura che l'utente abbia sempre un documento da consultare
    await exportToHtml(documentId);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
    });
    
    if (!response.ok) {
      console.error(`Errore HTTP: ${response.status} ${response.statusText}`);
      
      // Prova a leggere il messaggio di errore
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || 'Errore durante l\'esportazione PDF';
      } catch (jsonError) {
        // Se non possiamo leggere JSON, usiamo lo status text
        errorMessage = `Errore HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    // Ottieni il blob dal responso
    const blob = await response.blob();
    
    // Verifica che il blob contenga effettivamente un PDF
    if (blob.type !== 'application/pdf' && blob.size < 100) {
      console.error('Il file restituito non sembra essere un PDF valido', blob);
      throw new Error('Il server ha restituito un file non valido. Riprova o usa l\'esportazione HTML.');
    }
    
    // Estrai il nome del file dall'header Content-Disposition o usa un nome predefinito
    let filename = 'documento.pdf';
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    console.log(`Download PDF con nome: ${filename}`);
    
    // Salva il file usando file-saver
    saveAs(blob, filename);
    console.log('Download PDF completato');
  } catch (error: any) {
    console.error('Errore durante l\'esportazione PDF:', error);
    // Notifica l'utente che può sempre usare l'esportazione HTML come alternativa
    alert(`Si è verificato un errore durante l'esportazione PDF: ${error?.message || 'Errore sconosciuto'}\n\nÈ comunque disponibile l'esportazione HTML come alternativa.`);
    throw error;
  }
}

/**
 * Esporta un documento in formato Word (.docx)
 * @param documentId ID del documento da esportare
 * @param languageId ID opzionale della lingua per traduzioni
 * @returns Promise che si risolve quando il download è completo
 */
export async function exportToWord(documentId: string, languageId?: string): Promise<void> {
  try {
    // Parametri della query
    const queryParams = new URLSearchParams();
    if (languageId) {
      queryParams.append('languageId', languageId);
    }
    
    // URL con parametri
    const url = `/api/documents/${documentId}/export/word${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    // Richiesta di esportazione
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Errore durante l\'esportazione Word');
    }
    
    // Ottieni il blob dal responso
    const blob = await response.blob();
    
    // Estrai il nome del file dall'header Content-Disposition o usa un nome predefinito
    let filename = 'documento.docx';
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    // Salva il file usando file-saver
    saveAs(blob, filename);
  } catch (error) {
    console.error('Errore durante l\'esportazione Word:', error);
    throw error;
  }
}

/**
 * Genera un semplice documento HTML
 * @param title Titolo del documento
 * @param content Contenuto HTML del documento
 * @returns Stringa HTML completa
 */
export function generateHtml(title: string, content: string): string {
  // Definiamo i CSS esterni in un file separato
  const cssContent = `
:root {
  --primary-color: #2563eb;
  --secondary-color: #4b5563;
  --tertiary-color: #6b7280;
  --light-bg: #f9f9f9;
  --border-color: #e5e7eb;
  --danger-color: #f44336;
  --warning-color: #ffc107;
  --info-color: #2196F3;
  --success-color: #28a745;
  --text-color: #333333;
  --link-color: #2563eb;
  --font-family: Arial, sans-serif;
  --base-spacing: 20px;
  --content-width: 800px;
}

body {
  font-family: var(--font-family);
  line-height: 1.6;
  max-width: var(--content-width);
  margin: 0 auto;
  padding: var(--base-spacing);
  color: var(--text-color);
}

h1, h2, h3, h4, h5, h6 {
  margin-top: calc(var(--base-spacing) * 1.5);
  margin-bottom: var(--base-spacing);
}

h1 {
  color: var(--primary-color);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 10px;
  font-size: 2em;
}

h2 {
  color: var(--secondary-color);
  font-size: 1.5em;
}

h3 {
  color: var(--tertiary-color);
  font-size: 1.2em;
}

p {
  margin: 10px 0;
}

ul, ol {
  margin: 15px 0;
  padding-left: 30px;
}

li {
  margin-bottom: 8px;
}

a {
  color: var(--link-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--base-spacing) 0;
}

table, th, td {
  border: 1px solid var(--border-color);
}

th, td {
  padding: 8px;
  text-align: left;
}

th {
  background-color: var(--light-bg);
}

img, video, iframe {
  display: block;
  max-width: 100%;
  margin: var(--base-spacing) auto;
}

.section {
  margin-bottom: calc(var(--base-spacing) * 2);
}

/* Moduli personalizzati */
.module {
  margin: var(--base-spacing) 0;
}

/* Stili per tipi di avvisi */
.message {
  padding: 15px;
  margin: 15px 0;
  border-left: 6px solid;
}

.message h4 {
  margin-top: 0;
  margin-bottom: 8px;
}

.danger {
  background-color: #ffdddd;
  border-color: var(--danger-color);
}

.danger h4 {
  color: var(--danger-color);
}

.warning {
  background-color: #fff3cd;
  border-color: var(--warning-color);
}

.warning h4 {
  color: #856404;
}

.info {
  background-color: #e7f3fe;
  border-color: var(--info-color);
}

.info h4 {
  color: #0c5460;
}

.success {
  background-color: #d4edda;
  border-color: var(--success-color);
}

.success h4 {
  color: #155724;
}

/* Stili per controlli 3D */
.controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 15px;
}

.btn {
  padding: 5px 10px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background-color: var(--primary-color);
}

.btn-danger {
  background-color: var(--danger-color);
}

.btn-success {
  background-color: var(--success-color);
}

/* Stili per checklist */
.checklist-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.checklist-checkbox {
  margin-right: 10px;
}

/* Modello 3D Container */
.model-container {
  background-color: var(--light-bg);
  border: 1px solid var(--border-color);
  padding: 20px;
  text-align: center;
  margin: 15px 0;
}

/* BOM container */
.bom-container {
  border: 1px solid var(--border-color);
  padding: 10px;
  margin: 15px 0;
}

/* Contenitore file */
.file-container {
  border: 1px solid var(--border-color);
  padding: 10px;
  margin: 15px 0;
}

/* Stili per immagini con caption */
.image-container {
  text-align: center;
  margin: 15px 0;
}

.caption {
  font-style: italic;
  margin-top: 5px;
  color: var(--tertiary-color);
}

/* Video container con stile corrente */
.video-container {
  width: 100%;
  margin: 15px 0;
}

.video-container video {
  width: 100%;
  max-height: 400px;
}

/* Highlight per testi importanti */
.highlight {
  background-color: #fef3c7;
  padding: 2px 4px;
  border-radius: 4px;
}

.step {
  font-weight: bold;
}

.note {
  background-color: #f3f4f6;
  border-left: 4px solid #9ca3af;
  padding: 10px 15px;
  margin: 15px 0;
}
`;

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${cssContent}</style>
</head>
<body>
  ${content}
  
  <script>
    // Rendere interattive le checkbox
    document.addEventListener('DOMContentLoaded', function() {
      // Rendere i checkbox interattivi
      const checkboxes = document.querySelectorAll('.checklist-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
          // Salva lo stato del checkbox nel localStorage
          localStorage.setItem('checkbox-' + checkbox.id, checkbox.checked);
        });
        
        // Ripristina lo stato salvato
        const savedState = localStorage.getItem('checkbox-' + checkbox.id);
        if (savedState === 'true') {
          checkbox.checked = true;
        }
      });
      
      // Per gli iframe dei modelli 3D
      function setupIframeMessaging() {
        window.addEventListener('message', function(event) {
          // Verifica l'origine del messaggio per sicurezza se necessario
          // if (event.origin !== "http://example.com") return;
          
          const iframes = document.querySelectorAll('iframe[id^="model-viewer-"]');
          if (event.data && event.data.action) {
            iframes.forEach(iframe => {
              if (iframe.contentWindow === event.source) {
                // Qui puoi gestire i messaggi ricevuti dall'iframe
                console.log('Received message from iframe:', event.data);
              }
            });
          }
        });
      }
      
      setupIframeMessaging();
    });
    
    // Funzioni per il controllo dei modelli 3D
    function rotateModel(direction, modelId) {
      console.log('Rotate model: ' + direction + ' for model: ' + modelId);
      try {
        const frame = document.getElementById('model-viewer-' + modelId);
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage({
            action: 'rotate',
            direction: direction
          }, '*');
        }
      } catch(e) {
        console.error('Failed to communicate with 3D model:', e);
      }
    }
    
    function zoomModel(direction, modelId) {
      console.log('Zoom model: ' + direction + ' for model: ' + modelId);
      try {
        const frame = document.getElementById('model-viewer-' + modelId);
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage({
            action: 'zoom',
            direction: direction
          }, '*');
        }
      } catch(e) {
        console.error('Failed to communicate with 3D model:', e);
      }
    }
    
    function resetModel(modelId) {
      console.log('Reset model: ' + modelId);
      try {
        const frame = document.getElementById('model-viewer-' + modelId);
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage({
            action: 'reset'
          }, '*');
        }
      } catch(e) {
        console.error('Failed to communicate with 3D model:', e);
      }
    }
  </script>
</body>
</html>
  `;
}

/**
 * Genera contenuto HTML per la guida di Confronto BOM
 * @returns Stringa HTML con la guida formattata
 */
export function generateBomComparisonGuideHtml(): string {
  const title = `<h1>Guida: Come Utilizzare la Funzionalità di Confronto BOM</h1>`;
  
  const intro = `
    <p>
      Questa guida ti mostrerà passo-passo come trovare e utilizzare la funzionalità di confronto 
      delle distinte base (BOM) nell'interfaccia dell'applicazione.
    </p>
  `;
  
  const section1 = `
    <h2>1. Accedere alla Pagina di Confronto BOM</h2>
    <ol>
      <li>Apri l'applicazione nel browser</li>
      <li>Nel menu laterale (sidebar), cerca e clicca su <span class="highlight">Confronto Distinte Base</span> o <span class="highlight">BOM Comparison</span></li>
      <li>Si aprirà la pagina dedicata al confronto delle distinte base</li>
    </ol>
  `;
  
  const section2 = `
    <h2>2. Selezionare le Distinte Base da Confrontare</h2>
    <p>
      Nella pagina di confronto, troverai tre menu a tendina:
    </p>
    <ol>
      <li><span class="step">Documento di riferimento</span>: seleziona un documento esistente che contiene una BOM</li>
      <li><span class="step">Distinta Base di Origine</span>: seleziona la BOM originale dal documento scelto</li>
      <li><span class="step">Nuova Distinta Base</span>: seleziona la nuova BOM che vuoi confrontare con quella originale</li>
    </ol>
    <p>
      Dopo aver selezionato entrambe le distinte, clicca sul pulsante <span class="highlight">Confronta Distinte Base</span>.
    </p>
  `;
  
  const section3 = `
    <h2>3. Visualizzare i Risultati del Confronto</h2>
    <p>
      Una volta completato il confronto, l'applicazione passa automaticamente alla scheda <span class="highlight">Risultati</span> dove puoi vedere:
    </p>
    
    <h3>Riepilogo del confronto</h3>
    <p>
      In alto trovi quattro riquadri con le seguenti informazioni:
    </p>
    <ul>
      <li>Numero totale di codici nella nuova BOM</li>
      <li>Numero di codici comuni tra le due BOM</li>
      <li>Numero di codici non associati (in arancione)</li>
      <li>Percentuale di corrispondenza tra le due BOM</li>
    </ul>
    
    <h3>Elenco dei componenti non associati</h3>
    <p>
      Sotto il riepilogo, se ci sono componenti presenti solo nella nuova BOM, vedrai un box arancione che mostra:
    </p>
    <ul>
      <li>Un'icona triangolare di avviso</li>
      <li>I primi 9 componenti non associati con codice e descrizione</li>
      <li>Un contatore che indica se ci sono altri componenti non mostrati</li>
    </ul>
    
    <h3>Tabella completa</h3>
    <p>
      Più in basso troverai la tabella completa di tutti i componenti della nuova BOM, dove:
    </p>
    <ul>
      <li>I componenti non associati sono evidenziati con sfondo arancione</li>
      <li>I codici non associati hanno un'icona triangolare di avviso accanto</li>
      <li>La colonna "Stato" indica chiaramente "Non Associato" per questi componenti</li>
    </ul>
  `;
  
  const section4 = `
    <h2>4. Creare un Nuovo Documento Basato sul Confronto</h2>
    <p>
      Se vuoi creare un nuovo documento che utilizza la nuova BOM mantenendo le associazioni:
    </p>
    <ol>
      <li>Clicca sul pulsante <span class="highlight">Crea Nuovo Documento</span> in fondo alla pagina</li>
      <li>Nella finestra di dialogo, inserisci un titolo per il nuovo documento</li>
      <li>Nota che il testo informativo spiega che i codici non associati saranno evidenziati in arancione</li>
      <li>Clicca su <span class="highlight">Crea Documento</span> per generare il nuovo documento</li>
    </ol>
    <p>
      Il nuovo documento conterrà tutte le sezioni e i moduli associati ai codici comuni, mentre i codici non associati 
      saranno chiaramente evidenziati per permetterti di gestirli.
    </p>
  `;
  
  const section5 = `
    <h2>5. Dove Vedere i Risultati</h2>
    <p>
      Le evidenziazioni dei componenti non associati sono visibili in diversi punti dell'interfaccia:
    </p>
    <ol>
      <li><span class="step">Nella tabella dei risultati</span>: righe con sfondo arancione</li>
      <li><span class="step">Accanto ai codici</span>: icona triangolare di avviso</li>
      <li><span class="step">Nella sezione di riepilogo</span>: box arancione con l'elenco dei primi componenti non associati</li>
      <li><span class="step">Nel contatore di componenti</span>: numero in arancione che indica quanti componenti non hanno associazioni</li>
    </ol>
  `;
  
  const conclusion = `
    <div class="note">
      <p>
        <strong>Nota:</strong> Questa visualizzazione migliorata ti permette di identificare rapidamente quali componenti 
        richiedono la tua attenzione quando stai aggiornando un documento tecnico da una distinta base originale a una nuova.
      </p>
    </div>
  `;
  
  return title + intro + section1 + section2 + section3 + section4 + section5 + conclusion;
}

/**
 * Crea e scarica la guida in formato HTML
 */
export function downloadBomComparisonGuide() {
  const guideContent = generateBomComparisonGuideHtml();
  const htmlDocument = generateHtml('Guida al Confronto BOM', guideContent);
  downloadTextFile('guida_confronto_bom.html', htmlDocument, 'text/html;charset=utf-8');
}