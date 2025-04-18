/**
 * Utility per l'esportazione HTML
 */
import { saveAs } from 'file-saver';
import { generateExportCss } from './css-processor';
import { processExportedHtml } from './html-processor';

/**
 * Crea e scarica un file HTML esportato
 * 
 * @param {string} fileName - Nome del file
 * @param {string} content - Contenuto HTML
 * @param {object} document - Informazioni sul documento
 */
export function downloadHtmlDocument(fileName, content, document) {
  // Post-elabora l'HTML per correggere problemi noti
  content = processExportedHtml(content);
  
  // Genera l'HTML completo con CSS in-linea
  const htmlDocument = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${document.title} v${document.version}</title>
      <style>
        /* Stili base per l'HTML esportato */
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        h1, h2, h3, h4, h5, h6 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 700;
          color: #222;
        }
        
        p {
          margin-bottom: 1rem;
        }
        
        img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1rem auto;
        }
        
        .image-container, .video-container, .model-container, .table-container {
          margin: 2rem 0;
        }
        
        .caption {
          text-align: center;
          font-style: italic;
          color: #666;
          margin-top: 0.5rem;
        }
        
        .model-placeholder {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 2rem;
          background-color: #f9f9f9;
          text-align: center;
        }
        
        .model-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        
        .model-controls {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin: 1rem 0;
        }
        
        .control-button {
          padding: 0.5rem 1rem;
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .model-download {
          margin-top: 1rem;
          text-align: center;
        }
        
        .download-button {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background-color: #0070d1;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        
        .bom-container {
          margin: 2rem 0;
          border: 1px solid #ddd;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .bom-title {
          background-color: #f5f5f5;
          margin: 0;
          padding: 1rem;
          border-bottom: 1px solid #ddd;
        }
        
        .bom-header {
          padding: 1rem;
          border-bottom: 1px solid #ddd;
        }
        
        .bom-description {
          margin: 0;
        }
        
        .bom-content {
          padding: 1rem;
        }
        
        .bom-empty {
          font-style: italic;
          color: #666;
        }
        
        /* CSS generato dinamicamente */
        ${generateExportCss()}
      </style>
    </head>
    <body>
      <div class="document-container">
        ${content}
      </div>
      
      <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; color: #666;">
        <p>Documento generato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} alle ${new Date().toLocaleTimeString('it-IT')}</p>
        <p>Versione documento: ${document.version}</p>
      </footer>
    </body>
    </html>
  `;
  
  // Crea un Blob e scarica il file
  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  saveAs(blob, fileName);
}