// Funzionalità per esportazione e importazione di traduzioni in formato CSV
import { saveAs } from 'file-saver';
import { apiRequest } from '@/lib/queryClient';

// Interfacce dei dati
interface TranslationRecord {
  id: string;           // ID del modulo o sezione
  type: string;         // 'section' o 'module'
  field: string;        // Campo specifico (es. 'title', 'description', 'content.text')
  subId?: string;       // ID secondario (usato per array o tabelle)
  path: string;         // Percorso completo nella sezione (per riferimento)
  original: string;     // Testo originale
  translated: string;   // Testo tradotto
}

/**
 * Esporta tutte le traduzioni di un documento in un file CSV
 * @param documentId ID del documento
 * @param languageId ID della lingua di destinazione
 * @param fileName Nome del file di esportazione (opzionale)
 */
export async function exportDocumentTranslationsToCSV(
  documentId: string | number,
  languageId: string | number,
  fileName?: string
): Promise<void> {
  try {
    // 1. Raccolta dati da tradurre
    const data = await fetchAllTranslatableContent(documentId, languageId);

    // 2. Conversione in formato CSV
    const csvContent = generateCSVContent(data);

    // 3. Generazione del nome del file
    const outputFileName = fileName || `translations_doc_${documentId}_lang_${languageId}_${new Date().toISOString().split('T')[0]}.csv`;

    // 4. Download del file CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, outputFileName);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Errore durante l\'esportazione delle traduzioni:', error);
    return Promise.reject(error);
  }
}

/**
 * Importa le traduzioni da un file CSV
 * @param documentId ID del documento
 * @param languageId ID della lingua di destinazione
 * @param fileContent Contenuto del file CSV
 */
export async function importTranslationsFromCSV(
  documentId: string | number,
  languageId: string | number,
  fileContent: string
): Promise<{success: boolean, inserted: number, updated: number, errors: any[]}> {
  try {
    // 1. Parsing del CSV
    const records = parseCSVContent(fileContent);
    
    // 2. Raggruppamento delle traduzioni per modulo/sezione
    const groupedTranslations = groupTranslationsByItem(records);
    
    // 3. Applicazione delle traduzioni
    const result = await applyTranslations(documentId, languageId, groupedTranslations);
    
    return result;
  } catch (error) {
    console.error('Errore durante l\'importazione delle traduzioni:', error);
    return {
      success: false,
      inserted: 0,
      updated: 0,
      errors: [error]
    };
  }
}

// Funzioni di supporto

/**
 * Recupera tutti i contenuti traducibili di un documento
 */
async function fetchAllTranslatableContent(
  documentId: string | number,
  languageId: string | number
): Promise<TranslationRecord[]> {
  try {
    const results: TranslationRecord[] = [];
    
    // 1. Recupera tutte le sezioni del documento
    const sectionsResponse = await fetch(`/api/documents/${documentId}/sections`);
    if (!sectionsResponse.ok) throw new Error('Errore nel recupero delle sezioni');
    const sections = await sectionsResponse.json();
    
    // 2. Per ogni sezione, aggiungi i campi traducibili (titolo, descrizione)
    for (const section of sections) {
      // 2.1 Recupera la traduzione esistente della sezione (se esiste)
      let sectionTranslation = null;
      try {
        const sectionTranslationResponse = await fetch(`/api/section-translations?sectionId=${section.id}&languageId=${languageId}`);
        if (sectionTranslationResponse.ok) {
          const translations = await sectionTranslationResponse.json();
          if (translations && translations.length > 0) {
            sectionTranslation = translations[0];
          }
        }
      } catch (err) {
        console.warn(`Impossibile recuperare la traduzione della sezione ${section.id}:`, err);
      }
      
      // 2.2 Aggiungi il titolo della sezione
      results.push({
        id: section.id.toString(),
        type: 'section',
        field: 'title',
        path: `/${section.title}`,
        original: section.title || '',
        translated: sectionTranslation?.title || ''
      });
      
      // 2.3 Aggiungi la descrizione della sezione (se presente)
      if (section.description) {
        results.push({
          id: section.id.toString(),
          type: 'section',
          field: 'description',
          path: `/${section.title}`,
          original: section.description || '',
          translated: sectionTranslation?.description || ''
        });
      }
      
      // 3. Recupera tutti i moduli della sezione
      const modulesResponse = await fetch(`/api/sections/${section.id}/modules`);
      if (!modulesResponse.ok) continue;
      const modules = await modulesResponse.json();
      
      // 4. Per ogni modulo, estrai i contenuti traducibili
      for (const module of modules) {
        // 4.1 Recupera la traduzione esistente del modulo (se esiste)
        let moduleTranslation = null;
        try {
          const moduleTranslationResponse = await fetch(`/api/module-translations?moduleId=${module.id}&languageId=${languageId}`);
          if (moduleTranslationResponse.ok) {
            const translations = await moduleTranslationResponse.json();
            if (translations && translations.length > 0) {
              moduleTranslation = translations[0];
              if (moduleTranslation.content && typeof moduleTranslation.content === 'string') {
                moduleTranslation.content = JSON.parse(moduleTranslation.content);
              }
            }
          }
        } catch (err) {
          console.warn(`Impossibile recuperare la traduzione del modulo ${module.id}:`, err);
        }
        
        // 4.2 Estrai i campi traducibili in base al tipo di modulo
        const moduleContent = typeof module.content === 'string' ? 
          JSON.parse(module.content) : module.content;
        
        const modulePath = `/${section.title}/${getModuleTypeName(module.type)}`;
        
        // Estrai i campi in base al tipo di modulo
        await extractTranslatableFields(
          module.id.toString(),
          module.type,
          moduleContent,
          moduleTranslation?.content,
          modulePath,
          results
        );
      }
    }
    
    return results;
  } catch (error) {
    console.error('Errore durante il recupero dei contenuti traducibili:', error);
    throw error;
  }
}

