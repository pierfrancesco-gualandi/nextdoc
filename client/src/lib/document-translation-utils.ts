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
    // 1. Recupera il documento di base
    const documentResponse = await fetch(`/api/documents/${documentId}`);
    if (!documentResponse.ok) throw new Error('Errore nel recupero del documento');
    const document = await documentResponse.json();
    
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
        
        // 3.2 Recupera le traduzioni dei moduli
        const moduleTranslationsResponse = await fetch(`/api/content-module-translations?documentId=${documentId}&languageId=${languageId}`);
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
        // Applica solo i campi tradotti che esistono
        if (translation.title) section.title = translation.title;
        if (translation.description) section.description = translation.description;
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
            switch (module.type) {
              case 'text':
                // Per moduli di testo, sostituisci il campo text
                if (translatedContent.text) {
                  originalContent.text = translatedContent.text;
                }
                break;
                
              case 'image':
              case 'video':
              case 'pdf':
              case 'file':
                // Per media, gestisci caption, alt e title
                if (translatedContent.caption) originalContent.caption = translatedContent.caption;
                if (translatedContent.alt) originalContent.alt = translatedContent.alt;
                if (translatedContent.title) originalContent.title = translatedContent.title;
                break;
                
              case 'warning':
              case 'danger':
              case 'warning-alert':
              case 'caution':
              case 'note':
              case 'safety-instructions':
                // Per avvisi, gestisci titolo e messaggio/descrizione
                if (translatedContent.title) originalContent.title = translatedContent.title;
                if (translatedContent.message) originalContent.message = translatedContent.message;
                if (translatedContent.description) originalContent.description = translatedContent.description;
                break;
                
              case 'table':
                // Per tabelle, gestisci headers, caption e celle
                if (translatedContent.caption) originalContent.caption = translatedContent.caption;
                
                // Gestione intestazioni
                if (translatedContent.headers && Array.isArray(originalContent.headers)) {
                  for (let i = 0; i < originalContent.headers.length; i++) {
                    if (translatedContent.headers[i]) {
                      originalContent.headers[i] = translatedContent.headers[i];
                    }
                  }
                }
                
                // Gestione righe e celle
                if (translatedContent.rows && Array.isArray(originalContent.rows)) {
                  for (let i = 0; i < originalContent.rows.length; i++) {
                    if (translatedContent.rows[i] && Array.isArray(originalContent.rows[i])) {
                      for (let j = 0; j < originalContent.rows[i].length; j++) {
                        if (translatedContent.rows[i][j]) {
                          originalContent.rows[i][j] = translatedContent.rows[i][j];
                        }
                      }
                    }
                  }
                }
                break;
                
              case 'checklist':
                // Per checklist, gestisci titolo e testi degli item
                if (translatedContent.title) originalContent.title = translatedContent.title;
                
                if (translatedContent.items && Array.isArray(originalContent.items)) {
                  for (let i = 0; i < originalContent.items.length; i++) {
                    if (translatedContent.items[i] && translatedContent.items[i].text) {
                      originalContent.items[i].text = translatedContent.items[i].text;
                    }
                  }
                }
                break;
                
              case 'link':
                // Per link, gestisci text e description
                if (translatedContent.text) originalContent.text = translatedContent.text;
                if (translatedContent.description) originalContent.description = translatedContent.description;
                break;
                
              case 'bom':
                // Per BOM, gestisci headers, descriptions e messages
                if (translatedContent.title) originalContent.title = translatedContent.title;
                
                // Gestione intestazioni di colonne
                if (translatedContent.headers && originalContent.headers) {
                  originalContent.headers = {
                    ...originalContent.headers,
                    ...translatedContent.headers
                  };
                }
                
                // Gestione descrizioni componenti
                if (translatedContent.descriptions && originalContent.descriptions) {
                  originalContent.descriptions = {
                    ...originalContent.descriptions,
                    ...translatedContent.descriptions
                  };
                }
                
                // Gestione messaggi
                if (translatedContent.messages && originalContent.messages) {
                  originalContent.messages = {
                    ...originalContent.messages,
                    ...translatedContent.messages
                  };
                }
                break;
                
              default:
                // Per altri tipi di moduli, applica tutti i campi tradotti 
                if (translatedContent) {
                  originalContent = { ...originalContent, ...translatedContent };
                }
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