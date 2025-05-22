/**
 * Utility per la gestione delle traduzioni di documenti
 */

/**
 * Funzione che raccoglie tutti i campi traducibili da un documento, sezioni e moduli
 * @param documentId ID del documento
 * @param languageId ID della lingua per traduzione (opzionale)
 * @returns Documento completo con campi traducibili organizzati
 */
export async function getDocumentWithTranslations(documentId: string | number, languageId?: string | number) {
  try {
    console.log(`Recupero documento ${documentId} con traduzioni per lingua ${languageId}`);
    
    // 1. Recupera il documento di base
    const documentResponse = await fetch(`/api/documents/${documentId}`);
    if (!documentResponse.ok) throw new Error('Errore nel recupero del documento');
    const document = await documentResponse.json();
    
    // 1.1 Recupera la traduzione del documento (titolo, versione, descrizione)
    if (languageId) {
      try {
        const documentTranslationResponse = await fetch(`/api/document-translations?documentId=${documentId}&languageId=${languageId}`);
        if (documentTranslationResponse.ok) {
          const documentTranslations = await documentTranslationResponse.json();
          if (documentTranslations && documentTranslations.length > 0) {
            // Sostituisci i campi principali del documento con le traduzioni
            const translation = documentTranslations[0];
            console.log(`Trovata traduzione documento: ${translation.title}`);
            
            // SEMPRE usa i campi tradotti, anche se vuoti
            document.title = translation.title || "";
            document.description = translation.description || "";
            document.version = translation.version || "";
          }
        }
      } catch (error) {
        console.error(`Errore nel recupero della traduzione del documento:`, error);
      }
    }
    // 2. Recupera tutte le sezioni del documento
    const sectionsResponse = await fetch(`/api/documents/${documentId}/sections`);
    if (!sectionsResponse.ok) throw new Error('Errore nel recupero delle sezioni');
    const sections = await sectionsResponse.json();
    
    // 3. Preparazione mappe per traduzioni (se richieste)
    let sectionTranslations: Record<number, any> = {};
    let moduleTranslations: Record<number, any> = {};
    
    if (languageId) {
      try {
        // 3.1 Recupera le traduzioni delle sezioni
        const sectionTranslationsResponse = await fetch(`/api/section-translations?documentId=${documentId}&languageId=${languageId}`);
        if (sectionTranslationsResponse.ok) {
          const sectionTranslationsData = await sectionTranslationsResponse.json();
          sectionTranslations = sectionTranslationsData.reduce((acc: Record<number, any>, translation: any) => {
            acc[translation.sectionId] = translation;
            return acc;
          }, {});
        }
        
        // 3.2 Recupera le traduzioni dei moduli usando l'endpoint esistente
        const moduleTranslationsResponse = await fetch(`/api/module-translations?languageId=${languageId}`);
        if (moduleTranslationsResponse.ok) {
          const moduleTranslationsData = await moduleTranslationsResponse.json();
          moduleTranslations = moduleTranslationsData.reduce((acc: Record<number, any>, translation: any) => {
            acc[translation.moduleId] = translation;
            return acc;
          }, {});
        }
      } catch (error) {
        console.error('Errore nel recupero delle traduzioni:', error);
      }
    }
    
    // 4. Per ogni sezione, recupera i moduli e applica traduzioni
    const sectionsWithContent = await Promise.all(sections.map(async (section: any) => {
      // 4.1 Recupera moduli della sezione
      const modulesResponse = await fetch(`/api/sections/${section.id}/modules`);
      let modules = [];
      if (modulesResponse.ok) {
        modules = await modulesResponse.json();
      }
      
      // 4.2 Applica traduzioni alla sezione
      if (languageId && sectionTranslations[section.id]) {
        const translation = sectionTranslations[section.id];
        // SEMPRE sostituisci i campi con le traduzioni, anche se sono vuote
        // Così garantiamo che vengano usate solo le traduzioni
        section.title = translation.title || '';  // Se non c'è traduzione, usa stringa vuota
        section.description = translation.description || ''; // Se non c'è traduzione, usa stringa vuota
      }
      
      // 4.3 Applica traduzioni ai moduli
      const modulesWithTranslations = modules.map((module: any) => {
        const moduleTranslation = moduleTranslations[module.id];
        if (languageId && moduleTranslation) {
          try {
            let translatedContent;
            if (typeof moduleTranslation.content === 'string') {
              translatedContent = JSON.parse(moduleTranslation.content);
            } else {
              translatedContent = moduleTranslation.content;
            }
            
            // Estrai il content originale
            let originalContent;
            if (typeof module.content === 'string') {
              try {
                originalContent = JSON.parse(module.content);
              } catch (e) {
                originalContent = module.content;
              }
            } else {
              originalContent = module.content;
            }
            
            // Applica traduzioni in base al tipo di modulo
            // NUOVO APPROCCIO: uso ESCLUSIVO delle traduzioni dove disponibili
            switch (module.type) {
              case 'text':
                // Per moduli di testo, sostituisci SEMPRE il campo text
                originalContent.text = translatedContent.text || '';
                break;
                
              case 'image':
              case 'video':
              case 'pdf':
              case 'file':
                // Per media, usa SOLO campi tradotti
                originalContent.caption = translatedContent.caption || '';
                originalContent.alt = translatedContent.alt || originalContent.alt || '';
                originalContent.title = translatedContent.title || '';
                break;
                
              case 'warning':
              case 'danger':
              case 'warning-alert':
              case 'caution':
              case 'note':
              case 'safety-instructions':
                // Per avvisi, usa SOLO campi tradotti
                originalContent.title = translatedContent.title || '';
                originalContent.message = translatedContent.message || '';
                originalContent.description = translatedContent.description || '';
                break;
                
              case 'table':
                // Per tabelle, usa SOLO intestazioni e celle tradotte
                originalContent.caption = translatedContent.caption || '';
                
                // Gestione intestazioni - SOLO traduzioni
                if (translatedContent.headers && Array.isArray(originalContent.headers)) {
                  // Sostituisci tutte le intestazioni con le versioni tradotte o stringhe vuote
                  for (let i = 0; i < originalContent.headers.length; i++) {
                    originalContent.headers[i] = (translatedContent.headers && translatedContent.headers[i]) || '';
                  }
                }
                
                // Gestione righe e celle - SOLO traduzioni
                if (Array.isArray(originalContent.rows)) {
                  for (let i = 0; i < originalContent.rows.length; i++) {
                    if (Array.isArray(originalContent.rows[i])) {
                      for (let j = 0; j < originalContent.rows[i].length; j++) {
                        // Usa celle tradotte o stringhe vuote
                        originalContent.rows[i][j] = (translatedContent.rows && 
                                                      translatedContent.rows[i] && 
                                                      translatedContent.rows[i][j]) || '';
                      }
                    }
                  }
                }
                break;
                
              case 'checklist':
                // Per checklist, usa SOLO testi tradotti
                originalContent.title = translatedContent.title || '';
                
                if (Array.isArray(originalContent.items)) {
                  for (let i = 0; i < originalContent.items.length; i++) {
                    // Usa solo testi tradotti per ciascun elemento
                    const originalItem = originalContent.items[i] || {};
                    const translatedItem = (translatedContent.items && translatedContent.items[i]) || {};
                    
                    originalItem.text = translatedItem.text || '';
                    originalContent.items[i] = originalItem;
                  }
                }
                break;
                
              case 'link':
                // Per link, usa SOLO testo e descrizione tradotti
                originalContent.text = translatedContent.text || '';
                originalContent.description = translatedContent.description || '';
                break;
                
              case 'bom':
                // Per BOM, usa SOLO elementi tradotti
                originalContent.title = translatedContent.title || '';
                
                // Gestione intestazioni di colonne - SOLO traduzioni
                if (originalContent.headers) {
                  if (translatedContent.headers) {
                    // Mantieni struttura ma usa solo testi tradotti
                    const newHeaders = {...originalContent.headers};
                    for (const key in newHeaders) {
                      newHeaders[key] = translatedContent.headers[key] || '';
                    }
                    originalContent.headers = newHeaders;
                  } else {
                    // Nessuna traduzione, usa stringhe vuote
                    const emptyHeaders = {...originalContent.headers};
                    for (const key in emptyHeaders) {
                      emptyHeaders[key] = '';
                    }
                    originalContent.headers = emptyHeaders;
                  }
                }
                
                // Gestione descrizioni componenti - SOLO traduzioni
                if (originalContent.descriptions) {
                  if (translatedContent.descriptions) {
                    // Mantieni struttura ma usa solo testi tradotti
                    const newDescriptions = {...originalContent.descriptions};
                    for (const key in newDescriptions) {
                      newDescriptions[key] = translatedContent.descriptions[key] || '';
                    }
                    originalContent.descriptions = newDescriptions;
                  } else {
                    // Nessuna traduzione, usa stringhe vuote
                    const emptyDescriptions = {...originalContent.descriptions};
                    for (const key in emptyDescriptions) {
                      emptyDescriptions[key] = '';
                    }
                    originalContent.descriptions = emptyDescriptions;
                  }
                }
                
                // Gestione messaggi - SOLO traduzioni
                if (originalContent.messages) {
                  if (translatedContent.messages) {
                    // Mantieni struttura ma usa solo testi tradotti
                    const newMessages = {...originalContent.messages};
                    for (const key in newMessages) {
                      newMessages[key] = translatedContent.messages[key] || '';
                    }
                    originalContent.messages = newMessages;
                  } else {
                    // Nessuna traduzione, usa stringhe vuote
                    const emptyMessages = {...originalContent.messages};
                    for (const key in emptyMessages) {
                      emptyMessages[key] = '';
                    }
                    originalContent.messages = emptyMessages;
                  }
                }
                break;
                
              default:
                // Per altri tipi di moduli, sostituisci completamente con la traduzione
                // Se non ci sono campi tradotti specifici, usa oggetto vuoto
                originalContent = translatedContent || {};
            }
            
            // Applica il contenuto tradotto al modulo
            module.content = originalContent;
          } catch (error) {
            console.error(`Errore nell'applicazione della traduzione al modulo ${module.id}:`, error);
          }
        }
        
        return module;
      });
      
      return {
        ...section,
        modules: modulesWithTranslations
      };
    }));
    
    return {
      document,
      sections: sectionsWithContent
    };
  } catch (error) {
    console.error('Errore nel recupero del documento con traduzioni:', error);
    throw error;
  }
}

/**
 * Funzione per verificare lo stato delle traduzioni di un documento
 * @param documentId ID del documento
 * @param languageId ID della lingua
 * @returns Statistiche sullo stato delle traduzioni
 */
export async function getDocumentTranslationStats(documentId: string | number, languageId: string | number) {
  try {
    const response = await fetch(`/api/documents/${documentId}/translation-status/${languageId}`);
    if (!response.ok) throw new Error('Errore nel recupero dello stato delle traduzioni');
    return await response.json();
  } catch (error) {
    console.error('Errore nel recupero delle statistiche di traduzione:', error);
    throw error;
  }
}