/**
 * Estrae tutti i campi traducibili da un modulo
 */
async function extractTranslatableFields(
  moduleId: string,
  moduleType: string,
  content: any,
  translatedContent: any,
  path: string,
  results: TranslationRecord[]
) {
  if (!content) return;
  
  // Gestione in base al tipo di modulo
  switch (moduleType) {
    case 'text':
      // Campo testo semplice
      results.push({
        id: moduleId,
        type: 'module',
        field: 'text',
        path,
        original: content.text || '',
        translated: translatedContent?.text || ''
      });
      break;
      
    case 'warning':
    case 'danger':
    case 'warning-alert':
    case 'caution':
    case 'note':
    case 'safety-instructions':
      // Titolo e messaggio/descrizione
      results.push({
        id: moduleId,
        type: 'module',
        field: 'title',
        path,
        original: content.title || '',
        translated: translatedContent?.title || ''
      });
      
      const descriptionField = moduleType === 'warning' ? 'message' : 'description';
      results.push({
        id: moduleId,
        type: 'module',
        field: descriptionField,
        path,
        original: content[descriptionField] || '',
        translated: translatedContent?.[descriptionField] || ''
      });
      break;
      
    case 'image':
    case 'video':
      // Didascalia e testo alternativo
      if (content.caption !== undefined) {
        results.push({
          id: moduleId,
          type: 'module',
          field: 'caption',
          path,
          original: content.caption || '',
          translated: translatedContent?.caption || ''
        });
      }
      
      if (content.alt !== undefined) {
        results.push({
          id: moduleId,
          type: 'module',
          field: 'alt',
          path,
          original: content.alt || '',
          translated: translatedContent?.alt || ''
        });
      }
      break;
      
    case 'table':
      // Didascalia
      if (content.caption !== undefined) {
        results.push({
          id: moduleId,
          type: 'module',
          field: 'caption',
          path,
          original: content.caption || '',
          translated: translatedContent?.caption || ''
        });
      }
      
      // Intestazioni della tabella
      if (Array.isArray(content.headers)) {
        content.headers.forEach((header: string, index: number) => {
          results.push({
            id: moduleId,
            type: 'module',
            field: 'headers',
            subId: index.toString(),
            path: `${path}/headers[${index}]`,
            original: header || '',
            translated: Array.isArray(translatedContent?.headers) ? 
              (translatedContent.headers[index] || '') : ''
          });
        });
      }
      
      // Righe della tabella
      if (Array.isArray(content.rows)) {
        content.rows.forEach((row: string[], rowIndex: number) => {
          row.forEach((cell: string, cellIndex: number) => {
            results.push({
              id: moduleId,
              type: 'module',
              field: 'rows',
              subId: `${rowIndex},${cellIndex}`,
              path: `${path}/rows[${rowIndex}][${cellIndex}]`,
              original: cell || '',
              translated: Array.isArray(translatedContent?.rows) && 
                        Array.isArray(translatedContent.rows[rowIndex]) ? 
                        (translatedContent.rows[rowIndex][cellIndex] || '') : ''
            });
          });
        });
      }
      break;
      
    case 'checklist':
      // Elementi della checklist
      if (Array.isArray(content.items)) {
        content.items.forEach((item: any, index: number) => {
          results.push({
            id: moduleId,
            type: 'module',
            field: 'items.text',
            subId: index.toString(),
            path: `${path}/items[${index}]`,
            original: item.text || '',
            translated: Array.isArray(translatedContent?.items) ? 
              (translatedContent.items[index]?.text || '') : ''
          });
        });
      }
      break;
      
    case 'bom':
      // Titolo
      if (content.title !== undefined) {
        results.push({
          id: moduleId,
          type: 'module',
          field: 'title',
          path,
          original: content.title || '',
          translated: translatedContent?.title || ''
        });
      }
      
      // Intestazioni colonne
      if (content.headers && typeof content.headers === 'object') {
        Object.entries(content.headers).forEach(([key, value]) => {
          results.push({
            id: moduleId,
            type: 'module',
            field: `headers.${key}`,
            path: `${path}/headers.${key}`,
            original: value as string || '',
            translated: translatedContent?.headers?.[key] || ''
          });
        });
      }
      
      // Messaggi
      if (content.messages && typeof content.messages === 'object') {
        Object.entries(content.messages).forEach(([key, value]) => {
          results.push({
            id: moduleId,
            type: 'module',
            field: `messages.${key}`,
            path: `${path}/messages.${key}`,
            original: value as string || '',
            translated: translatedContent?.messages?.[key] || ''
          });
        });
      }
      
      // Descrizioni componenti
      const components = await fetchBomComponents(content.bomId);
      if (components && components.length > 0) {
        components.forEach(component => {
          const code = component.code;
          results.push({
            id: moduleId,
            type: 'module',
            field: `descriptions.${code}`,
            path: `${path}/component/${code}`,
            original: component.description || '',
            translated: translatedContent?.descriptions?.[code] || ''
          });
        });
      }
      break;
      
    case 'link':
      // Testo del link
      results.push({
        id: moduleId,
        type: 'module',
        field: 'text',
        path,
        original: content.text || '',
        translated: translatedContent?.text || ''
      });
      
      // Descrizione (se presente)
      if (content.description !== undefined) {
        results.push({
          id: moduleId,
          type: 'module',
          field: 'description',
          path,
          original: content.description || '',
          translated: translatedContent?.description || ''
        });
      }
      break;
      
    default:
      // Per altri tipi di modulo, non facciamo nulla
      break;
  }
}

