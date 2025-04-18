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
    
    // Aggiungi le sezioni e i moduli
    for (const section of document.sections) {
      content += `
        <h2>${section.title}</h2>
        <p>${section.description || ''}</p>
      `;
      
      // Aggiungi i moduli della sezione
      for (const module of section.modules) {
        switch (module.type) {
          case 'text':
            content += `<div>${module.content.text}</div>`;
            break;
            
          case 'image':
            content += `
              <div style="text-align: center; margin: 15px 0;">
                <img src="${module.content.src}" alt="${module.content.alt || ''}" style="max-width: 100%;" />
                ${module.content.caption ? `<p><em>${module.content.caption}</em></p>` : ''}
              </div>
            `;
            break;
            
          case 'video':
            content += `
              <div style="text-align: center; margin: 15px 0;">
                <video controls style="max-width: 100%;">
                  <source src="${module.content.src}" type="video/${module.content.format || 'mp4'}">
                  Il tuo browser non supporta i video HTML5.
                </video>
                ${module.content.caption ? `<p><em>${module.content.caption}</em></p>` : ''}
              </div>
            `;
            break;
            
          case 'warning':
            const warningColor = module.content.level === 'error' ? '#ffdddd' : 
                                 module.content.level === 'warning' ? '#fff3cd' : '#d1ecf1';
            content += `
              <div style="background-color: ${warningColor}; padding: 10px; border-left: 4px solid #b22222; margin: 15px 0;">
                <h4 style="margin: 0;">${module.content.title}</h4>
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
            // Supporto migliorato per moduli 3D
            content += `
              <div style="text-align: center; margin: 15px 0; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
                <h4>Modello 3D</h4>
                <p><strong>File:</strong> ${module.content.title || module.content.src || 'Modello 3D'}</p>
                <iframe src="${module.content.src}" style="width: 100%; height: 400px; border: 1px solid #ddd;"></iframe>
                <p><em>Nota: Se il modello 3D non viene visualizzato correttamente, utilizza l'applicazione originale per la visualizzazione completa.</em></p>
              </div>
            `;
            break;
            
          case 'bom':
            // Supporto migliorato per BOM: prova a recuperare la distinta
            try {
              content += `
                <div style="margin: 15px 0; padding: 10px; border: 1px solid #ddd;">
                  <h4>Distinta Base (BOM)</h4>
                  <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; margin-top: 10px;">
                    <thead>
                      <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Livello</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Codice</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Descrizione</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Quantità</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;" colspan="4">
                          La distinta completa è disponibile nell'applicazione originale (ID Distinta: ${module.content.bomId})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              `;
            } catch (e) {
              content += `
                <div style="margin: 15px 0; padding: 10px; border: 1px solid #ddd;">
                  <h4>Distinta Base (BOM) - ID: ${module.content.bomId}</h4>
                  <p>La distinta base completa è disponibile nell'applicazione originale.</p>
                </div>
              `;
            }
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
                  ${(module.content.items || []).map((item: any) => 
                    `<li style="margin-bottom: 8px;">
                      <input type="checkbox" ${item.checked ? 'checked' : ''} disabled> 
                      <span>${item.text}</span>
                    </li>`
                  ).join('')}
                </ul>
              </div>
            `;
            break;
            
          case 'file':
          case 'pdf':
            const filename = module.content.filename || module.content.src || 'File';
            content += `
              <div style="margin: 15px 0; padding: 10px; border: 1px solid #ddd;">
                <h4>File Allegato</h4>
                <p><strong>Nome file:</strong> ${filename}</p>
                <p><a href="${module.content.src}" target="_blank" style="color: #2563eb; text-decoration: underline;">Scarica il file</a></p>
              </div>
            `;
            break;
            
          // Aggiunta di tipi di avviso specifici
          case 'danger':
            content += `
              <div style="background-color: #ffdddd; padding: 15px; border-left: 6px solid #f44336; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #f44336;">PERICOLO</h4>
                <p>${module.content.message || module.content.text || ''}</p>
              </div>
            `;
            break;
            
          case 'caution':
          case 'warning-alert':
            content += `
              <div style="background-color: #fff3cd; padding: 15px; border-left: 6px solid #ffc107; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #856404;">AVVERTENZA</h4>
                <p>${module.content.message || module.content.text || ''}</p>
              </div>
            `;
            break;
            
          case 'note':
            content += `
              <div style="background-color: #e7f3fe; padding: 15px; border-left: 6px solid #2196F3; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #0c5460;">NOTA</h4>
                <p>${module.content.message || module.content.text || ''}</p>
              </div>
            `;
            break;
            
          case 'safety-instructions':
            content += `
              <div style="background-color: #d4edda; padding: 15px; border-left: 6px solid #28a745; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #155724;">ISTRUZIONI DI SICUREZZA</h4>
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
    
    // Genera il documento HTML completo
    const htmlDocument = generateHtml(document.title, content);
    
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
  } catch (error) {
    console.error('Errore durante l\'esportazione PDF:', error);
    // Notifica l'utente che può sempre usare l'esportazione HTML come alternativa
    alert(`Si è verificato un errore durante l'esportazione PDF: ${error.message}\n\nÈ comunque disponibile l'esportazione HTML come alternativa.`);
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
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2563eb;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #4b5563;
      margin-top: 25px;
    }
    h3 {
      color: #6b7280;
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
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 10px 15px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  ${content}
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