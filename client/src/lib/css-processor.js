/**
 * Utility per generare CSS con i corretti stili di avviso
 * 
 * Questo file definisce gli stili necessari per garantire che i moduli
 * di avviso (PERICOLO, AVVERTENZA, NOTA, ecc.) vengano visualizzati
 * correttamente nell'HTML esportato.
 */

/**
 * Genera il CSS da includere nell'HTML esportato
 * @returns {string} - CSS da includere
 */
export function generateExportCss() {
  return `
    /* Stili per moduli di avviso - supportano testo BIANCO */
    .message {
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 6px;
      border-width: 1px;
      border-style: solid;
    }
    
    .message.danger {
      background-color: #ff0000;
      border-color: #ff0000;
      color: #ffffff;
    }
    
    .message.warning {
      background-color: #ff8c00;
      border-color: #ff8c00;
      color: #ffffff;
    }
    
    .message.info {
      background-color: #0070d1;
      border-color: #0070d1;
      color: #ffffff;
    }
    
    .message.success {
      background-color: #2e7d32;
      border-color: #2e7d32;
      color: #ffffff;
    }
    
    .message-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
      color: #ffffff;
    }
    
    .message-icon {
      font-size: 1.5rem;
      margin-right: 0.5rem;
    }
    
    .message-header h4 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: bold;
      color: #ffffff;
    }
    
    .message-body {
      color: #ffffff;
    }
    
    .message-body p {
      margin: 0;
      color: #ffffff;
    }
    
    /* Stili per tabelle componenti */
    .bom-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    
    .bom-table th, .bom-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    
    .bom-table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    
    .bom-table tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    .bom-table tr:hover {
      background-color: #f5f5f5;
    }
    
    /* Indentazione per livelli BOM */
    .level-2 {
      padding-left: 20px;
    }
    
    .level-3 {
      padding-left: 40px;
    }
    
    .level-4 {
      padding-left: 60px;
    }
    
    .level-5 {
      padding-left: 80px;
    }
  `;
}