/**
 * Recupera i componenti di una BOM
 */
async function fetchBomComponents(bomId: number): Promise<any[]> {
  if (!bomId) return [];
  
  try {
    const response = await fetch(`/api/boms/${bomId}/items`);
    if (!response.ok) return [];
    
    const bomItems = await response.json();
    
    // Estrai i componenti unici
    const uniqueComponents = new Map();
    bomItems.forEach((item: any) => {
      if (item.component && item.component.code) {
        uniqueComponents.set(item.component.code, item.component);
      }
    });
    
    return Array.from(uniqueComponents.values());
  } catch (error) {
    console.error('Errore nel recupero dei componenti della BOM:', error);
    return [];
  }
}

/**
 * Genera il contenuto del file CSV dalle traduzioni
 */
function generateCSVContent(data: TranslationRecord[]): string {
  // Intestazioni CSV
  let csv = 'ID,Type,Field,SubID,Path,Original,Translated\n';
  
  // Dati
  for (const record of data) {
    // Escape di eventuali virgole o apici nei testi
    const escapedOriginal = escapeCSVField(record.original);
    const escapedTranslated = escapeCSVField(record.translated);
    const escapedPath = escapeCSVField(record.path);
    
    csv += `${record.id},${record.type},${record.field},${record.subId || ''},${escapedPath},${escapedOriginal},${escapedTranslated}\n`;
  }
  
  return csv;
}

/**
 * Effettua l'escape di un campo per il CSV
 */
