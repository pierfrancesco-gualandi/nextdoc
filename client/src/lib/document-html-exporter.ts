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
  console.log(`Esportazione in formato html con lingua: ${languageId}`);

  // MODIFICA RADICALE: Usa getDocumentWithTranslations che applica correttamente le traduzioni dai campi TRADUZIONE
  // e assicura che per le lingue diverse dall'italiano vengano usati ESCLUSIVAMENTE i testi tradotti
  
  if (languageId && languageId !== 1) {
    try {
      // Importa la funzione dinamicamente per evitare dipendenze circolari
      const { getDocumentWithTranslations } = await import('./document-translation-utils');
      
      // Recupera il documento con tutte le traduzioni già applicate correttamente
      const result = await getDocumentWithTranslations(document.id, languageId);
      
      // Sostituisci document e sections con quelli già tradotti
      document = result.document;
      sections = result.sections;
      
      console.log(`✅ Documento e sezioni caricate con traduzioni per lingua ${languageId}`);
    } catch (error) {
      console.error('❌ Errore nel caricamento delle traduzioni:', error);
    }
  }
  
  // Valori di default dal documento (che ora potrebbero già essere tradotti)
  let documentTitle = document?.title || 'Documento Esportato';
  let documentDescription = document?.description || '';
  let documentVersion = document?.version || '1.0';
  if (languageId) {
    try {
      // Carica le traduzioni del documento - CORRETTO uso dell'endpoint API
      const documentTranslationResponse = await fetch(`/api/document-translations?documentId=${document.id}&languageId=${languageId}`);
      if (documentTranslationResponse.ok) {
        const documentTranslations = await documentTranslationResponse.json();
        
        // Verifica se abbiamo traduzioni disponibili
        if (documentTranslations && documentTranslations.length > 0) {
          // Prendiamo la prima traduzione disponibile
          const documentTranslation = documentTranslations[0];
          console.log("Dati traduzione documento:", documentTranslation);
          
          // Usa SEMPRE le traduzioni anche se sono stringhe vuote
          if (documentTranslation.title !== undefined) {
            documentTitle = documentTranslation.title;
            console.log(`Titolo tradotto: "${documentTitle}"`);
          } else if (languageId !== 1) { // Se non è italiano
            documentTitle = '';
            console.log(`Titolo documento: Nessuna traduzione, nascosto testo originale`);
          }
          
          if (documentTranslation.description !== undefined) {
            documentDescription = documentTranslation.description;
            console.log(`Descrizione tradotta: "${documentDescription}"`);
          } else if (languageId !== 1) { // Se non è italiano
            documentDescription = '';
            console.log(`Descrizione documento: Nessuna traduzione, nascosto testo originale`);
          }
          
          if (documentTranslation.version !== undefined) {
            documentVersion = documentTranslation.version;
            console.log(`Versione tradotta: "${documentVersion}"`);
          } else if (languageId !== 1) { // Se non è italiano
            documentVersion = '';
            console.log(`Versione documento: Nessuna traduzione, nascosto testo originale`);
          }
        } else {
          console.warn(`Nessuna traduzione del documento trovata per ID=${document.id}, lingua=${languageId}`);
          
          // Se non ci sono traduzioni e non è italiano, nascondi tutti i contenuti originali
          if (languageId !== 1) {
            documentTitle = '';
            documentDescription = '';
            documentVersion = '';
            console.log(`Nessuna traduzione disponibile per il documento, nascosti tutti i testi originali`);
          }
        }
      } else {
        const errorText = await documentTranslationResponse.text();
        console.error(`Errore nel caricamento della traduzione del documento: ${errorText}`);
        
        // In caso di errore, se non è italiano, nascondi tutti i testi originali
        if (languageId !== 1) {
          documentTitle = '';
          documentDescription = '';
          documentVersion = '';
          console.log(`Errore nel caricamento delle traduzioni: nascosti tutti i testi originali`);
        }
      }
      
      // METODO COMPLETO MIGLIORATO: carica direttamente tutte le traduzioni necessarie dall'API
      // Questo garantisce che tutte le traduzioni inserite nei campi vengano utilizzate nell'esportazione
      
      // 1. Carica esplicitamente tutte le traduzioni delle SEZIONI
      try {
        // Recupera tutte le traduzioni di sezioni per la lingua selezionata
        // Utilizziamo il percorso corretto che torna tutto il contenuto tradotto
        const sectionTranslationsResponse = await fetch(`/api/section-translations?languageId=${languageId}`);
        if (sectionTranslationsResponse.ok) {
          const sectionTranslations = await sectionTranslationsResponse.json();
          console.log(`Caricate ${sectionTranslations.length} traduzioni di sezioni`);
          
          // Mappa le traduzioni alle sezioni - applicazione FORZATA delle traduzioni
          sections = sections.map(section => {
            // Cerca la traduzione corrispondente
            const translation = sectionTranslations.find((t: any) => t.sectionId === section.id);
            if (translation) {
              console.log(`Trovata traduzione per la sezione ${section.id} - "${section.title}"`);
              
              // Aggiungi le traduzioni direttamente alla sezione
              return {
                ...section,
                translation: translation,
                translatedContent: translation
              };
            }
            return section;
          });
        } else {
          console.error('Errore nel caricamento delle traduzioni delle sezioni');
        }
      } catch (error) {
        console.error('Errore nel recupero delle traduzioni delle sezioni:', error);
      }
      
      // 2. Carica esplicitamente tutte le traduzioni dei MODULI
      try {
        // Recupera tutte le traduzioni dei moduli PER LA LINGUA SELEZIONATA direttamente dal server
        // Modificato per evitare di caricare tutte le traduzioni e poi filtrarle
        const moduleTranslationsResponse = await fetch(`/api/module-translations?languageId=${languageId}`);
        if (moduleTranslationsResponse.ok) {
          const moduleTranslations = await moduleTranslationsResponse.json();
          console.log(`Caricate ${moduleTranslations.length} traduzioni di moduli per la lingua ${languageId}`);
          
          // Mappa le traduzioni ai moduli - applicazione FORZATA delle traduzioni
          modules = modules.map(module => {
            // Cerca la traduzione corrispondente
            const translation = moduleTranslations.find((t: any) => t.moduleId === module.id);
            if (translation) {
              console.log(`Trovata traduzione per il modulo ${module.id} (tipo: ${module.type})`);
              
              // Prepara il contenuto tradotto come oggetto se è una stringa
              let translatedContentObj = {};
              if (translation.content) {
                try {
                  translatedContentObj = typeof translation.content === 'string' 
                    ? JSON.parse(translation.content) 
                    : translation.content;
                } catch (e) {
                  console.error(`Errore nel parsing del contenuto tradotto per il modulo ${module.id}:`, e);
                  translatedContentObj = {};
                }
              }
              
              // Aggiungi la traduzione direttamente al modulo
              return {
                ...module,
                content: {
                  ...module.content,
                  translatedContent: translatedContentObj
                }
              };
            }
            return module;
          });
        } else {
          console.error('Errore nel caricamento delle traduzioni dei moduli');
        }
      } catch (error) {
        console.error('Errore nel recupero delle traduzioni dei moduli:', error);
      }
    } catch (error) {
      console.error('Errore nel recupero delle traduzioni:', error);
    }
  }
  
  // Dichiarazione della variabile moduleTranslations
  let moduleTranslations: any[] = [];
  
  // Se è specificata una lingua, carica le traduzioni dei moduli
  if (languageId) {
    try {
      // Prova prima l'endpoint esistente per le traduzioni dei moduli di contenuto
      const moduleTranslationsResponse = await fetch(`/api/content-module-translations?languageId=${languageId}`);
      if (moduleTranslationsResponse.ok) {
        moduleTranslations = await moduleTranslationsResponse.json();
        console.log(`🎯 CARICATE ${moduleTranslations.length} traduzioni di moduli per la lingua ${languageId}`);
        
        // Log di debug per verificare le traduzioni caricate
        moduleTranslations.forEach((translation: any) => {
          console.log(`🔍 Traduzione modulo ${translation.moduleId}: ${JSON.stringify(translation.content).substring(0, 50)}...`);
        });
      } else {
        console.error(`❌ Errore nel caricamento delle traduzioni dei moduli: ${moduleTranslationsResponse.status} ${moduleTranslationsResponse.statusText}`);
        // Prova come fallback l'endpoint alternativo
        try {
          const fallbackResponse = await fetch(`/api/module-translations?languageId=${languageId}`);
          if (fallbackResponse.ok) {
            moduleTranslations = await fallbackResponse.json();
            console.log(`🎯 FALLBACK: CARICATE ${moduleTranslations.length} traduzioni di moduli per la lingua ${languageId}`);
          }
        } catch (fallbackError) {
          console.error('❌ Anche il fallback è fallito:', fallbackError);
        }
      }
    } catch (error) {
      console.error('❌ Errore nel recupero delle traduzioni dei moduli:', error);
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
    const buildSectionHtml = (sectionId: number, level: number = 1, moduleTranslations: any[] = []): string => {
      const section = sectionsMap[sectionId];
      if (!section) return '';
      
      // Trova i moduli per questa sezione
      const sectionModules = modules.filter(m => m.sectionId === sectionId);
      
      // Preparazione dei dati della sezione con valori predefiniti (fallback)
      let sectionTitle = section.title || '';
      let sectionDescription = section.description || '';
      
      // Se è specificata una lingua e la sezione esiste, otteniamo la traduzione della sezione
      if (languageId && section) {
        // Ottieni la traduzione della sezione, se disponibile
        const translatedSection = section.translatedContent || section.translation;
        
        if (translatedSection) {
          // Titolo della sezione tradotto - priorità ASSOLUTA
          if (translatedSection.title !== undefined) {
            // Usa SEMPRE la traduzione, anche se è una stringa vuota
            sectionTitle = translatedSection.title;
            console.log(`Sezione ${sectionId}: Usando titolo tradotto "${sectionTitle}" (originale: "${section.title}")`);
          } else {
            // Se manca la traduzione del titolo ma siamo in modalità traduzione, 
            // lasciare vuoto invece di mostrare il titolo originale (priorità assoluta)
            if (languageId) {
              console.log(`Sezione ${sectionId}: ATTENZIONE - Titolo non tradotto in lingua ${languageId}`);
            }
          }
          
          // Descrizione della sezione tradotta - priorità ASSOLUTA
          if (translatedSection.description !== undefined) {
            // Usa SEMPRE la traduzione, anche se è una stringa vuota
            sectionDescription = translatedSection.description;
            console.log(`Sezione ${sectionId}: Usando descrizione tradotta (originale: "${section.description?.substring(0, 20)}...")`);
          } else {
            // Se manca la traduzione della descrizione ma siamo in modalità traduzione,
            // lasciare vuoto invece di mostrare la descrizione originale (priorità assoluta)
            if (languageId) {
              console.log(`Sezione ${sectionId}: ATTENZIONE - Descrizione non tradotta in lingua ${languageId}`);
            }
          }
        } else {
          // Avvisa che non c'è traduzione per questa sezione
          console.log(`Sezione ${sectionId}: ATTENZIONE - Nessuna traduzione trovata per questa sezione in lingua ${languageId}`);
          
          // Se siamo in modalità traduzione ma non c'è alcuna traduzione per questa sezione,
          // NON mostrare i contenuti originali quando si esporta in un'altra lingua
          if (languageId !== 1) { // Se non è italiano (lingua originale)
            sectionTitle = '';
            sectionDescription = '';
            console.log(`Sezione ${sectionId}: Testo originale nascosto per esportazione in lingua ${languageId}`);
          }
        }
      }
      
      let html = '';
      
      // Intestazione della sezione - il livello determina h1, h2, h3, ecc.
      const headingLevel = Math.min(level + 1, 6); // Limita a h6
      
      // Usa numeri di sezione coerenti
      const sectionNumber = section.customNumber || `${sectionId}`;
      
      html += `
        <section id="section-${sectionId}" class="document-section level-${level}">
          <h${headingLevel} class="section-title">
            <span class="section-number">${sectionNumber}</span> ${sectionTitle}
          </h${headingLevel}>
          
          ${sectionDescription ? `<div class="section-description">${sectionDescription}</div>` : ''}
      `;
      
      // Aggiungi il contenuto dei moduli della sezione
      sectionModules.sort((a, b) => a.order - b.order).forEach(module => {
        let content = '';
        
        // Recupera la traduzione specifica per questo modulo
        const moduleTranslation = moduleTranslations.find(t => t.moduleId === module.id && t.languageId === languageId);
        
        switch(module.type) {
          case 'text':
            // Prepara il contenuto testuale
            let textContent = '';
            
            // Determina il contenuto in base alla lingua
            if (languageId !== 1 && moduleTranslation) {
              // Per lingue diverse dall'italiano, usa SOLO il contenuto dal campo TRADUZIONE
              try {
                const translatedData = typeof moduleTranslation.content === 'string' 
                  ? JSON.parse(moduleTranslation.content) 
                  : moduleTranslation.content;
                
                // Usa ESCLUSIVAMENTE il testo tradotto
                textContent = translatedData.text || '';
                console.log(`Modulo testo ${module.id}: Usando ESCLUSIVAMENTE testo tradotto dal campo TRADUZIONE: "${textContent}"`);
              } catch (e) {
                console.error(`Errore nel parsing della traduzione per modulo ${module.id}:`, e);
                textContent = '';
              }
            } else if (languageId === 1) {
              // Solo per italiano, usa il testo originale
              try {
                const moduleContent = typeof module.content === 'string' 
                  ? JSON.parse(module.content)
                  : module.content;
                textContent = moduleContent.text || '';
              } catch (e) {
                console.error(`Errore nel parsing del contenuto originale per modulo ${module.id}:`, e);
                textContent = '';
              }
            } else {
              // Se è richiesta una lingua diversa dall'italiano ma non c'è traduzione, lascia vuoto
              textContent = '';
              console.log(`Modulo testo ${module.id}: Nessuna traduzione disponibile, campo lasciato vuoto`);
            }
            
            content += `
              <div class="text-container">
                ${textContent}
              </div>
            `;
            break;
            
          case 'testp':
            // Prepara i dati del file di testo
            let textpTitle = '';
            let textpDescription = '';
            let textpContent = '';
            
            // Usa valori predefiniti SOLO in italiano
            if (languageId === 1 || languageId === undefined) {
              textpTitle = module.content.title || '';
              textpDescription = module.content.description || '';
              textpContent = module.content.text || '';
            }
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se sono stringhe vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                textpTitle = module.content.translatedContent.title;
                console.log(`Modulo testp ${module.id}: Usando titolo tradotto: "${textpTitle}"`);
              }
              
              // Descrizione tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.description !== undefined) {
                textpDescription = module.content.translatedContent.description;
                console.log(`Modulo testp ${module.id}: Usando descrizione tradotta: "${textpDescription.substring(0, 30)}..."`);
              }
              
              // Testo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.text !== undefined) {
                textpContent = module.content.translatedContent.text;
                console.log(`Modulo testp ${module.id}: Usando testo tradotto: "${textpContent.substring(0, 30)}..."`);
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
            // Prepara i dati dell'immagine
            let imgSrc = module.content.src || '';
            let imgAlt = '';
            let imgCaption = '';
            let imgTitle = '';
            
            // Usa valori predefiniti SOLO in italiano
            if (languageId === 1 || languageId === undefined) {
              imgAlt = module.content.alt || '';
              imgCaption = module.content.caption || '';
              imgTitle = module.content.title || '';
            }
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Alt text - priorità ASSOLUTA
              if (module.content.translatedContent.alt !== undefined) {
                imgAlt = module.content.translatedContent.alt;
                console.log(`Modulo immagine ${module.id}: Usando alt text tradotto: "${imgAlt}"`);
              }
              
              // Didascalia - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                imgCaption = module.content.translatedContent.caption;
                console.log(`Modulo immagine ${module.id}: Usando didascalia tradotta: "${imgCaption}"`);
              }
              
              // Titolo - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                imgTitle = module.content.translatedContent.title;
                console.log(`Modulo immagine ${module.id}: Usando titolo tradotto: "${imgTitle}"`);
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
            // Prepara i dati del video
            let videoThumbnail = module.content.thumbnail || '';
            let videoTitle = '';
            let videoCaption = '';
            
            // Usa valori predefiniti SOLO in italiano
            if (languageId === 1 || languageId === undefined) {
              videoTitle = module.content.title || 'Video';
              videoCaption = module.content.caption || '';
            }
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                videoTitle = module.content.translatedContent.title;
                console.log(`Modulo video ${module.id}: Usando titolo tradotto: "${videoTitle}"`);
              }
              
              // Didascalia tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                videoCaption = module.content.translatedContent.caption;
                console.log(`Modulo video ${module.id}: Usando didascalia tradotta: "${videoCaption}"`);
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
            // Prepara gli elementi tabella
            let tableHeaders = [];
            let tableRows = [];
            let tableCaption = '';
            let tableTitle = '';
            
            // Usa i valori originali solo in italiano
            if (languageId === 1 || languageId === undefined) {
              tableHeaders = module.content.headers || [];
              tableRows = module.content.rows || [];
              tableCaption = module.content.caption || '';
              tableTitle = module.content.title || '';
            }
            
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
                tableTitle = module.content.translatedContent.title;
                console.log(`Modulo tabella ${module.id}: Usando titolo tradotto: ${tableTitle}`);
              }
            }
            
            // Log per debug
            console.log(`Modulo tabella ${module.id} finale:`, { 
              headers: tableHeaders.length, 
              rows: tableRows.length, 
              caption: tableCaption ? 'presente' : 'assente',
              title: tableTitle ? 'presente' : 'assente',
              languageId
            });
            
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
              
              console.log(`Modulo BOM: ${module.id} nella Sezione: ${sectionTitle} ID sezione: ${sectionId}`);
              
              // IMPORTANTE: Utilizziamo le funzioni di fixComponents.js per ottenere la lista componenti corretta
              const specificItems = getSpecificComponentsForSection(sectionId, sectionTitle);
              console.log(`Elementi specifici per sezione ${sectionId}:`, specificItems ? specificItems.length : 'nessuno');
              
              // Controlli specifici per determinate sezioni
              if (isDisegno3DSection(sectionId, sectionTitle)) {
                console.log(`🔍 Cercando items per sezione: ${sectionTitle} ID: ${sectionId}`);
                console.log(`isDisegno3DSection check - ID: ${sectionId}, Titolo: ${sectionTitle}`);
                console.log(`Sezione 3D identificata tramite titolo: ${sectionTitle}`);
                console.log(`✅ Trovati ${specificItems ? specificItems.length : 0} items specifici per la sezione`);
              }
              else if (sectionId === 6 || (sectionTitle && sectionTitle.toLowerCase().includes('descrizione'))) {
                console.log(`🔍 Sezione Descrizione rilevata`);
                if (specificItems && specificItems.length > 0) {
                  console.log(specificItems.length === 1 ? 
                    `✅ Primo modulo BOM nella sezione Descrizione` : 
                    `✅ Secondo modulo BOM nella sezione Descrizione`);
                }
              }
              else if (sectionId === 39 || (sectionTitle && (sectionTitle.toLowerCase().includes('safety') || sectionTitle.toLowerCase().includes('sicurezza')))) {
                console.log(`🔍 Sezione 3.1 Sicurezza rilevata: ${sectionTitle} ID: ${sectionId}`);
                console.log(`✅ Utilizzati componenti specifici per la sezione 3.1`);
              }
              
              // Convertiamo gli elementi nel formato atteso E applichiamo le traduzioni
              let bomItems = [];
              
              if (specificItems && specificItems.length > 0) {
                // Verifica se abbiamo traduzioni disponibili
                const hasTranslations = languageId && 
                                       module.content.translatedContent && 
                                       module.content.translatedContent.descriptions;
                
                if (hasTranslations) {
                  // Convertiamo gli elementi nel formato atteso MA applicando le traduzioni
                  bomItems = specificItems.map((item: any) => {
                    const code = item.code;
                    let description = item.description;
                    
                    // Se abbiamo una traduzione per questo componente, utilizzala SEMPRE
                    if (code && module.content.translatedContent.descriptions[code] !== undefined) {
                      description = module.content.translatedContent.descriptions[code];
                      console.log(`Componente ${code}: Usando descrizione tradotta`);
                    }
                    
                    return {
                      level: item.level,
                      component: {
                        code: code,
                        description: description
                      },
                      quantity: item.quantity
                    };
                  });
                  
                  console.log(`✅ Applicate ${Object.keys(module.content.translatedContent.descriptions).length} traduzioni ai componenti`);
                } else {
                  // Nessuna traduzione disponibile
                  if (languageId !== 1) {
                    // Se non è italiano, nascondi i testi originali utilizzando stringhe vuote
                    bomItems = specificItems.map((item: any) => ({
                      level: item.level,
                      component: {
                        code: item.code,
                        description: '' // Nascondi descrizioni originali
                      },
                      quantity: item.quantity
                    }));
                    console.log(`⚠️ Lingua ${languageId}: Nessuna traduzione disponibile per i componenti, nascondo testi originali`);
                  } else {
                    // Se è italiano, usiamo i valori originali
                    bomItems = specificItems.map((item: any) => ({
                      level: item.level,
                      component: {
                        code: item.code,
                        description: item.description
                      },
                      quantity: item.quantity
                    }));
                    console.log(`⚠️ Nessuna traduzione disponibile per i componenti, mantengo testi in italiano`);
                  }
                }
              } else {
                // Nessun item trovato
                bomItems = [];
                console.log(`⚠️ Nessun componente trovato per questa sezione`);
              }
              
              console.log(`Elementi BOM trasformati: ${bomItems.length} (include N°)`);
              
              // Preparazione dei titoli specifici per determinate sezioni
              let specificTitle = '';
              
              // Determina i titoli specifici in base alla lingua selezionata
              if (languageId === 1 || languageId === undefined) {
                // Se è italiano o nessuna lingua specificata, usa titoli in italiano
                // Verifica se siamo in una sezione particolare e generiamo un titolo specifico
                if (isDisegno3DSection(sectionId, sectionTitle)) {
                  specificTitle = 'Elenco disegno 3D';
                } 
                else if (sectionId === 6 || (sectionTitle && sectionTitle.toLowerCase().includes('descrizione'))) {
                  if (specificItems && specificItems.length > 0) {
                    specificTitle = specificItems.length === 1 ? 
                      'Elenco descrizione 1' : 
                      'Elenco descrizione 2';
                  }
                }
              } else {
                // Per altre lingue, usa titoli in inglese
                if (isDisegno3DSection(sectionId, sectionTitle)) {
                  specificTitle = '3D Drawing List';
                } 
                else if (sectionId === 6 || (sectionTitle && (sectionTitle.toLowerCase().includes('descrizione') || 
                       sectionTitle.toLowerCase().includes('description')))) {
                  if (specificItems && specificItems.length > 0) {
                    specificTitle = specificItems.length === 1 ? 
                      'Description List 1' : 
                      'Description List 2';
                  }
                }
              }
              
              // Genera la tabella HTML direttamente nell'output
              let tableHtml = '';
              if (bomItems.length > 0) {
                // Definizione iniziale delle intestazioni basata sulla lingua selezionata
                let translatedHeaders;
                
                // Se stiamo esportando in italiano, usa intestazioni predefinite in italiano
                if (languageId === 1 || languageId === undefined) {
                  translatedHeaders = {
                    'number': 'N°',
                    'level': 'Livello',
                    'code': 'Codice',
                    'description': 'Descrizione',
                    'quantity': 'Quantità'
                  };
                } else {
                  // Se non è italiano, inizializza con stringhe vuote per evitare testo italiano
                  translatedHeaders = {
                    'number': '',
                    'level': '',
                    'code': '',
                    'description': '',
                    'quantity': ''
                  };
                  console.log(`Modulo BOM ${module.id}: Inizializzato con intestazioni vuote per lingua ${languageId}`);
                }
                
                // Se stiamo esportando con una lingua specifica e c'è una traduzione dal database
                if (languageId && moduleTranslation) {
                  console.log(`🎯 Verificando intestazioni tradotte per modulo BOM ${module.id} dalla traduzione DB:`, moduleTranslation.content);
                  
                  let translatedData;
                  try {
                    translatedData = typeof moduleTranslation.content === 'string' 
                      ? JSON.parse(moduleTranslation.content) 
                      : moduleTranslation.content;
                  } catch (e) {
                    console.error(`Errore nel parsing della traduzione per modulo BOM ${module.id}:`, e);
                    translatedData = {};
                  }
                  
                  // NUOVO COMPORTAMENTO: Usa SEMPRE le traduzioni, anche se sono stringhe vuote
                  // in questo modo garantiamo che vengano usate solo le traduzioni
                  
                  // Intestazioni in formato oggetto (il più comune)
                  if (translatedData.headers && typeof translatedData.headers === 'object') {
                    translatedHeaders = {
                      'number': translatedData.headers.number !== undefined ? 
                        translatedData.headers.number : '',
                      'level': translatedData.headers.level !== undefined ? 
                        translatedData.headers.level : '',
                      'code': translatedData.headers.code !== undefined ? 
                        translatedData.headers.code : '',
                      'description': translatedData.headers.description !== undefined ? 
                        translatedData.headers.description : '',
                      'quantity': translatedData.headers.quantity !== undefined ? 
                        translatedData.headers.quantity : ''
                    };
                    console.log(`🎯 Modulo BOM ${module.id}: Usando SOLO intestazioni tradotte DB in formato oggetto:`, translatedHeaders);
                  } 
                  // Formato alternativo tableHeaders (per retrocompatibilità)
                  else if (translatedData.tableHeaders && typeof translatedData.tableHeaders === 'object') {
                    translatedHeaders = {
                      'number': translatedData.tableHeaders.number !== undefined ? 
                        translatedData.tableHeaders.number : '',
                      'level': translatedData.tableHeaders.level !== undefined ? 
                        translatedData.tableHeaders.level : '',
                      'code': translatedData.tableHeaders.code !== undefined ? 
                        translatedData.tableHeaders.code : '',
                      'description': translatedData.tableHeaders.description !== undefined ? 
                        translatedData.tableHeaders.description : '',
                      'quantity': translatedData.tableHeaders.quantity !== undefined ? 
                        translatedData.tableHeaders.quantity : ''
                    };
                    console.log(`🎯 Modulo BOM ${module.id}: Usando SOLO tableHeaders tradotte DB:`, translatedHeaders);
                  }
                  // Verifica intestazioni come array semplice (formato legacy)
                  else if (Array.isArray(translatedData.headers) && translatedData.headers.length >= 3) {
                    // Formato array semplice [codice, descrizione, quantità]
                    const headers = translatedData.headers;
                    translatedHeaders = {
                      'number': '',  // Usa stringhe vuote invece di valori predefiniti
                      'level': '',
                      'code': headers[0] !== undefined ? headers[0] : '',
                      'description': headers[1] !== undefined ? headers[1] : '',
                      'quantity': headers[2] !== undefined ? headers[2] : ''
                    };
                    console.log(`Modulo BOM ${module.id}: Usando SOLO intestazioni tradotte in formato array:`, translatedHeaders);
                  }
                  // Se non ci sono traduzioni specifiche, usa stringhe vuote per forza
                  else {
                    translatedHeaders = {
                      'number': '',
                      'level': '',
                      'code': '',
                      'description': '',
                      'quantity': ''
                    };
                    console.log(`Modulo BOM ${module.id}: Nessuna intestazione tradotta trovata, usando stringhe vuote`);
                  }
                  
                  // Aggiungi codice di debug per verificare cosa abbiamo ottenuto
                  console.log(`Intestazioni finali per modulo BOM ${module.id}:`, translatedHeaders);
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
                // Ottieni l'etichetta tradotta per "Nessun componente disponibile" dalla traduzione
                let emptyLabel = '';
                
                // Se stiamo esportando in una lingua specifica e il modulo ha traduzioni
                if (languageId && module.content.translatedContent && module.content.translatedContent.messages) {
                  // Cerca il messaggio "empty" nella traduzione
                  if (module.content.translatedContent.messages.empty !== undefined) {
                    emptyLabel = module.content.translatedContent.messages.empty;
                    console.log(`Modulo BOM ${module.id}: Usando messaggio "empty" tradotto: "${emptyLabel}"`);
                  }
                  // Cerca un messaggio generico "noData" o simili
                  else if (module.content.translatedContent.messages.noData !== undefined) {
                    emptyLabel = module.content.translatedContent.messages.noData;
                    console.log(`Modulo BOM ${module.id}: Usando messaggio "noData" tradotto: "${emptyLabel}"`);
                  }
                  // Se non ci sono messaggi tradotti specifici, usa una stringa vuota
                  else {
                    console.log(`Modulo BOM ${module.id}: Nessun messaggio "empty" tradotto trovato, usando stringa vuota`);
                  }
                }
                
                tableHtml = `<p class="bom-empty">${emptyLabel}</p>`;
              }
              
              // Prepara titolo, didascalia e descrizione per il BOM, utilizzando le traduzioni se disponibili
              // Titolo predefinito basato sulla lingua e sul titolo specifico se presente
              let bomTitle = '';
              
              // Se è richiesta una lingua diversa dall'italiano
              if (languageId && languageId !== 1 && moduleTranslation) {
                // Per lingue diverse dall'italiano, usa ESCLUSIVAMENTE la traduzione dal campo TRADUZIONE
                try {
                  const translatedData = typeof moduleTranslation.content === 'string'
                    ? JSON.parse(moduleTranslation.content)
                    : moduleTranslation.content;
                    
                  console.log(`🔍 DEBUG BOM ${module.id}: Dati traduzione completi:`, translatedData);
                    
                  // Usa SOLO il titolo dal campo TRADUZIONE
                  bomTitle = translatedData.title || '';
                  console.log(`🎯 Modulo BOM ${module.id}: Usando ESCLUSIVAMENTE titolo tradotto dal campo TRADUZIONE: "${bomTitle}"`);
                } catch (e) {
                  console.error(`❌ Errore nel parsing della traduzione per modulo BOM ${module.id}:`, e);
                  bomTitle = '';
                }
              } else {
                console.log(`⚠️ DEBUG BOM ${module.id}: Nessuna traduzione trovata per languageId=${languageId}, moduleTranslation=`, moduleTranslation);
              }
              // Se è italiano o nessuna lingua specificata
              else if (languageId === 1) {
                // Usa il titolo originale, il titolo specifico o valore predefinito in italiano
                bomTitle = module.content.title || specificTitle || 'Elenco Componenti';
              } else {
                // Se non c'è traduzione disponibile, lascia il campo vuoto
                bomTitle = '';
                console.log(`Modulo BOM ${module.id}: Nessuna traduzione disponibile, campo titolo lasciato vuoto`);
              }
              // Inizializza caption e description vuoti per sicurezza
              let bomCaption = '';
              let bomDescription = '';
              
              // Se è richiesta una lingua diversa dall'italiano
              if (languageId && languageId !== 1 && moduleTranslation) {
                // Per lingue diverse dall'italiano, usa ESCLUSIVAMENTE le traduzioni dal campo TRADUZIONE
                try {
                  const translatedData = typeof moduleTranslation.content === 'string'
                    ? JSON.parse(moduleTranslation.content)
                    : moduleTranslation.content;
                    
                  // Usa SOLO la didascalia e descrizione dal campo TRADUZIONE
                  bomCaption = translatedData.caption || '';
                  bomDescription = translatedData.description || '';
                  console.log(`Modulo BOM ${module.id}: Usando ESCLUSIVAMENTE testi tradotti dal campo TRADUZIONE`);
                  console.log(`-- Didascalia: "${bomCaption}"`);
                  console.log(`-- Descrizione: "${bomDescription}"`);
                } catch (e) {
                  console.error(`Errore nel parsing della traduzione per modulo BOM ${module.id}:`, e);
                  bomCaption = '';
                  bomDescription = '';
                }
              } else if (languageId === 1) {
                // Solo per italiano, usa i valori originali
                bomCaption = module.content.caption || '';
                bomDescription = module.content.description || '';
              } else {
                // Se è richiesta una lingua diversa dall'italiano ma non c'è traduzione, lascia vuoto
                bomCaption = '';
                bomDescription = '';
                console.log(`Modulo BOM ${module.id}: Nessuna traduzione disponibile, campi lasciati vuoti`);
              }
              
              // Usa SEMPRE le traduzioni quando disponibili, anche se vuote
              if (languageId && module.content.translatedContent) {
                // Titolo tradotto - priorità ASSOLUTA
                if (module.content.translatedContent.title !== undefined) {
                  bomTitle = module.content.translatedContent.title;
                  console.log(`Modulo BOM ${module.id}: Usando titolo tradotto: "${bomTitle}"`);
                } else {
                  // Se non c'è traduzione del titolo ma siamo in modalità traduzione,
                  // usa una stringa vuota invece del titolo di default
                  bomTitle = '';
                  console.log(`Modulo BOM ${module.id}: Nessuna traduzione per il titolo, usando stringa vuota`);
                }
                
                // Didascalia tradotta - priorità ASSOLUTA
                if (module.content.translatedContent.caption !== undefined) {
                  bomCaption = module.content.translatedContent.caption;
                  console.log(`Modulo BOM ${module.id}: Usando didascalia tradotta: "${bomCaption}"`);
                }
                
                // Descrizione tradotta - priorità ASSOLUTA
                if (module.content.translatedContent.description !== undefined) {
                  bomDescription = module.content.translatedContent.description;
                  console.log(`Modulo BOM ${module.id}: Usando descrizione tradotta: "${bomDescription}"`);
                }
              }
              
              bomHtml = `
                <figure class="bom-container">
                  ${bomTitle ? `<h3 class="bom-title">${bomTitle}</h3>` : ''}
                  <div class="bom-content">
                    ${tableHtml}
                  </div>
                  ${bomCaption ? `<figcaption class="module-caption">${bomCaption}</figcaption>` : 
                    (bomDescription ? `<figcaption class="module-caption">${bomDescription}</figcaption>` : '')}
                </figure>
              `;
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : 'Errore sconosciuto';
              
              // Messaggi di errore tradotti
              let errorTitle = '';
              let errorMsg = '';
              let bomCaption = '';
              let bomTitle = '';
              
              // Usa SEMPRE e SOLO le traduzioni se disponibili
              if (languageId && module.content.translatedContent) {
                // Titolo tradotto
                if (module.content.translatedContent.title !== undefined) {
                  bomTitle = module.content.translatedContent.title;
                  console.log(`Modulo BOM ${module.id} errore: Usando titolo tradotto: "${bomTitle}"`);
                }
                
                // Messaggio errore tradotto
                if (module.content.translatedContent.errorTitle !== undefined) {
                  errorTitle = module.content.translatedContent.errorTitle;
                  console.log(`Modulo BOM ${module.id} errore: Usando errore tradotto: "${errorTitle}"`);
                }
                
                // Messaggio di errore tradotto
                if (module.content.translatedContent.errorMessage !== undefined) {
                  errorMsg = module.content.translatedContent.errorMessage;
                  console.log(`Modulo BOM ${module.id} errore: Usando messaggio errore tradotto: "${errorMsg}"`);
                }
                
                // Didascalia tradotta
                if (module.content.translatedContent.caption !== undefined) {
                  bomCaption = module.content.translatedContent.caption;
                  console.log(`Modulo BOM ${module.id} errore: Usando didascalia tradotta: "${bomCaption}"`);
                }
              }
              
              bomHtml = `
                <figure class="bom-container">
                  ${bomTitle ? `<h3 class="bom-title">${bomTitle}</h3>` : ''}
                  <div class="bom-content">
                    ${errorTitle ? `<p>${errorTitle}</p>` : ''}
                    ${errorMsg ? `
                      <div class="message warning">
                        <div class="message-body">
                          <p>${errorMsg}</p>
                        </div>
                      </div>
                    ` : ''}
                  </div>
                  ${bomCaption ? `<figcaption class="module-caption">${bomCaption}</figcaption>` : ''}
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
            // Prepara i dati della checklist con valori predefiniti (fallback)
            let checklistItems = module.content.items || [];
            let checklistTitle = module.content.title || '';
            let checklistCaption = module.content.caption || '';
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se sono vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                checklistTitle = module.content.translatedContent.title;
                console.log(`Modulo checklist ${module.id}: Usando titolo tradotto`);
              }
              
              // Didascalia tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                checklistCaption = module.content.translatedContent.caption;
                console.log(`Modulo checklist ${module.id}: Usando didascalia tradotta`);
              }
              
              // Elementi della checklist tradotti - priorità ASSOLUTA
              if (module.content.translatedContent.items !== undefined) {
                if (Array.isArray(module.content.translatedContent.items)) {
                  // Crea nuovi elementi unendo il flag 'checked' originale con il testo tradotto
                  checklistItems = checklistItems.map((item, index) => {
                    const translatedItem = module.content.translatedContent.items[index];
                    // Usa la traduzione se esiste per questo elemento specifico
                    if (translatedItem && translatedItem.text !== undefined) {
                      return {
                        ...item,
                        text: translatedItem.text
                      };
                    }
                    // Se siamo in modalità traduzione ma non c'è traduzione per questo elemento,
                    // restituisci una stringa vuota invece del testo originale
                    if (languageId !== 1) { // Se non è italiano (lingua originale)
                      return {
                        ...item,
                        text: ''
                      };
                    }
                    return item;
                  });
                  console.log(`Modulo checklist ${module.id}: Usando elementi tradotti`);
                }
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
              
              // Messaggi di errore tradotti
              let errorMsg = 'Errore: Percorso del file mancante';
              let fileCaption = module.content.caption || '';
              
              // Usa traduzioni se disponibili
              if (languageId && module.content.translatedContent) {
                // Messaggio di errore tradotto
                if (module.content.translatedContent.errorMsg !== undefined) {
                  errorMsg = module.content.translatedContent.errorMsg;
                } else if (languageId === 2) { // inglese
                  errorMsg = 'Error: File path missing';
                }
                
                // Didascalia tradotta - priorità ASSOLUTA
                if (module.content.translatedContent.caption !== undefined) {
                  fileCaption = module.content.translatedContent.caption;
                }
              }
              
              content += `
                <figure class="file-container">
                  <p class="file-error">${errorMsg}</p>
                  ${fileCaption ? `<figcaption class="module-caption">${fileCaption}</figcaption>` : ''}
                </figure>
              `;
              break;
            }
            
            // Prepara i dati del file con valori predefiniti (fallback)
            let fileTitle = module.content.title || '';
            let fileCaption = module.content.caption || module.content.description || '';
            let fileFilename = module.content.filename || module.content.src.split('/').pop() || 'File';
            let fileLabel = 'Nome file:';
            let downloadText = 'Scarica file';
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                fileTitle = module.content.translatedContent.title;
                console.log(`Modulo file ${module.id}: Usando titolo tradotto`);
              }
              
              // Didascalia tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                fileCaption = module.content.translatedContent.caption;
                console.log(`Modulo file ${module.id}: Usando didascalia tradotta`);
              } else if (module.content.translatedContent.description !== undefined) {
                fileCaption = module.content.translatedContent.description;
                console.log(`Modulo file ${module.id}: Usando descrizione tradotta come didascalia`);
              }
              
              // Filename tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.filename !== undefined) {
                fileFilename = module.content.translatedContent.filename;
                console.log(`Modulo file ${module.id}: Usando filename tradotto`);
              }
              
              // Etichette tradotte - priorità ASSOLUTA
              if (module.content.translatedContent.labels) {
                if (module.content.translatedContent.labels.fileLabel !== undefined) {
                  fileLabel = module.content.translatedContent.labels.fileLabel;
                  console.log(`Modulo file ${module.id}: Usando etichetta file tradotta`);
                }
                if (module.content.translatedContent.labels.download !== undefined) {
                  downloadText = module.content.translatedContent.labels.download;
                  console.log(`Modulo file ${module.id}: Usando testo download tradotto`);
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
            // Prepara i dati dell'avviso con valori predefiniti (fallback)
            let dangerTitle = 'PERICOLO';
            let dangerMessage = module.content.message || module.content.text || 'Questo è un messaggio di PERICOLO';
            let dangerDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              dangerMessage = "Rimuovere il carter e non toccare la cinghia di trasmissione";
            }
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                dangerTitle = module.content.translatedContent.title;
                console.log(`Modulo danger ${module.id}: Usando titolo tradotto`);
              } else if (languageId !== 1) {
                // Traduzioni predefinite se non è italiano
                dangerTitle = 'DANGER';
              }
              
              // Messaggio tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.message !== undefined) {
                dangerMessage = module.content.translatedContent.message;
                console.log(`Modulo danger ${module.id}: Usando messaggio tradotto`);
              } else if (module.content.translatedContent.text !== undefined) {
                dangerMessage = module.content.translatedContent.text;
                console.log(`Modulo danger ${module.id}: Usando testo tradotto come messaggio`);
              }
              
              // Descrizione tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.description !== undefined) {
                dangerDescription = module.content.translatedContent.description;
                console.log(`Modulo danger ${module.id}: Usando descrizione tradotta`);
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
            // Prepara i dati dell'avviso con valori predefiniti (fallback)
            let warningTitle = 'AVVERTENZA';
            let warningMessage = module.content.message || module.content.text || 'Questo è un messaggio di AVVERTENZA';
            let warningDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              warningMessage = "Non avviare la macchina con i ripari aperti o danneggiati";
            }
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                warningTitle = module.content.translatedContent.title;
                console.log(`Modulo warning ${module.id}: Usando titolo tradotto`);
              } else if (languageId !== 1) {
                // Se non è italiano e non c'è traduzione, usa stringa vuota
                warningTitle = '';
                console.log(`Modulo warning ${module.id}: Nessuna traduzione del titolo, nascondendo testo originale`);
              }
              
              // Messaggio tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.message !== undefined) {
                warningMessage = module.content.translatedContent.message;
                console.log(`Modulo warning ${module.id}: Usando messaggio tradotto: "${warningMessage.substring(0, 30)}..."`);
              } else if (module.content.translatedContent.text !== undefined) {
                warningMessage = module.content.translatedContent.text;
                console.log(`Modulo warning ${module.id}: Usando testo tradotto come messaggio: "${warningMessage.substring(0, 30)}..."`);
              } else if (languageId !== 1) {
                // Se non c'è traduzione e non è italiano, nascondi il messaggio originale
                warningMessage = '';
                console.log(`Modulo warning ${module.id}: Nessuna traduzione per il messaggio, nascosto testo originale`);
              }
              
              // Descrizione tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.description !== undefined) {
                warningDescription = module.content.translatedContent.description;
                console.log(`Modulo warning ${module.id}: Usando descrizione tradotta`);
              } else if (languageId !== 1) {
                // Se non è italiano e non c'è traduzione, usa stringa vuota
                warningDescription = '';
                console.log(`Modulo warning ${module.id}: Nessuna traduzione della descrizione, nascondendo testo originale`);
              }
            } else if (languageId !== 1) {
              // Se non è italiano e non ci sono traduzioni per il modulo, nascondi tutti i testi
              warningTitle = '';
              warningMessage = '';
              warningDescription = '';
              console.log(`Modulo warning ${module.id}: Nessuna traduzione per il modulo, nascondendo tutti i testi originali`);
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
            // Prepara i dati dell'avviso con valori predefiniti (fallback)
            let cautionTitle = 'ATTENZIONE';
            let cautionMessage = module.content.message || module.content.text || 'Questo è un messaggio di ATTENZIONE';
            let cautionDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              cautionMessage = "Assicurarsi che tutti i dispositivi di sicurezza siano correttamente installati prima dell'avvio";
            }
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                cautionTitle = module.content.translatedContent.title;
                console.log(`Modulo caution ${module.id}: Usando titolo tradotto`);
              } else if (languageId !== 1) {
                // Traduzioni predefinite se non è italiano
                cautionTitle = 'CAUTION';
              }
              
              // Messaggio tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.message !== undefined) {
                cautionMessage = module.content.translatedContent.message;
                console.log(`Modulo caution ${module.id}: Usando messaggio tradotto`);
              } else if (module.content.translatedContent.text !== undefined) {
                cautionMessage = module.content.translatedContent.text;
                console.log(`Modulo caution ${module.id}: Usando testo tradotto come messaggio`);
              }
              
              // Descrizione tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.description !== undefined) {
                cautionDescription = module.content.translatedContent.description;
                console.log(`Modulo caution ${module.id}: Usando descrizione tradotta`);
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
            // Prepara i dati della nota con valori predefiniti (fallback)
            let noteTitle = 'NOTA';
            let noteMessage = module.content.message || module.content.text || 'Questo è un messaggio informativo';
            let noteDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              noteMessage = "Consultare il manuale tecnico per i dettagli completi di installazione";
            }
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                noteTitle = module.content.translatedContent.title;
                console.log(`Modulo note ${module.id}: Usando titolo tradotto`);
              } else if (languageId !== 1) {
                // Traduzioni predefinite se non è italiano
                noteTitle = 'NOTE';
              }
              
              // Messaggio tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.message !== undefined) {
                noteMessage = module.content.translatedContent.message;
                console.log(`Modulo note ${module.id}: Usando messaggio tradotto`);
              } else if (module.content.translatedContent.text !== undefined) {
                noteMessage = module.content.translatedContent.text;
                console.log(`Modulo note ${module.id}: Usando testo tradotto come messaggio`);
              }
              
              // Descrizione tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.description !== undefined) {
                noteDescription = module.content.translatedContent.description;
                console.log(`Modulo note ${module.id}: Usando descrizione tradotta`);
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
            // Prepara i dati delle istruzioni di sicurezza con valori predefiniti (fallback)
            let safetyTitle = 'ISTRUZIONI DI SICUREZZA';
            let safetyMessage = module.content.message || module.content.text || 'Segui queste istruzioni di sicurezza';
            let safetyDescription = module.content.description || '';
            
            // Esempio di testo specifico per determinate sezioni
            if(section && (section.id === 20 || (section.title && section.title.includes("3")))) {
              safetyMessage = "Utilizzare sempre dispositivi di protezione individuale durante le operazioni di manutenzione";
            }
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Titolo tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                safetyTitle = module.content.translatedContent.title;
                console.log(`Modulo safety ${module.id}: Usando titolo tradotto`);
              } else if (languageId !== 1) {
                // Traduzioni predefinite se non è italiano
                safetyTitle = 'SAFETY INSTRUCTIONS';
              }
              
              // Messaggio tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.message !== undefined) {
                safetyMessage = module.content.translatedContent.message;
                console.log(`Modulo safety ${module.id}: Usando messaggio tradotto`);
              } else if (module.content.translatedContent.text !== undefined) {
                safetyMessage = module.content.translatedContent.text;
                console.log(`Modulo safety ${module.id}: Usando testo tradotto come messaggio`);
              }
              
              // Descrizione tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.description !== undefined) {
                safetyDescription = module.content.translatedContent.description;
                console.log(`Modulo safety ${module.id}: Usando descrizione tradotta`);
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
            // Prepara i dati del link con valori predefiniti (fallback)
            let linkUrl = module.content.url || '';
            let linkText = module.content.text || module.content.url || 'Link';
            let linkCaption = module.content.caption || module.content.description || '';
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Testo del link tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.text !== undefined) {
                linkText = module.content.translatedContent.text;
                console.log(`Modulo link ${module.id}: Usando testo tradotto`);
              }
              
              // Didascalia tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                linkCaption = module.content.translatedContent.caption;
                console.log(`Modulo link ${module.id}: Usando didascalia tradotta`);
              } else if (module.content.translatedContent.description !== undefined) {
                linkCaption = module.content.translatedContent.description;
                console.log(`Modulo link ${module.id}: Usando descrizione tradotta come didascalia`);
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
            // Prepara i dati del modello 3D con valori predefiniti (fallback)
            // Inizializza con valori adatti alla lingua
            let modelTitle = '';
            let modelCaption = '';
            let modelViewLabel = '';
            let modelDownloadLabel = '';
            let modelInstructions = '';
            
            // Solo se è italiano, usa i valori predefiniti in italiano
            if (languageId === 1 || languageId === undefined) {
              modelTitle = module.content.title || '3D Model';
              modelCaption = module.content.caption || '';
              modelViewLabel = 'Visualizza modello 3D con tutti i componenti';
              modelDownloadLabel = 'Scarica il modello completo (.zip)';
              modelInstructions = 'Questo modello 3D richiede file esterni specifici per funzionare correttamente. Utilizza il pulsante qui sotto per visualizzare il modello con tutti i componenti.';
            } else {
              // Per altre lingue, inizializza con valori predefiniti in inglese
              modelTitle = module.content.title || '3D Model';
              modelCaption = '';
              modelViewLabel = 'View 3D model with all components';
              modelDownloadLabel = 'Download complete model (.zip)';
              modelInstructions = 'This 3D model requires specific external files to work correctly. Use the button below to view the model with all components.';
            }
            
            // Utilizza SEMPRE le traduzioni quando disponibili, anche se vuote
            if (languageId && module.content.translatedContent) {
              // Titolo del modello tradotto - priorità ASSOLUTA
              if (module.content.translatedContent.title !== undefined) {
                modelTitle = module.content.translatedContent.title;
                console.log(`Modulo 3D ${module.id}: Usando titolo tradotto`);
              }
              
              // Didascalia tradotta - priorità ASSOLUTA
              if (module.content.translatedContent.caption !== undefined) {
                modelCaption = module.content.translatedContent.caption;
                console.log(`Modulo 3D ${module.id}: Usando didascalia tradotta`);
              }
              
              // Etichette tradotte per il modello 3D - priorità ASSOLUTA
              if (module.content.translatedContent.labels) {
                // Usa le etichette tradotte se presenti
                if (module.content.translatedContent.labels.viewModel !== undefined) {
                  modelViewLabel = module.content.translatedContent.labels.viewModel;
                  console.log(`Modulo 3D ${module.id}: Usando etichetta viewModel tradotta`);
                }
                if (module.content.translatedContent.labels.download !== undefined) {
                  modelDownloadLabel = module.content.translatedContent.labels.download;
                  console.log(`Modulo 3D ${module.id}: Usando etichetta download tradotta`);
                }
                if (module.content.translatedContent.labels.instructions !== undefined) {
                  modelInstructions = module.content.translatedContent.labels.instructions;
                  console.log(`Modulo 3D ${module.id}: Usando istruzioni tradotte`);
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
            // Modulo non gestito con supporto traduzione
            let unsupportedMsg = `Tipo di modulo '${module.type}' non supportato nell'esportazione HTML.`;
            
            // Usa traduzioni se disponibili
            if (languageId && module.content.translatedContent) {
              // Messaggio errore tradotto
              if (module.content.translatedContent.unsupportedMsg !== undefined) {
                unsupportedMsg = module.content.translatedContent.unsupportedMsg;
              } else if (languageId === 2) { // inglese
                unsupportedMsg = `Module type '${module.type}' not supported in HTML export.`;
              }
            }
            
            content += `
              <div class="unknown-module">
                <p>${unsupportedMsg}</p>
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
      mainContent += buildSectionHtml(section.id, 1, moduleTranslations);
    });
    
    // Data corrente per il footer
    const currentDate = new Date();
    
    // Traduzioni per elementi statici del documento
    let documentFooterText = 'Documento generato il';
    let versionLabel = 'Versione:';
    let documentLang = 'it';
    let bomEmptyLabel = 'Nessun elemento trovato nella distinta base'; // Usato nella riga 528
    
    // Carica le traduzioni delle etichette statiche dal server 
    // oppure dalla cache locale se disponibili
    if (languageId) {
      try {
        // Tenta di caricare le traduzioni statiche personalizzate dal server
        const staticLabelsResponse = await fetch(`/api/static-labels?languageId=${languageId}`);
        if (staticLabelsResponse.ok) {
          const staticLabels = await staticLabelsResponse.json();
          
          // Usa le traduzioni personalizzate SEMPRE, anche se vuote
          if (staticLabels) {
            if (staticLabels.documentFooterText !== undefined) {
              documentFooterText = staticLabels.documentFooterText;
              console.log(`Usando footer tradotto: "${documentFooterText}"`);
            }
            
            if (staticLabels.versionLabel !== undefined) {
              versionLabel = staticLabels.versionLabel;
              console.log(`Usando etichetta versione tradotta: "${versionLabel}"`);
            }
            
            if (staticLabels.bomEmptyLabel !== undefined) {
              bomEmptyLabel = staticLabels.bomEmptyLabel;
              console.log(`Usando label BOM vuoto tradotta: "${bomEmptyLabel}"`);
            }
          }
        }
      } catch (error) {
        console.warn('Errore nel caricamento delle etichette statiche dal server:', error);
      }
      
      // Fallback sul codice lingua e traduzioni predefinite se necessario
      if (languageId === 2) { // Inglese
        documentLang = 'en';
        
        // Usa questi valori solo se non sono stati impostati tramite API
        if (documentFooterText === 'Documento generato il') documentFooterText = 'Document generated on';
        if (versionLabel === 'Versione:') versionLabel = 'Version:';
        if (bomEmptyLabel === 'Nessun elemento trovato nella distinta base') 
          bomEmptyLabel = 'No items found in the bill of materials';
      } else if (languageId === 3) { // Francese
        documentLang = 'fr';
        
        // Usa questi valori solo se non sono stati impostati tramite API
        if (documentFooterText === 'Documento generato il') documentFooterText = 'Document généré le';
        if (versionLabel === 'Versione:') versionLabel = 'Version:';
      } else if (languageId === 4) { // Tedesco
        documentLang = 'de';
        
        // Usa questi valori solo se non sono stati impostati tramite API
        if (documentFooterText === 'Documento generato il') documentFooterText = 'Dokument erstellt am';
        if (versionLabel === 'Versione:') versionLabel = 'Version:';
      } else if (languageId === 5) { // Spagnolo
        documentLang = 'es';
        
        // Usa questi valori solo se non sono stati impostati tramite API
        if (documentFooterText === 'Documento generato il') documentFooterText = 'Documento generado el';
        if (versionLabel === 'Versione:') versionLabel = 'Versión:';
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