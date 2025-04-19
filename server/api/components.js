/**
 * API per recuperare i componenti specifici della sezione 2.1
 */
function getComponentsForSection21() {
  return [
    { 
      level: 3, 
      component: { 
        code: 'A8B25040509', 
        description: 'SHAFT Ø82 L=913' 
      }, 
      quantity: 1 
    },
    { 
      level: 3, 
      component: { 
        code: 'A8C614-31', 
        description: 'BEARING SHAFT' 
      }, 
      quantity: 1
    },
    { 
      level: 3, 
      component: { 
        code: 'A8C624-54', 
        description: 'WASHER' 
      }, 
      quantity: 1 
    },
    { 
      level: 3, 
      component: { 
        code: 'A8C624-55', 
        description: 'PRESSURE DISK' 
      }, 
      quantity: 1
    },
    { 
      level: 3, 
      component: { 
        code: 'A8C815-45', 
        description: 'END LID' 
      }, 
      quantity: 1 
    },
    { 
      level: 3, 
      component: { 
        code: 'A8C815-48', 
        description: 'SHAFT' 
      }, 
      quantity: 1 
    },
    { 
      level: 3, 
      component: { 
        code: 'A8C815-61', 
        description: 'WASHER, 030x5' 
      }, 
      quantity: 1 
    },
    { 
      level: 3, 
      component: { 
        code: 'A8C910-7', 
        description: 'WHEEL' 
      }, 
      quantity: 1 
    },
    { 
      level: 3, 
      component: { 
        code: 'A8C942-67', 
        description: 'WHEEL' 
      }, 
      quantity: 1 
    }
  ];
}

// Esportazione ESM
export { getComponentsForSection21 };