function escapeCSVField(value: string): string {
  if (!value) return '""';
  
  // Sostituisci eventuali apici con doppi apici e racchiudi il campo tra apici
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Analizza il contenuto del file CSV
 */
function parseCSVContent(csvContent: string): TranslationRecord[] {
  try {
    // Parsing CSV manuale
    const lines = csvContent.split('\n');
    if (lines.length < 2) {
      throw new Error('Il file CSV non contiene dati sufficienti');
    }
    
    // Ottieni le intestazioni (la prima riga)
    const headers = parseCSVLine(lines[0]);
    
    // Mappa le colonne necessarie
    const idIdx = headers.indexOf('ID');
    const typeIdx = headers.indexOf('Type');
    const fieldIdx = headers.indexOf('Field');
    const subIdIdx = headers.indexOf('SubID');
    const pathIdx = headers.indexOf('Path');
    const originalIdx = headers.indexOf('Original');
    const translatedIdx = headers.indexOf('Translated');
    
    if (idIdx === -1 || typeIdx === -1 || fieldIdx === -1 || 
        pathIdx === -1 || originalIdx === -1 || translatedIdx === -1) {
      throw new Error('Il file CSV non contiene tutte le colonne necessarie');
    }
    
    // Processa le righe dati
    const records: TranslationRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Salta le righe vuote
      
      const values = parseCSVLine(lines[i]);
      if (values.length <= Math.max(idIdx, typeIdx, fieldIdx, subIdIdx, pathIdx, originalIdx, translatedIdx)) {
        console.warn(`Riga CSV ${i+1} non valida, saltata`);
        continue;
      }
      
      records.push({
        id: values[idIdx] || '',
        type: values[typeIdx] || '',
        field: values[fieldIdx] || '',
        subId: subIdIdx >= 0 ? values[subIdIdx] || undefined : undefined,
        path: values[pathIdx] || '',
        original: values[originalIdx] || '',
        translated: values[translatedIdx] || ''
      });
    }
    
    return records;
  } catch (error) {
    console.error('Errore durante il parsing del CSV:', error);
    throw new Error('Il formato del file CSV non è valido');
  }
}

/**
 * Analizza una riga di CSV considerando anche le virgolette
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : '';
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Gestisci virgolette doppie all'interno di un campo quotato
        currentValue += '"';
        i++; // Salta il prossimo carattere
      } else {
        // Inizio o fine di un campo quotato
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Fine del campo, aggiungi al risultato
      result.push(currentValue);
      currentValue = '';
    } else {
      // Aggiungi carattere al valore corrente
      currentValue += char;
    }
  }
  
  // Aggiungi l'ultimo campo
  result.push(currentValue);
  
  return result;
}

/**
 * Raggruppa le traduzioni per modulo/sezione
 */
function groupTranslationsByItem(records: TranslationRecord[]): Map<string, any> {
  const grouped = new Map<string, any>();
  
  for (const record of records) {
    const key = `${record.type}_${record.id}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: record.id,
        type: record.type,
        languageId: null, // Sarà impostato durante l'applicazione
        content: {}
      });
    }
    
    const item = grouped.get(key);
    
    if (record.type === 'section') {
      // Per le sezioni, aggiorniamo direttamente i campi
      item[record.field] = record.translated;
    } else if (record.type === 'module') {
      // Per i moduli, la struttura è più complessa
      if (record.subId) {
        // Campi con subId (array, tabelle, ecc.)
        if (record.field === 'headers') {
          // Intestazioni tabella
          if (!Array.isArray(item.content.headers)) {
            item.content.headers = [];
          }
          item.content.headers[parseInt(record.subId)] = record.translated;
        } else if (record.field === 'rows') {
          // Celle tabella
          if (!item.content.rows) item.content.rows = [];
          
          const [rowIndex, cellIndex] = record.subId.split(',').map(Number);
          
          if (!Array.isArray(item.content.rows[rowIndex])) {
            item.content.rows[rowIndex] = [];
          }
          
          item.content.rows[rowIndex][cellIndex] = record.translated;
        } else if (record.field === 'items.text') {
          // Elementi checklist
          if (!Array.isArray(item.content.items)) {
            item.content.items = [];
          }
          
          const index = parseInt(record.subId);
          if (!item.content.items[index]) {
            item.content.items[index] = { checked: false };
          }
          
          item.content.items[index].text = record.translated;
        } else if (record.field.startsWith('descriptions.')) {
          // Descrizioni componenti BOM
          if (!item.content.descriptions) {
            item.content.descriptions = {};
          }
          
          const componentCode = record.field.replace('descriptions.', '');
          item.content.descriptions[componentCode] = record.translated;
        }
      } else if (record.field.includes('.')) {
        // Campi nidificati (headers.*, messages.*)
        const [parent, child] = record.field.split('.');
        
        if (!item.content[parent]) {
          item.content[parent] = {};
        }
        
        item.content[parent][child] = record.translated;
      } else {
        // Campi semplici
        item.content[record.field] = record.translated;
      }
    }
  }
  
  return grouped;
}

/**
 * Applica le traduzioni al documento
 */
async function applyTranslations(
  documentId: string | number,
  languageId: string | number,
  groupedTranslations: Map<string, any>
): Promise<{success: boolean, inserted: number, updated: number, errors: any[]}> {
  const result = {
    success: true,
    inserted: 0,
    updated: 0,
    errors: [] as any[]
  };
  
  // Converti la Map in array per iterazione
  const translationItems = Array.from(groupedTranslations.values());
  
  for (const item of translationItems) {
    try {
      if (item.type === 'section') {
        // Applica traduzione sezione
        await applySectionTranslation(item.id, languageId, item);
        result.updated++;
      } else if (item.type === 'module') {
        // Applica traduzione modulo
        const applied = await applyModuleTranslation(item.id, languageId, item.content);
        if (applied === 'inserted') {
          result.inserted++;
        } else if (applied === 'updated') {
          result.updated++;
        }
      }
    } catch (error: any) {
      console.error(`Errore nell'applicazione della traduzione per ${item.type} ${item.id}:`, error);
      result.errors.push({
        item: item.id,
        type: item.type,
        error: error.message || 'Errore sconosciuto'
      });
    }
  }
  
  result.success = result.errors.length === 0;
  return result;
}

