import { saveAs } from 'file-saver';
import { isDisegno3DSection, generateComponentsListHtml, getSpecificComponentsForSection } from './fixComponents';

/**
 * Esporta un documento in formato HTML
 * @param document Il documento da esportare
 * @param sections Le sezioni del documento
 * @param modules I moduli di contenuto
 * @param languageId ID della lingua di destinazione per traduzione (opzionale)
 */
export async function exportDocumentHtml(document: any, sections: any[], modules: any[], languageId?: string | number) {
  // Valori di default dal documento originale - usati SOLO se non ci sono traduzioni
  let documentTitle = document?.title || 'Documento Esportato';
  let documentDescription = document?.description || '';
  let documentVersion = document?.version || '1.0';
  
  // Se è specificata una lingua, cerchiamo la traduzione del documento
  if (languageId) {
    try {
      const documentTranslationResponse = await fetch(`/api/document-translations/${document.id}?languageId=${languageId}`);
      if (documentTranslationResponse.ok) {
        const documentTranslation = await documentTranslationResponse.json();
        
        // PRIORITÀ ASSOLUTA alle traduzioni se presenti
        if (documentTranslation) {
          // Usa SEMPRE le traduzioni anche se sono stringhe vuote
          if (documentTranslation.title !== undefined) {
            documentTitle = documentTranslation.title;
            console.log(`Titolo tradotto: "${documentTitle}"`);
          }
          
          if (documentTranslation.description !== undefined) {
            documentDescription = documentTranslation.description;
            console.log(`Descrizione tradotta: "${documentDescription}"`);
          }
          
          if (documentTranslation.version !== undefined) {
            documentVersion = documentTranslation.version;
            console.log(`Versione tradotta: "${documentVersion}"`);
          }
        }
      } else {
        console.warn(`Traduzione del documento non trovata per la lingua ${languageId}`);
      }
    } catch (error) {
      console.error('Errore nel recupero della traduzione del documento:', error);
    }
  }
  
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
            // Utilizza SEMPRE il testo tradotto quando disponibile, anche se vuoto
            // Il testo originale è solo un fallback
            let textContent = module.content.text || '';
            
            // Verifica se ci sono traduzioni disponibili per questo modulo
            if (languageId && module.content.translatedContent) {
              // Se la traduzione esiste (anche se è vuota), la utilizziamo SEMPRE
              if (module.content.translatedContent.text !== undefined) {
                textContent = module.content.translatedContent.text;
                console.log(`Modulo testo ${module.id}: Usando testo tradotto`);
              } else {
                console.log(`Modulo testo ${module.id}: Traduzione non disponibile, usando testo originale`);
              }
            }
            
            content += `
              <div class="text-container">
                ${textContent}
              </div>
            `;
            break;
            
          case 'testp':
            // Prepara i dati del file di testo con valori predefiniti (fallback)
            let textpTitle = module.content.title || '';
            let textpDescription = module.content.description || '';
            let textpContent = module.content.text || '';
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se sono stringhe vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                textpTitle = module.content.translatedContent.title;
                console.log(`Modulo testp ${module.id}: Usando titolo tradotto`);
              }
              
              // Descrizione tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.description !== undefined) {
                textpDescription = module.content.translatedContent.description;
                console.log(`Modulo testp ${module.id}: Usando descrizione tradotta`);
              }
              
              // Testo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.text !== undefined) {
                textpContent = module.content.translatedContent.text;
                console.log(`Modulo testp ${module.id}: Usando testo tradotto`);
              }
            }
            
            content += `
              <div class="text-container testp-container">
                ${textpTitle ? `<h4 class="testp-title">${textpTitle}</h4>` : ''}
                ${textpDescription ? `<p class="testp-description">${textpDescription}</p>` : ''}
                <div class="testp-content">
                  ${textpContent}
                </div>
              </div>
            `;
            break;
            
          case 'image':
            // Prepara i dati dell'immagine con valori predefiniti (fallback)
            let imgSrc = module.content.src || '';
            let imgAlt = module.content.alt || '';
            let imgCaption = module.content.caption || '';
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Alt text - priorità ASSOLUTA
              if (module.content.translatedContent.alt !== undefined) {
                imgAlt = module.content.translatedContent.alt;
                console.log(`Modulo immagine ${module.id}: Usando alt text tradotto`);
              }
              
              // Didascalia - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                imgCaption = module.content.translatedContent.caption;
                console.log(`Modulo immagine ${module.id}: Usando didascalia tradotta`);
              }
              
              // Titolo - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                console.log(`Modulo immagine ${module.id}: Usando titolo tradotto`);
              }
            }
            
            content += `
              <figure class="image-container">
                <img src="${imgSrc}" alt="${imgAlt}" class="content-image" />
                ${imgCaption ? `<figcaption class="module-caption">${imgCaption}</figcaption>` : ''}
              </figure>
            `;
            break;
            
          case 'video':
            // Prepara i dati del video con valori predefiniti (fallback)
            let videoThumbnail = module.content.thumbnail || '';
            let videoTitle = module.content.title || 'Video';
            let videoCaption = module.content.caption || '';
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                videoTitle = module.content.translatedContent.title;
                console.log(`Modulo video ${module.id}: Usando titolo tradotto`);
              }
              
              // Didascalia tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                videoCaption = module.content.translatedContent.caption;
                console.log(`Modulo video ${module.id}: Usando didascalia tradotta`);
              }
            }
            
            // Messaggio in base alla lingua
            const videoMessage = languageId ? 'The video is available in the original application.' : 'Il video è disponibile nell\'applicazione originale.';
            
            content += `
              <figure class="video-container">
                <div class="video-placeholder">
                  <p>${videoMessage}</p>
                  <p>${videoTitle}</p>
                  <img src="${videoThumbnail}" alt="Video thumbnail" class="video-thumbnail" />
                </div>
                ${videoCaption ? `<figcaption class="module-caption">${videoCaption}</figcaption>` : ''}
              </figure>
            `;
            break;
            
          case 'table':
            // Prepara gli elementi tabella utilizzando valori predefiniti (fallback)
            let tableHeaders = module.content.headers || [];
            let tableRows = module.content.rows || [];
            let tableCaption = module.content.caption || '';
            
            // PRIORITÀ ASSOLUTA alle traduzioni, anche se sono array vuoti o stringhe vuote
            if (languageId && module.content.translatedContent) {
              // Intestazioni tradotte - priorità ASSOLUTA
              if (module.content.translatedContent.headers !== undefined) {
                // Usa SEMPRE la traduzione se esiste
                tableHeaders = Array.isArray(module.content.translatedContent.headers) 
                  ? module.content.translatedContent.headers 
                  : [];
                console.log(`Modulo tabella ${module.id}: Usando intestazioni tradotte`);
              }
              
              // Righe tradotte - priorità ASSOLUTA  
              if (module.content.translatedContent.rows !== undefined) {
                // Usa SEMPRE la traduzione se esiste
                tableRows = Array.isArray(module.content.translatedContent.rows) 
                  ? module.content.translatedContent.rows 
                  : [];
                console.log(`Modulo tabella ${module.id}: Usando righe tradotte`);
              }
              
              // Didascalia tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                tableCaption = module.content.translatedContent.caption;
                console.log(`Modulo tabella ${module.id}: Usando didascalia tradotta`);
              }
              
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                console.log(`Modulo tabella ${module.id}: Usando titolo tradotto`);
              }
            }
            
            content += `
              <figure class="table-container">
                <table>
                  <thead>
                    <tr>
                      ${tableHeaders.map((header: string) => 
                        `<th>${header}</th>`
                      ).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRows.map((row: string[]) => 
                      `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
                    ).join('')}
                  </tbody>
                </table>
                ${tableCaption ? `<figcaption class="module-caption">${tableCaption}</figcaption>` : ''}
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
                // Definizioni delle intestazioni predefinite (in italiano)
                const defaultHeaders = {
                  'number': 'N°',
                  'level': 'Livello',
                  'code': 'Codice',
                  'description': 'Descrizione',
                  'quantity': 'Quantità'
                };
                
                // Traduzioni predefinite (in inglese) da usare se non ci sono traduzioni personalizzate
                const defaultTranslations = {
                  'number': 'N.',
                  'level': 'Level',
                  'code': 'Code',
                  'description': 'Description',
                  'quantity': 'Qty'
                };
                
                // Ottieni le intestazioni tradotte dal modulo se disponibili
                let translatedHeaders = defaultHeaders;
                
                // Se stiamo esportando con una lingua specifica e il modulo ha traduzioni
                if (languageId && module.content.translatedContent && module.content.translatedContent.headers) {
                  // Usa le traduzioni fornite dall'utente o le traduzioni predefinite
                  translatedHeaders = {
                    'number': module.content.translatedContent.headers.number || defaultTranslations.number,
                    'level': module.content.translatedContent.headers.level || defaultTranslations.level,
                    'code': module.content.translatedContent.headers.code || defaultTranslations.code,
                    'description': module.content.translatedContent.headers.description || defaultTranslations.description,
                    'quantity': module.content.translatedContent.headers.quantity || defaultTranslations.quantity
                  };
                }
                
                tableHtml = `
                  <table class="bom-table">
                    <thead>
                      <tr>
                        <th>${translatedHeaders.number}</th>
                        <th>${translatedHeaders.level}</th>
                        <th>${translatedHeaders.code}</th>
                        <th>${translatedHeaders.description}</th>
                        <th>${translatedHeaders.quantity}</th>
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
                <figure class="bom-container">
                  <div class="bom-content">
                    ${tableHtml}
                  </div>
                  ${module.content.caption ? `<figcaption class="module-caption">${module.content.caption}</figcaption>` : 
                    (module.content.description ? `<figcaption class="module-caption">${module.content.description}</figcaption>` : '')}
                </figure>
              `;
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : 'Errore sconosciuto';
              bomHtml = `
                <figure class="bom-container">
                  <div class="bom-content">
                    <p>La distinta base completa è disponibile nell'applicazione originale.</p>
                    <div class="message warning">
                      <div class="message-body">
                        <p>Errore nel caricamento della distinta: ${errorMessage}</p>
                      </div>
                    </div>
                  </div>
                  ${module.content.caption ? `<figcaption class="module-caption">${module.content.caption}</figcaption>` : ''}
                </figure>
              `;
            }
            
            content += bomHtml;
            break;
            
          case 'component':
            // Prepara i dati del componente con valori predefiniti (fallback)
            let componentCaption = module.content.caption || '';
            let componentLabels = {
              id: 'ID Componente',
              qty: 'Quantità'
            };
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Didascalia tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                componentCaption = module.content.translatedContent.caption;
                console.log(`Modulo componente ${module.id}: Usando didascalia tradotta`);
              }
              
              // Etichette tradotte - priorità ASSOLUTA
              if (module.content.translatedContent.labels) {
                if (module.content.translatedContent.labels.id !== undefined) {
                  componentLabels.id = module.content.translatedContent.labels.id;
                  console.log(`Modulo componente ${module.id}: Usando etichetta ID tradotta`);
                }
                if (module.content.translatedContent.labels.qty !== undefined) {
                  componentLabels.qty = module.content.translatedContent.labels.qty;
                  console.log(`Modulo componente ${module.id}: Usando etichetta quantità tradotta`);
                }
              }
            }
            
            content += `
              <figure class="component-container">
                <div class="component-content">
                  <table>
                    <tr>
                      <th>${componentLabels.id}</th>
                      <td>${module.content.componentId}</td>
                    </tr>
                    <tr>
                      <th>${componentLabels.qty}</th>
                      <td>${module.content.quantity}</td>
                    </tr>
                  </table>
                </div>
                ${componentCaption ? `<figcaption class="module-caption">${componentCaption}</figcaption>` : ''}
              </figure>
            `;
            break;
            
          case 'checklist':
            // Verifica se ci sono traduzioni disponibili per questo modulo
            let checklistItems = module.content.items || [];
            let checklistTitle = module.content.title || '';
            let checklistCaption = module.content.caption || '';
            
            // Utilizza le traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Aggiorna il titolo se disponibile nella traduzione
              if (module.content.translatedContent.title) {
                checklistTitle = module.content.translatedContent.title;
              }
              
              // Aggiorna la didascalia se disponibile nella traduzione
              if (module.content.translatedContent.caption) {
                checklistCaption = module.content.translatedContent.caption;
              }
              
              // Aggiorna gli elementi della checklist se disponibili nella traduzione
              if (Array.isArray(module.content.translatedContent.items)) {
                // Crea nuovi elementi unendo il flag 'checked' originale con il testo tradotto
                checklistItems = checklistItems.map((item, index) => {
                  const translatedItem = module.content.translatedContent.items[index];
                  if (translatedItem && translatedItem.text) {
                    return {
                      ...item,
                      text: translatedItem.text
                    };
                  }
                  return item;
                });
              }
            }
            
            content += `
              <figure class="checklist-container">
                ${checklistTitle ? `<h4 class="checklist-title">${checklistTitle}</h4>` : ''}
                <ul class="checklist">
                  ${checklistItems.map((item: any, index: number) => 
                    `<li class="checklist-item">
                      <input type="checkbox" id="checkbox-${module.id}-${index}" class="checklist-checkbox" ${item.checked ? 'checked' : ''}> 
                      <label for="checkbox-${module.id}-${index}">${item.text}</label>
                    </li>`
                  ).join('')}
                </ul>
                ${checklistCaption ? `<figcaption class="module-caption">${checklistCaption}</figcaption>` : ''}
              </figure>
            `;
            break;
            
          case 'file':
          case 'pdf':
            // Verifica se esiste un percorso src prima di utilizzarlo
            if (!module.content?.src) {
              console.warn('File/PDF senza percorso src:', module);
              content += `
                <figure class="file-container">
                  <p class="file-error">Errore: Percorso del file mancante</p>
                  ${module.content.caption ? `<figcaption class="module-caption">${module.content.caption}</figcaption>` : ''}
                </figure>
              `;
              break;
            }
            
            // Prepara i dati del file con valori predefiniti
            let fileTitle = module.content.title || '';
            let fileCaption = module.content.caption || module.content.description || '';
            let fileFilename = module.content.filename || module.content.src.split('/').pop() || 'File';
            let fileLabel = 'Nome file:';
            let downloadText = 'Scarica file';
            
            // Utilizza le traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto
              if (module.content.translatedContent.title) {
                fileTitle = module.content.translatedContent.title;
              }
              
              // Didascalia/descrizione tradotta
              if (module.content.translatedContent.caption) {
                fileCaption = module.content.translatedContent.caption;
              } else if (module.content.translatedContent.description) {
                fileCaption = module.content.translatedContent.description;
              }
              
              // Adatta l'etichetta e il testo di download alla lingua
              if (module.content.translatedContent.labels) {
                // Usa le etichette tradotte se presenti
                if (module.content.translatedContent.labels.fileLabel) {
                  fileLabel = module.content.translatedContent.labels.fileLabel;
                }
                if (module.content.translatedContent.labels.download) {
                  downloadText = module.content.translatedContent.labels.download;
                }
              } else if (languageId && languageId !== 1) { // Se non è italiano e non ci sono etichette tradotte
                fileLabel = 'File name:';
                downloadText = 'Download file';
              }
            }
            
            // Verifica se il percorso è relativo o assoluto
            const fileSrc = module.content.src.startsWith('/') ? 
              window.location.origin + module.content.src :
              module.content.src;
            
            content += `
              <figure class="file-container">
                <div class="file-info">
                  ${fileTitle ? `<p><strong>${fileTitle}</strong></p>` : ''}
                  <p><strong>${fileLabel}</strong> ${fileFilename}</p>
                  <a href="${fileSrc}" target="_blank" class="download-button">
                    <span class="download-icon">⬇</span> ${downloadText}
                  </a>
                </div>
                ${fileCaption ? `<figcaption class="module-caption text-center">${fileCaption}</figcaption>` : ''}
              </figure>
            `;
            break;
            
          // Aggiunta di tipi di avviso specifici con miglioramenti visivi, icone e testi
          case 'danger':
            // Prepara i dati dell'avviso con valori predefiniti
            let dangerTitle = 'PERICOLO';
            let dangerMessage = module.content.message || module.content.text || 'Questo è un messaggio di PERICOLO';
            let dangerDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              dangerMessage = "Rimuovere il carter e non toccare la cinghia di trasmissione";
            }
            
            // Utilizza le traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto
              if (module.content.translatedContent.title) {
                dangerTitle = module.content.translatedContent.title;
              } else if (languageId !== 1) {
                // Traduzioni predefinite se non è italiano
                dangerTitle = 'DANGER';
              }
              
              // Messaggio tradotto
              if (module.content.translatedContent.message || module.content.translatedContent.text) {
                dangerMessage = module.content.translatedContent.message || module.content.translatedContent.text;
              }
              
              // Descrizione tradotta
              if (module.content.translatedContent.description) {
                dangerDescription = module.content.translatedContent.description;
              }
            }
              
            content += `
              <div class="message danger" style="background-color: #ff0000; color: white; border: none;">
                <div class="message-header" style="color: white;">
                  <span class="message-icon" style="color: white;">&#9888;</span> <!-- ⚠️ -->
                  <h4 style="color: white;">${dangerTitle}</h4>
                </div>
                <div class="message-body" style="color: white;">
                  <p style="color: white;">${dangerMessage}</p>
                  ${dangerDescription ? `<p class="warning-description" style="color: white;">${dangerDescription}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'warning-alert':
            // Prepara i dati dell'avviso con valori predefiniti
            let warningTitle = 'AVVERTENZA';
            let warningMessage = module.content.message || module.content.text || 'Questo è un messaggio di AVVERTENZA';
            let warningDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              warningMessage = "Non avviare la macchina con i ripari aperti o danneggiati";
            }
            
            // Utilizza le traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto
              if (module.content.translatedContent.title) {
                warningTitle = module.content.translatedContent.title;
              } else if (languageId !== 1) {
                // Traduzioni predefinite se non è italiano
                warningTitle = 'WARNING';
              }
              
              // Messaggio tradotto
              if (module.content.translatedContent.message || module.content.translatedContent.text) {
                warningMessage = module.content.translatedContent.message || module.content.translatedContent.text;
              }
              
              // Descrizione tradotta
              if (module.content.translatedContent.description) {
                warningDescription = module.content.translatedContent.description;
              }
            }
              
            content += `
              <div class="message warning" style="background-color: #ff8c00; color: white; border: none;">
                <div class="message-header" style="color: white;">
                  <span class="message-icon" style="color: white;">&#9888;</span> <!-- ⚠️ -->
                  <h4 style="color: white;">${warningTitle}</h4>
                </div>
                <div class="message-body" style="color: white;">
                  <p style="color: white;">${warningMessage}</p>
                  ${warningDescription ? `<p class="warning-description" style="color: white;">${warningDescription}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'caution':
            // Prepara i dati dell'avviso con valori predefiniti
            let cautionTitle = 'ATTENZIONE';
            let cautionMessage = module.content.message || module.content.text || 'Questo è un messaggio di ATTENZIONE';
            let cautionDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              cautionMessage = "Assicurarsi che tutti i dispositivi di sicurezza siano correttamente installati prima dell'avvio";
            }
            
            // Utilizza le traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto
              if (module.content.translatedContent.title) {
                cautionTitle = module.content.translatedContent.title;
              } else if (languageId !== 1) {
                // Traduzioni predefinite se non è italiano
                cautionTitle = 'CAUTION';
              }
              
              // Messaggio tradotto
              if (module.content.translatedContent.message || module.content.translatedContent.text) {
                cautionMessage = module.content.translatedContent.message || module.content.translatedContent.text;
              }
              
              // Descrizione tradotta
              if (module.content.translatedContent.description) {
                cautionDescription = module.content.translatedContent.description;
              }
            }
              
            content += `
              <div class="message caution" style="background-color: #ffd600; color: white; border: none;">
                <div class="message-header" style="color: white;">
                  <span class="message-icon" style="color: white;">&#9888;</span> <!-- ⚠️ -->
                  <h4 style="color: white;">${cautionTitle}</h4>
                </div>
                <div class="message-body" style="color: white;">
                  <p style="color: white;">${cautionMessage}</p>
                  ${cautionDescription ? `<p class="warning-description" style="color: white;">${cautionDescription}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'note':
            // Prepara i dati della nota con valori predefiniti
            let noteTitle = 'NOTA';
            let noteMessage = module.content.message || module.content.text || 'Questo è un messaggio informativo';
            let noteDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              noteMessage = "Consultare il manuale tecnico per i dettagli completi di installazione";
            }
            
            // Utilizza le traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto
              if (module.content.translatedContent.title) {
                noteTitle = module.content.translatedContent.title;
              } else if (languageId !== 1) {
                // Traduzioni predefinite se non è italiano
                noteTitle = 'NOTE';
              }
              
              // Messaggio tradotto
              if (module.content.translatedContent.message || module.content.translatedContent.text) {
                noteMessage = module.content.translatedContent.message || module.content.translatedContent.text;
              }
              
              // Descrizione tradotta
              if (module.content.translatedContent.description) {
                noteDescription = module.content.translatedContent.description;
              }
            }
              
            content += `
              <div class="message info" style="background-color: #0070d1; color: white; border: none;">
                <div class="message-header" style="color: white;">
                  <span class="message-icon" style="color: white;">&#9432;</span> <!-- ℹ️ -->
                  <h4 style="color: white;">${noteTitle}</h4>
                </div>
                <div class="message-body" style="color: white;">
                  <p style="color: white;">${noteMessage}</p>
                  ${noteDescription ? `<p class="warning-description" style="color: white;">${noteDescription}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'safety-instructions':
            // Prepara i dati delle istruzioni di sicurezza con valori predefiniti
            let safetyTitle = 'ISTRUZIONI DI SICUREZZA';
            let safetyMessage = module.content.message || module.content.text || 'Segui queste istruzioni di sicurezza';
            let safetyDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              safetyMessage = "Utilizzare sempre dispositivi di protezione individuale durante le operazioni di manutenzione";
            }
            
            // Utilizza le traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto
              if (module.content.translatedContent.title) {
                safetyTitle = module.content.translatedContent.title;
              } else if (languageId !== 1) {
                // Traduzioni predefinite se non è italiano
                safetyTitle = 'SAFETY INSTRUCTIONS';
              }
              
              // Messaggio tradotto
              if (module.content.translatedContent.message || module.content.translatedContent.text) {
                safetyMessage = module.content.translatedContent.message || module.content.translatedContent.text;
              }
              
              // Descrizione tradotta
              if (module.content.translatedContent.description) {
                safetyDescription = module.content.translatedContent.description;
              }
            }
              
            content += `
              <div class="message success" style="background-color: #2e7d32; color: white; border: none;">
                <div class="message-header" style="color: white;">
                  <span class="message-icon" style="color: white;">&#10003;</span> <!-- ✓ -->
                  <h4 style="color: white;">${safetyTitle}</h4>
                </div>
                <div class="message-body" style="color: white;">
                  <p style="color: white;">${safetyMessage}</p>
                  ${safetyDescription ? `<p class="warning-description" style="color: white;">${safetyDescription}</p>` : ''}
                </div>
              </div>
            `;
            break;
            
          case 'link':
            // Prepara i dati del link con valori predefiniti
            let linkUrl = module.content.url || '';
            let linkText = module.content.text || module.content.url || 'Link';
            let linkCaption = module.content.caption || module.content.description || '';
            
            // Utilizza le traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Testo del link tradotto
              if (module.content.translatedContent.text) {
                linkText = module.content.translatedContent.text;
              }
              
              // Didascalia tradotta
              if (module.content.translatedContent.caption) {
                linkCaption = module.content.translatedContent.caption;
              } else if (module.content.translatedContent.description) {
                linkCaption = module.content.translatedContent.description;
              }
            }
            
            content += `
              <figure class="link-container">
                <div class="link-content">
                  <a href="${linkUrl}" target="_blank" class="external-link">
                    <span class="link-icon">🔗</span> ${linkText}
                  </a>
                </div>
                ${linkCaption ? `<figcaption class="module-caption text-center">${linkCaption}</figcaption>` : ''}
              </figure>
            `;
            break;
            
          case 'threeDModel':
            // Prepara i dati del modello 3D con valori predefiniti
            let modelTitle = module.content.title || '3D Model';
            let modelCaption = module.content.caption || '';
            let modelViewLabel = 'Visualizza modello 3D con tutti i componenti';
            let modelDownloadLabel = 'Scarica il modello completo (.zip)';
            let modelInstructions = 'Questo modello 3D richiede file esterni specifici per funzionare correttamente. Utilizza il pulsante qui sotto per visualizzare il modello con tutti i componenti.';
            
            // Utilizza le traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Titolo del modello tradotto
              if (module.content.translatedContent.title) {
                modelTitle = module.content.translatedContent.title;
              }
              
              // Didascalia tradotta
              if (module.content.translatedContent.caption) {
                modelCaption = module.content.translatedContent.caption;
              }
              
              // Etichette tradotte per il modello 3D
              if (module.content.translatedContent.labels) {
                // Usa le etichette tradotte se presenti
                if (module.content.translatedContent.labels.viewModel) {
                  modelViewLabel = module.content.translatedContent.labels.viewModel;
                }
                if (module.content.translatedContent.labels.download) {
                  modelDownloadLabel = module.content.translatedContent.labels.download;
                }
                if (module.content.translatedContent.labels.instructions) {
                  modelInstructions = module.content.translatedContent.labels.instructions;
                }
              } else if (languageId && languageId !== 1) {
                // Default in inglese se non ci sono etichette tradotte e non è italiano
                modelViewLabel = 'View 3D model with all components';
                modelDownloadLabel = 'Download complete model (.zip)';
                modelInstructions = 'This 3D model requires specific external files to function correctly. Use the button below to view the model with all components.';
              }
            }
            
            // Nel caso dell'esportazione HTML, mostriamo un'interfaccia completa per interagire con il modello 3D
            content += `
              <figure class="threeDModel-container">
                <div class="threeDModel-content">
                  ${modelTitle ? `<h4 class="threeDModel-title">${modelTitle}</h4>` : ''}
                  <div class="threeDModel-wrapper">
                    <p class="threeDModel-instructions">${modelInstructions}</p>
                    <div class="threeDModel-actions">
                      <a href="#" class="threeDModel-button view-button">
                        <span class="button-icon">🔄</span> ${modelViewLabel}
                      </a>
                      <a href="#" class="threeDModel-button download-button">
                        <span class="button-icon">⬇</span> ${modelDownloadLabel}
                      </a>
                    </div>
                  </div>
                </div>
                ${modelCaption ? `<figcaption class="module-caption">${modelCaption}</figcaption>` : ''}
              </figure>
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
      
      /* Stili per il modulo testp */
      .testp-container {
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin: 1.5rem 0;
        background-color: #f8fafc;
      }
      
      .testp-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: #1e293b;
      }
      
      .testp-description {
        font-style: italic;
        color: #64748b;
        margin-bottom: 1rem;
        padding-left: 1rem;
        border-left: 3px solid #cbd5e1;
      }
      
      .testp-content {
        padding: 0.5rem;
        background-color: white;
        border-radius: 0.375rem;
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
      
      figcaption, .module-caption {
        margin-top: 10px;
        font-style: italic;
        color: #666;
        font-size: 0.9em;
        text-align: center;
        display: block;
        width: 100%;
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
        border-width: 0;
        border-style: solid;
        color: white;
      }
      
      .message-header {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        font-weight: bold;
        color: white;
      }
      
      .message-icon {
        font-size: 1.5em;
        margin-right: 10px;
        color: white;
      }
      
      .message-body {
        font-size: 0.95em;
        color: white;
      }
      
      .message-body p {
        color: white;
      }
      
      .warning-description {
        color: white;
        font-style: italic;
      }
      
      /* PERICOLO: Rosso intenso */
      .message.danger {
        background-color: #ff0000;
        border-color: #ff0000;
      }
      
      /* AVVERTENZA: Arancione intenso */
      .message.warning {
        background-color: #ff8c00;
        border-color: #ff8c00;
      }
      
      /* ATTENZIONE: Giallo intenso */
      .message.caution {
        background-color: #ffd600;
        border-color: #ffd600;
      }
      
      /* NOTA: Blu intenso */
      .message.info {
        background-color: #0070d1;
        border-color: #0070d1;
      }
      
      /* ISTRUZIONI DI SICUREZZA: Verde intenso */
      .message.success {
        background-color: #2e7d32;
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
      
      /* Stili per i modelli 3D */
      .threeDModel-container {
        margin: 20px 0;
        padding: 15px;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 5px;
        text-align: center;
      }
      
      .threeDModel-content {
        padding: 20px;
        background-color: #f9f9f9;
        border-radius: 5px;
      }
      
      .threeDModel-title {
        margin-top: 0;
        color: #333;
        margin-bottom: 15px;
        font-size: 1.2em;
      }
      
      .threeDModel-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        padding: 20px;
        background-color: #eee;
        border-radius: 5px;
      }
      
      .threeDModel-instructions {
        color: #555;
        line-height: 1.5;
        margin-bottom: 15px;
        max-width: 600px;
        text-align: center;
      }
      
      .threeDModel-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-width: 350px;
      }
      
      .threeDModel-button {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px 15px;
        border-radius: 5px;
        text-decoration: none;
        font-weight: bold;
        color: white;
        transition: all 0.2s ease;
      }
      
      .threeDModel-button.view-button {
        background-color: #2a80eb;
      }
      
      .threeDModel-button.download-button {
        background-color: #0066cc;
      }
      
      .threeDModel-button:hover {
        opacity: 0.9;
        transform: translateY(-2px);
      }
      
      .button-icon {
        margin-right: 8px;
        font-size: 1.2em;
      }
      
      /* Stili legacy per compatibilità */
      .threeDModel-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: #e9e9e9;
        border: 1px dashed #ccc;
        padding: 30px;
        border-radius: 5px;
      }
      
      .threeDModel-icon {
        font-size: 32px;
        margin-bottom: 15px;
        color: #0070d1;
      }
      
      .threeDModel-message {
        font-style: italic;
        color: #666;
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
    
    // Traduzioni per elementi statici del documento
    let documentFooterText = 'Documento generato il';
    let versionLabel = 'Versione:';
    let documentLang = 'it';
    
    // Imposta la lingua e le traduzioni statiche in base alla lingua selezionata
    if (languageId) {
      if (languageId === 2) { // Inglese
        documentFooterText = 'Document generated on';
        versionLabel = 'Version:';
        documentLang = 'en';
      } else if (languageId === 3) { // Francese
        documentFooterText = 'Document généré le';
        versionLabel = 'Version:';
        documentLang = 'fr';
      } else if (languageId === 4) { // Tedesco
        documentFooterText = 'Dokument erstellt am';
        versionLabel = 'Version:';
        documentLang = 'de';
      } else if (languageId === 5) { // Spagnolo
        documentFooterText = 'Documento generado el';
        versionLabel = 'Versión:';
        documentLang = 'es';
      }
      // Puoi aggiungere altre lingue se necessario
    }
    
    // Formatta la data in base alla lingua selezionata
    const dateString = currentDate.toLocaleDateString(documentLang === 'it' ? 'it-IT' : documentLang === 'en' ? 'en-US' : documentLang === 'fr' ? 'fr-FR' : documentLang === 'de' ? 'de-DE' : documentLang === 'es' ? 'es-ES' : 'it-IT');
    
    // Costruisci l'HTML completo
    const html = `
      <!DOCTYPE html>
      <html lang="${documentLang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${documentTitle}</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="document-container">
          <header class="document-header">
            <h1 class="document-title">${documentTitle}</h1>
            <p class="document-description">${documentDescription}</p>
            <p class="document-version">${versionLabel} ${documentVersion}</p>
          </header>
          
          <main class="document-content">
            ${mainContent}
          </main>
          
          <footer class="document-footer">
            <p>${documentFooterText} ${dateString}</p>
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
      
      // Nome del file con il titolo tradotto
      const filename = `${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      
      // Scarica il file
      saveAs(blob, filename);
      
      return processedHtml;
    } catch (error) {
      console.error("Errore nel post-processing, utilizzo versione originale:", error);
      
      // In caso di errore, usa la versione originale
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const filename = `${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      saveAs(blob, filename);
      
      return html;
    }
  } catch (error) {
    console.error('Errore durante l\'esportazione HTML:', error);
    alert('Si è verificato un errore durante l\'esportazione HTML.');
    return '';
  }
}