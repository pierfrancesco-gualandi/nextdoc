/**
 * Utility per l'esportazione
 */

/**
 * Ottiene la tabella componenti per la sezione 2.1 (disegno 3D)
 */
export function getFixedSection21ComponentsTable() {
  // I 9 componenti ESATTI per la sezione 2.1
  const components = [
    { 
      level: 3, 
      code: 'A8B25040509', 
      description: 'SHAFT Ø82 L=913',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C614-31', 
      description: 'BEARING SHAFT',
      quantity: 1
    },
    { 
      level: 3, 
      code: 'A8C624-54', 
      description: 'WASHER',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C624-55', 
      description: 'PRESSURE DISK',
      quantity: 1
    },
    { 
      level: 3, 
      code: 'A8C815-45', 
      description: 'END LID',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C815-48', 
      description: 'SHAFT',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C815-61', 
      description: 'WASHER, 030x5',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C910-7', 
      description: 'WHEEL',
      quantity: 1 
    },
    { 
      level: 3, 
      code: 'A8C942-67', 
      description: 'WHEEL',
      quantity: 1 
    }
  ];

  // Genera la tabella HTML
  const tableHtml = `
    <table class="bom-table">
      <thead>
        <tr>
          <th>N°</th>
          <th>Livello</th>
          <th>Codice</th>
          <th>Descrizione</th>
          <th>Quantità</th>
        </tr>
      </thead>
      <tbody>
        ${components.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="level-${item.level}">${item.level}</td>
            <td>${item.code}</td>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  return tableHtml;
}

/**
 * Verifica se un modulo è nella sezione 2.1 (disegno 3D)
 */
export function isSection21Component(sectionId, sectionTitle) {
  return sectionId === 16 || 
    (sectionTitle && (
      sectionTitle.toLowerCase().includes("2.1") || 
      sectionTitle.toLowerCase().includes("disegno 3d")
    ));
}

/**
 * Post-elabora l'HTML per sostituire la lista componenti nella sezione 2.1
 */
export function postProcessExportHtml(html) {
  // Cerca la sezione 2.1 nell'HTML
  if (html.includes('id="section-16"') || 
      html.includes('2.1') || 
      html.includes('disegno 3D') || 
      html.includes('disegno 3d')) {
    
    // Cerca la tabella di componenti per sezione 2.1
    const regex = /<div class="bom-container">[\s\S]*?<h4 class="bom-title">Elenco Componenti<\/h4>[\s\S]*?<div class="bom-content">[\s\S]*?<table class="bom-table">[\s\S]*?<\/table>[\s\S]*?<\/div>[\s\S]*?<\/div>/gi;
    
    // Costruisci il contenuto di sostituzione
    const replacementContent = `
      <div class="bom-container">
        <h4 class="bom-title">Elenco Componenti</h4>
        <div class="bom-header">
        </div>
        <div class="bom-content">
          ${getFixedSection21ComponentsTable()}
        </div>
      </div>
    `;
    
    // Sostituisci nell'HTML
    html = html.replace(regex, replacementContent);
  }
  
  return html;
}