/**
 * Applica una traduzione a una sezione
 */
async function applySectionTranslation(
  sectionId: string | number, 
  languageId: string | number,
  translation: any
): Promise<'inserted' | 'updated'> {
  try {
    // Verifica se esiste già una traduzione
    const existingResponse = await fetch(`/api/section-translations?sectionId=${sectionId}&languageId=${languageId}`);
    const existing = await existingResponse.json();
    
    const data = {
      sectionId: Number(sectionId),
      languageId: Number(languageId),
      title: translation.title || '',
      description: translation.description || '',
      status: 'translated'
    };
    
    if (existing && existing.length > 0) {
      // Aggiorna la traduzione esistente
      await apiRequest('PUT', `/api/section-translations/${existing[0].id}`, data);
      return 'updated';
    } else {
      // Crea una nuova traduzione
      await apiRequest('POST', '/api/section-translations', data);
      return 'inserted';
    }
  } catch (error) {
    console.error('Errore nell\'applicazione della traduzione della sezione:', error);
    throw error;
  }
}

/**
 * Applica una traduzione a un modulo
 */
async function applyModuleTranslation(
  moduleId: string | number, 
  languageId: string | number,
  content: any
): Promise<'inserted' | 'updated'> {
  try {
    // Verifica se esiste già una traduzione
    const existingResponse = await fetch(`/api/module-translations?moduleId=${moduleId}&languageId=${languageId}`);
    const existing = await existingResponse.json();
    
    const data = {
      moduleId: Number(moduleId),
      languageId: Number(languageId),
      content: JSON.stringify(content),
      status: 'translated'
    };
    
    if (existing && existing.length > 0) {
      // Aggiorna la traduzione esistente
      await apiRequest('PUT', `/api/module-translations/${existing[0].id}`, data);
      return 'updated';
    } else {
      // Crea una nuova traduzione
      await apiRequest('POST', '/api/module-translations', data);
      return 'inserted';
    }
  } catch (error) {
    console.error('Errore nell\'applicazione della traduzione del modulo:', error);
    throw error;
  }
}

/**
 * Ottiene il nome del tipo di modulo in italiano
 */
function getModuleTypeName(type: string): string {
  const types: Record<string, string> = {
    'text': 'Testo',
    'testp': 'File di testo',
    'image': 'Immagine',
    'video': 'Video',
    'table': 'Tabella',
    'checklist': 'Checklist',
    'warning': 'Avvertenza',
    'danger': 'PERICOLO',
    'warning-alert': 'AVVERTENZA',
    'caution': 'ATTENZIONE',
    'note': 'NOTA',
    'safety-instructions': 'Istruzioni di sicurezza',
    '3d-model': 'Modello 3D',
    'pdf': 'PDF',
    'link': 'Link',
    'component': 'Componente',
    'bom': 'Elenco Componenti'
  };
  
  return types[type] || type;
}