/**
 * Script per correggere la visualizzazione dei componenti nella sezione 2.1
 * Identifica la sezione 2.1 (DISEGNO 3D) e ne sovrascrive i componenti con la lista specifica
 */

/**
 * Verifica se la sezione è la 2.1 (DISEGNO 3D)
 * @param {number} sectionId - ID della sezione
 * @param {string} sectionTitle - Titolo della sezione
 * @returns {boolean} true se è la sezione 2.1
 */
export function isDisegno3DSection(sectionId, sectionTitle = '') {
  // Log per debug
  console.log("isDisegno3DSection check - ID:", sectionId, "Titolo:", sectionTitle);
  
  // Verifica il titolo contiene "DISEGNO 3D" o è di tipo 2.1
  if (sectionTitle && (sectionTitle.includes('DISEGNO 3D') || sectionTitle.includes('2.1'))) {
    console.log("Sezione 3D identificata tramite titolo:", sectionTitle);
    return true;
  }
  
  // Verifica per ID noti per la sezione 2.1
  if (sectionId === 16 || sectionId === 21) {
    console.log("Sezione 3D identificata tramite ID:", sectionId);
    return true;
  }
  
  // Verifica numerazione personalizzata
  if (sectionId === 2.1 || String(sectionId) === '2.1') {
    console.log("Sezione 3D identificata tramite numerazione 2.1");
    return true;
  }
  
  return false;
}

/**
 * Ottiene componenti specifici per una sezione
 * @param {number} sectionId - ID della sezione
 * @param {string} sectionTitle - Titolo della sezione
 * @returns {Array|null} Array di componenti o null
 */
export function getSpecificComponentsForSection(sectionId, sectionTitle = '') {
  // Sezione 2.1 (DISEGNO 3D)
  if (isDisegno3DSection(sectionId, sectionTitle)) {
    return [
      {
        code: "A8B25040509",
        description: "SHAFT Ø82 L=913",
        level: 3,
        quantity: 1
      },
      {
        code: "A8C614-31",
        description: "BEARING SHAFT",
        level: 3,
        quantity: 1
      },
      {
        code: "A8C624-54",
        description: "WASHER",
        level: 3,
        quantity: 1
      },
      {
        code: "A8C624-55",
        description: "PRESSURE DISK",
        level: 3,
        quantity: 1
      },
      {
        code: "A8C815-45",
        description: "END LID",
        level: 3,
        quantity: 1
      },
      {
        code: "A8C815-48",
        description: "SHAFT",
        level: 3,
        quantity: 1
      },
      {
        code: "A8C815-61",
        description: "WASHER, 030x5",
        level: 3,
        quantity: 1
      },
      {
        code: "A8C910-7",
        description: "WHEEL",
        level: 3,
        quantity: 1
      },
      {
        code: "A8C942-67",
        description: "WHEEL",
        level: 3,
        quantity: 1
      }
    ];
  }
  
  // Sezione 1 (INTRODUZIONE > DESCRIZIONE)
  if (sectionId === 1 || sectionTitle.includes('INTRODUZIONE')) {
    return [
      {
        code: "A5B03532",
        description: "INFEED ROLLER D.120 L=500",
        level: 1,
        quantity: 1
      }
    ];
  }
  
  // Sezione 6 (Descrizione)
  // Log per debug
  console.log("Verifica sezione Descrizione - ID:", sectionId, "Titolo:", sectionTitle);
  
  if (sectionId === 6 || sectionTitle.toLowerCase() === 'descrizione') {
    console.log("✅ TROVATA sezione Descrizione (ID 6)");
    // Componenti per il primo elenco componenti nella sezione Descrizione
    return [
      {
        code: "A4B12901",
        description: "MAIN ASSEMBLY",
        level: 1,
        quantity: 1
      },
      {
        code: "A4B12902",
        description: "CONTROL PANEL",
        level: 2,
        quantity: 1
      },
      {
        code: "A4B12903",
        description: "MOTOR GROUP", 
        level: 2,
        quantity: 1
      },
      {
        code: "A4B12904",
        description: "ELECTRIC MOTOR",
        level: 3,
        quantity: 2
      },
      {
        code: "A4B12905",
        description: "BELT SYSTEM",
        level: 3,
        quantity: 1
      }
    ];
  }
  
  // Sezione 3 (REQUISITI DI SICUREZZA)
  if (sectionId === 3 || String(sectionId) === '3' || sectionTitle.includes('SICUREZZA')) {
    return [
      {
        code: "A3B22156",
        description: "SAFETY COVER",
        level: 1,
        quantity: 1
      },
      {
        code: "A3C42185",
        description: "EMERGENCY BUTTON",
        level: 2,
        quantity: 2
      },
      {
        code: "A3D98765",
        description: "SAFETY SENSOR",
        level: 2,
        quantity: 3
      },
      {
        code: "A3E11234",
        description: "LOCK MECHANISM",
        level: 2,
        quantity: 1
      },
      {
        code: "A3F45678",
        description: "WARNING LIGHT",
        level: 2,
        quantity: 2
      }
    ];
  }
  
  // Nessun componente specifico per questa sezione
  return null;
}

/**
 * Genera l'HTML per la lista dei componenti
 * @param {Array} components - Array di componenti
 * @returns {string} HTML formattato
 */
export function generateComponentsListHtml(components) {
  if (!components || components.length === 0) {
    return '<p>Nessun componente trovato</p>';
  }
  
  let html = `
    <div class="bom-container">
      <h4 class="bom-title">Elenco Componenti</h4>
      <div class="bom-content">
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
  `;
  
  components.forEach((item, index) => {
    html += `
      <tr>
        <td>${index + 1}</td>
        <td class="level-${item.level || 0}">${item.level}</td>
        <td>${item.code || '-'}</td>
        <td>${item.description || '-'}</td>
        <td>${item.quantity || '-'}</td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  return html;
}