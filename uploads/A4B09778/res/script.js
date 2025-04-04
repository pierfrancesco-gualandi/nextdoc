// Script di esempio per modello 3D WebGL

// Variabili globali
let canvas;
let ctx;
let folderInfo = null;
let assetsLoaded = false;
let animationId = null;
let angle = 0;

// Inizializzazione
function init() {
    console.log('Inizializzazione modello 3D');
    
    // Crea elementi nell'interfaccia
    createInterface();
    
    // Configura il canvas
    canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.getElementById('container').appendChild(canvas);
    
    ctx = canvas.getContext('2d');
    
    // Aggiungi event listener per ricevere i dati dal parent
    setupMessageListener();
    
    // Gestisci il ridimensionamento della finestra
    window.addEventListener('resize', onResize);
    
    // Invia una richiesta al parent per ottenere le informazioni sulla cartella
    requestFolderInfo();
    
    // Se non riceviamo risposta entro 2 secondi, iniziamo comunque l'animazione
    setTimeout(() => {
        if (!folderInfo) {
            console.log('Nessuna informazione ricevuta, avvio animazione predefinita');
            startAnimation();
        }
    }, 2000);
}

// Crea l'interfaccia di base
function createInterface() {
    const container = document.getElementById('container');
    
    // Aggiungi titolo
    const title = document.createElement('div');
    title.className = 'model-title';
    title.textContent = 'Modello 3D WebGL di esempio';
    container.appendChild(title);
    
    // Aggiungi status
    const status = document.createElement('div');
    status.className = 'model-status';
    status.id = 'status';
    status.textContent = 'Caricamento...';
    container.appendChild(status);
    
    // Aggiungi controlli
    const controls = document.createElement('div');
    controls.className = 'model-controls';
    
    const resetButton = document.createElement('button');
    resetButton.className = 'model-button';
    resetButton.textContent = 'Reset';
    resetButton.onclick = resetView;
    
    controls.appendChild(resetButton);
    container.appendChild(controls);
}

// Configura il listener per ricevere messaggi dal parent
function setupMessageListener() {
    window.addEventListener('message', (event) => {
        try {
            if (event.data && event.data.type === 'model-folder-info') {
                console.log('Ricevute informazioni sulla cartella:', event.data);
                
                // Salva le informazioni ricevute
                folderInfo = event.data;
                
                // Aggiorna lo stato
                updateStatus(`Modello caricato - ${folderInfo.allFiles?.length || 0} file associati`);
                
                // Carica gli assets
                loadAssets();
                
                // Inizia l'animazione
                startAnimation();
            }
        } catch (error) {
            console.error('Errore nel processare il messaggio ricevuto:', error);
            updateStatus('Errore nel caricamento: ' + error.message);
        }
    });
}

// Richiedi informazioni sulla cartella al parent
function requestFolderInfo() {
    try {
        console.log('Invio richiesta informazioni cartella al parent');
        window.parent.postMessage({ type: 'request-model-folder-info' }, '*');
    } catch (error) {
        console.error('Errore nell\'inviare la richiesta al parent:', error);
        updateStatus('Errore di comunicazione: ' + error.message);
    }
}

// Carica gli assets (immagini, etc.)
function loadAssets() {
    if (!folderInfo) {
        console.warn('Nessuna informazione sulla cartella disponibile per caricare gli assets');
        return;
    }
    
    // Verifica se c'è un file CSS da caricare
    try {
        const cssFiles = folderInfo.allFiles.filter(f => 
            f.originalName.endsWith('.css') || 
            (f.mimeType && f.mimeType.includes('css')));
        
        if (cssFiles.length > 0) {
            console.log('Caricamento file CSS:', cssFiles[0].url);
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssFiles[0].url;
            document.head.appendChild(link);
        }
    } catch (error) {
        console.error('Errore nel caricare il CSS:', error);
    }
    
    // Segna gli assets come caricati
    assetsLoaded = true;
}

// Funzione per l'animazione principale
function animate() {
    // Pulisci il canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Disegna un cubo 3D semplice
    drawCube();
    
    // Continua l'animazione
    animationId = requestAnimationFrame(animate);
}

// Disegna un cubo 3D semplice
function drawCube() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = 150;
    
    // Salva lo stato corrente del contesto
    ctx.save();
    
    // Trasla al centro del canvas
    ctx.translate(centerX, centerY);
    
    // Ruota il cubo
    ctx.rotate(angle);
    angle += 0.01;
    
    // Disegna il cubo (un quadrato per semplicità)
    ctx.fillStyle = 'rgba(0, 120, 215, 0.7)';
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Disegna la griglia sul cubo
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    // Linee orizzontali
    for (let i = 0; i <= 4; i++) {
        const y = -size/2 + i * size/4;
        ctx.beginPath();
        ctx.moveTo(-size/2, y);
        ctx.lineTo(size/2, y);
        ctx.stroke();
    }
    
    // Linee verticali
    for (let i = 0; i <= 4; i++) {
        const x = -size/2 + i * size/4;
        ctx.beginPath();
        ctx.moveTo(x, -size/2);
        ctx.lineTo(x, size/2);
        ctx.stroke();
    }
    
    // Disegna un effetto 3D semplice (linee diagonali dai quattro angoli)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    
    // Angolo in alto a sinistra
    ctx.moveTo(-size/2, -size/2);
    ctx.lineTo(-size/2 + 30, -size/2 - 30);
    
    // Angolo in alto a destra
    ctx.moveTo(size/2, -size/2);
    ctx.lineTo(size/2 + 30, -size/2 - 30);
    
    // Angolo in basso a sinistra
    ctx.moveTo(-size/2, size/2);
    ctx.lineTo(-size/2 + 30, size/2 + 30);
    
    // Angolo in basso a destra
    ctx.moveTo(size/2, size/2);
    ctx.lineTo(size/2 + 30, size/2 + 30);
    
    ctx.stroke();
    
    // Restaura lo stato del contesto
    ctx.restore();
    
    // Mostra info sulla velocità di rotazione
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Rotazione: ${angle.toFixed(2)} rad`, 10, canvas.height - 40);
    
    // Se abbiamo informazioni sulla cartella, mostra il numero di file
    if (folderInfo && folderInfo.allFiles) {
        ctx.fillText(`File nel modello: ${folderInfo.allFiles.length}`, 10, canvas.height - 20);
    }
}

// Avvia l'animazione
function startAnimation() {
    // Ferma l'animazione esistente se presente
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Avvia la nuova animazione
    animate();
    
    // Aggiorna lo stato
    updateStatus('Animazione avviata');
}

// Gestisci il ridimensionamento della finestra
function onResize() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

// Reset della visualizzazione
function resetView() {
    angle = 0;
    updateStatus('Vista resettata');
}

// Aggiorna lo stato visualizzato
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
    console.log('Status:', message);
}

// Inizializza quando il documento è pronto
document.addEventListener('DOMContentLoaded', init);