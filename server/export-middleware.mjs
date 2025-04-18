/**
 * Middleware che intercetta e post-processa le esportazioni HTML
 */
import { postProcessExportHtml } from './export-utils.mjs';

/**
 * Middleware che modifica le risposte del server quando servono file HTML esportati
 * @param {Request} req - Richiesta Express
 * @param {Response} res - Risposta Express
 * @param {Function} next - Funzione next middleware
 */
export function exportMiddleware(req, res, next) {
  // Intercetta solo le richieste di esportazione HTML
  if (req.url.startsWith('/api/documents') && req.url.includes('/export/html')) {
    console.log('Intercepting HTML export request', req.url);
    
    // Salva il metodo send originale
    const originalSend = res.send;
    
    // Sovrascrive il metodo send per post-processare l'HTML
    res.send = function(html) {
      // Ignora se non è una stringa HTML
      if (typeof html !== 'string' || !html.includes('<!DOCTYPE html>')) {
        return originalSend.apply(res, arguments);
      }
      
      console.log('Post-processing exported HTML...');
      
      // Applica le correzioni all'HTML
      const processedHtml = postProcessExportHtml(html);
      
      // Chiama il metodo send originale con l'HTML elaborato
      return originalSend.call(this, processedHtml);
    };
  }
  
  next();
}