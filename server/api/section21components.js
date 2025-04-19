/**
 * Funzione che genera l'HTML per la lista di componenti della sezione 2.1
 * IMPORTANTE: Questo file sovrascrive il contenuto generato da document-utils.ts
 * per la sezione 2.1 (disegno 3D) che altrimenti mostrerebbe componenti errati.
 */
function getSection21ComponentsHtml() {
  // I 9 componenti ESATTI come richiesti
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
 * Funzione che controlla se un modulo è nella sezione 2.1 (disegno 3D)
 */
function isSection21Component(sectionId, sectionTitle) {
  // Log per il debug
  console.log(`Controllo sezione 2.1: ID=${sectionId}, Titolo=${sectionTitle}`);
  
  // Verifica se si tratta della sezione 2.1 (ID specifico o testo nel titolo)
  const isSection21 = sectionId === 16 || 
    (sectionTitle && (
      sectionTitle.toLowerCase().includes("2.1") || 
      sectionTitle.toLowerCase().includes("disegno 3d")
    ));
    
  if (isSection21) {
    console.log(`Sezione 2.1 identificata: ID=${sectionId}, Titolo=${sectionTitle}`);
  }
  
  return isSection21;
}

module.exports = {
  getSection21ComponentsHtml,
  isSection21Component
};