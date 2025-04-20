/**
 * Componenti per la sezione 2.1 e altre sezioni
 */

/**
 * Restituisce gli elementi specifici per la sezione 2.1
 * @returns {Array} Array di componenti
 */
export function getComponentsForSection21() {
  // Utilizza la stessa lista di componenti specifici per la sezione 2.1
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

/**
 * Ottiene i componenti per una sezione specifica
 * @param {number} sectionId - ID della sezione
 * @returns {Array} Array di componenti
 */
export function getComponentsForSections(sectionId) {
  // Per la sezione 1 (INTRODUZIONE > DESCRIZIONE)
  if (sectionId === 1 || sectionId === 10) {
    return [
      {
        code: "A5B03532",
        description: "INFEED ROLLER D.120 L=500",
        level: 1,
        quantity: 1
      }
    ];
  }
  
  // Per la sezione 2.1 (DISEGNO 3D)
  if (sectionId === 16 || sectionId === 21 || sectionId === 2.1) {
    return getComponentsForSection21();
  }
  
  // Per la sezione 3 (REQUISITI DI SICUREZZA)
  if (sectionId === 3 || sectionId === 30) {
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
  
  // Default: nessun componente
  return [];
}