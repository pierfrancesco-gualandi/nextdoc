/**
 * Utility per la correzione dell'elenco componenti
 */

/**
 * Definisce gli elenchi componenti specifici per ciascuna sezione
 */
export function getSpecificComponentsForSection(sectionId, sectionTitle) {
  console.log(`getSpecificComponentsForSection chiamata con sectionId=${sectionId}, sectionTitle=${sectionTitle}`);
  
  // SEZIONE 1 - INTRODUZIONE -> DESCRIZIONE 
  // Contiene solo un singolo componente
  if (
    (sectionTitle && (sectionTitle.includes("1") || sectionTitle.includes("INTRODUZI"))) || 
    sectionId === 2 || 
    sectionId === 12 || sectionId === 6
  ) {
    console.log("Generando componenti per sezione INTRODUZIONE");
    return [
      { 
        level: 2, 
        code: 'A5B03532', 
        description: 'INFEED ROLLER D.120 L=500',
        quantity: 1 
      }
    ];
  } 
  // SEZIONE 2 - NON MOSTRARE ELENCHI
  else if (
    (sectionTitle && (sectionTitle.includes("2 ") || sectionTitle.includes("Sezione 2 "))) || 
    sectionId === 19
  ) {
    console.log("Sezione 2 identificata - nessun componente da mostrare");
    return [];
  }
  // SEZIONE 2.1 - DISEGNO 3D - Componenti ESATTI (9)
  else if (
    sectionId === 16 || 
    (sectionTitle && (sectionTitle.toLowerCase().includes("2.1") || sectionTitle.toLowerCase().includes("disegno 3d")))
  ) {
    console.log("Sezione 2.1 (DISEGNO 3D) identificata! Generando i 9 componenti specifici");
    return [
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
  }
  
  // Per altre sezioni, ritorna null (utilizza i componenti standard)
  return null;
}

/**
 * Verifica se una sezione è la sezione del disegno 3D (2.1)
 */
export function isDisegno3DSection(sectionId, sectionTitle) {
  return sectionId === 16 || 
    (sectionTitle && (
      sectionTitle.toLowerCase().includes("2.1") || 
      sectionTitle.toLowerCase().includes("disegno 3d")
    ));
}

/**
 * Genera il markup HTML per l'elenco componenti di una specifica sezione
 */
export function generateComponentsListHtml(sectionId, sectionTitle, defaultBomItems) {
  console.log(`generateComponentsListHtml chiamata per sezione ID=${sectionId}, titolo=${sectionTitle}`);
  
  const items = getSpecificComponentsForSection(sectionId, sectionTitle) || defaultBomItems;
  
  if (!items || items.length === 0) {
    console.log("Nessun elemento trovato nella distinta base per questa sezione");
    return '<p class="bom-empty">Nessun elemento trovato nella distinta base</p>';
  }
  
  console.log(`Generando tabella con ${items.length} componenti, primo codice: ${items[0]?.code || 'N/A'}`);
  
  // Assicuriamoci che la colonna N° sia sempre presente
  return `
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
        ${items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="level-${item.level}">${item.level}</td>
            <td>${item.code || ''}</td>
            <td>${item.description || ''}</td>
            <td>${item.quantity || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}