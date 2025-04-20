/**
 * Funzioni specifiche per l'esportazione della sezione 2.1 DISEGNO 3D
 */

// Tabella HTML fissa dei componenti per la sezione 2.1 DISEGNO 3D
const generateSection21ComponentsTable = () => {
  return `
    <div class="bom-container">
      <h4 class="bom-title">Elenco Componenti - Disegno 3D</h4>
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
            <tr>
              <td>1</td>
              <td class="level-3">3</td>
              <td>A8B25040509</td>
              <td>SHAFT Ø82 L=913</td>
              <td>1</td>
            </tr>
            <tr>
              <td>2</td>
              <td class="level-3">3</td>
              <td>A8C614-31</td>
              <td>BEARING SHAFT</td>
              <td>1</td>
            </tr>
            <tr>
              <td>3</td>
              <td class="level-3">3</td>
              <td>A8C624-54</td>
              <td>WASHER</td>
              <td>1</td>
            </tr>
            <tr>
              <td>4</td>
              <td class="level-3">3</td>
              <td>A8C624-55</td>
              <td>PRESSURE DISK</td>
              <td>1</td>
            </tr>
            <tr>
              <td>5</td>
              <td class="level-3">3</td>
              <td>A8C815-45</td>
              <td>END LID</td>
              <td>1</td>
            </tr>
            <tr>
              <td>6</td>
              <td class="level-3">3</td>
              <td>A8C815-48</td>
              <td>SHAFT</td>
              <td>1</td>
            </tr>
            <tr>
              <td>7</td>
              <td class="level-3">3</td>
              <td>A8C815-61</td>
              <td>WASHER, 030x5</td>
              <td>1</td>
            </tr>
            <tr>
              <td>8</td>
              <td class="level-3">3</td>
              <td>A8C910-7</td>
              <td>WHEEL</td>
              <td>1</td>
            </tr>
            <tr>
              <td>9</td>
              <td class="level-3">3</td>
              <td>A8C942-67</td>
              <td>WHEEL</td>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Verifica se una sezione è la sezione 2.1 DISEGNO 3D
const isSection21 = (sectionId, sectionTitle) => {
  if (typeof sectionTitle !== 'string') {
    return false;
  }
  
  const titleLower = sectionTitle.toLowerCase();
  
  // Controlla sia per ID che per titolo per massima compatibilità
  return sectionId === 16 || 
    titleLower.includes('disegno 3d') || 
    (titleLower.includes('2.1') && !titleLower.includes('2.1.'));
};

// Esporta le funzioni in formato ESM
export { 
  generateSection21ComponentsTable,
  isSection21
};

// Compatibilità con CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateSection21ComponentsTable, 
    isSection21
  };
}