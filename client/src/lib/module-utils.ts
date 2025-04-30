/**
 * Funzioni di utilità per i moduli di contenuto
 */

/**
 * Verifica se un modulo di tipo immagine ha una didascalia (caption)
 * @param module Il modulo da verificare
 * @returns true se il modulo ha una didascalia, false altrimenti
 */
export function imageModuleHasCaption(module: any): boolean {
  return module && 
         module.type === 'image' && 
         module.content && 
         module.content.caption !== undefined;
}

/**
 * Verifica se un modulo di tipo video ha una didascalia (caption)
 * @param module Il modulo da verificare
 * @returns true se il modulo ha una didascalia, false altrimenti
 */
export function videoModuleHasCaption(module: any): boolean {
  return module && 
         module.type === 'video' && 
         module.content && 
         module.content.caption !== undefined;
}

/**
 * Verifica se un modulo di tipo PDF ha una didascalia (caption)
 * @param module Il modulo da verificare
 * @returns true se il modulo ha una didascalia, false altrimenti
 */
export function pdfModuleHasCaption(module: any): boolean {
  return module && 
         module.type === 'pdf' && 
         module.content && 
         module.content.caption !== undefined;
}

/**
 * Verifica se un modulo ha una didascalia (caption) indipendentemente dal tipo
 * @param module Il modulo da verificare
 * @returns true se il modulo ha una didascalia, false altrimenti
 */
export function moduleHasCaption(module: any): boolean {
  return module && 
         module.content && 
         module.content.caption !== undefined &&
         ['image', 'video', 'pdf', 'table', 'file'].includes(module.type);
}

/**
 * Estrae il contenuto di un modulo correttamente
 * @param module Il modulo da cui estrarre il contenuto
 * @returns Il contenuto del modulo, convertito in oggetto se necessario
 */
export function getModuleContent(module: any): any {
  if (!module || !module.content) return {};
  
  // Se il content è una stringa JSON, lo converte in oggetto
  if (typeof module.content === 'string') {
    try {
      return JSON.parse(module.content);
    } catch (e) {
      console.error('Errore nel parsing del contenuto del modulo:', e);
      return {};
    }
  }
  
  // Altrimenti restituisce l'oggetto content così com'è
  return module.content;
}