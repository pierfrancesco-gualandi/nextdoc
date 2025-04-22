import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ThreeModelViewerProps {
  modelData: {
    src: string;
    format: string;
    title?: string;
    folderPath?: string;
    folderName?: string;
    viewerUrl?: string; // URL specifico per il visualizzatore fornito dal backend
    allFiles?: Array<{
      id: number;
      filename: string;
      originalName: string;
      url: string;
      mimeType: string;
      relativePath?: string;
    }>;
    fileStructure?: Record<string, string>;
  };
  width?: string | number;
  height?: string | number;
}

const ThreeModelViewer: React.FC<ThreeModelViewerProps> = ({ 
  modelData, 
  width = '100%', 
  height = '300px' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageHandlersRef = useRef<Array<(event: MessageEvent) => void>>([]);
  
  // Stato per tracciare il caricamento del modello
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cleanup per evitare memory leaks
  useEffect(() => {
    return () => {
      // Cancella timers
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Cancella animazioni
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      // Distruggi i controlli se esistono
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      // Rimuovi event listeners
      messageHandlersRef.current.forEach(handler => {
        window.removeEventListener('message', handler);
      });
      
      // Pulizia THREE.js
      if (rendererRef.current) {
        const renderer = rendererRef.current;
        // Distruggi il renderer
        if (renderer.domElement && renderer.domElement.parentNode) {
          try {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          } catch (e) {
            console.error("Error removing renderer:", e);
          }
        }
        renderer.dispose();
        rendererRef.current = null;
      }
      
      // Pulisci la scena
      if (sceneRef.current) {
        const scene = sceneRef.current;
        scene.traverse((object: THREE.Object3D) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) {
              object.geometry.dispose();
            }
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
        while(scene.children.length > 0) { 
          scene.remove(scene.children[0]); 
        }
        sceneRef.current = null;
      }
      
      // Rimuovi riferimenti alla camera
      cameraRef.current = null;
    };
  }, []);
  
  // Funzione per impostare l'ambiente 3D
  const setupThreeJS = () => {
    if (!containerRef.current) return;
    
    // Pulisci il contenitore
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    
    // Crea scena, camera e renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    const camera = new THREE.PerspectiveCamera(
      45, // FOV
      containerRef.current.clientWidth / containerRef.current.clientHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    
    // Aggiungi luci
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Imposta controlli orbitali
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Posiziona la camera
    camera.position.z = 5;
    
    // Salva riferimenti
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    
    // Funzione di animazione
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    // Avvia animazione
    animate();
    
    // Gestione del resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Aggiungiamo listener al ref per pulizia
    const resizeListener = { handleResize };
    
    // Ritorna funzione per pulizia
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };
  
  // Funzione per caricare il modello
  const loadModel = (src: string, format: string) => {
    if (!sceneRef.current || !cameraRef.current) {
      console.error('Scene or camera not initialized');
      setError('Errore di inizializzazione scena');
      setLoading(false);
      return;
    }
    
    if (format === 'gltf' || format === 'glb') {
      const loader = new GLTFLoader();
      
      loader.load(
        src,
        (gltf) => {
          // Modello caricato con successo
          const model = gltf.scene;
          
          // Centra il modello
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          
          // Adatta la scala
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          model.scale.set(scale, scale, scale);
          
          // Centra il modello
          model.position.x = -center.x * scale;
          model.position.y = -center.y * scale;
          model.position.z = -center.z * scale;
          
          // Aggiungi il modello alla scena
          sceneRef.current?.add(model);
          
          // Imposta la camera per vedere tutto il modello
          const dist = maxDim * 2.5;
          cameraRef.current?.position.set(dist, dist / 2, dist);
          cameraRef.current?.lookAt(0, 0, 0);
          
          // Aggiorna stato
          setLoading(false);
        },
        (progress) => {
          // Opzionale: gestisci progressi di caricamento
        },
        (error) => {
          console.error('Error loading GLTF model:', error);
          setError('Errore nel caricamento del modello');
          setLoading(false);
        }
      );
    } else if (format === 'obj') {
      const loader = new OBJLoader();
      
      loader.load(
        src,
        (object) => {
          // Centra il modello
          const box = new THREE.Box3().setFromObject(object);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          
          // Adatta la scala
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          object.scale.set(scale, scale, scale);
          
          // Centra il modello
          object.position.x = -center.x * scale;
          object.position.y = -center.y * scale;
          object.position.z = -center.z * scale;
          
          // Aggiungi il modello alla scena
          sceneRef.current?.add(object);
          
          // Imposta la camera per vedere tutto il modello
          const dist = maxDim * 2.5;
          cameraRef.current?.position.set(dist, dist / 2, dist);
          cameraRef.current?.lookAt(0, 0, 0);
          
          // Aggiorna stato
          setLoading(false);
        },
        (progress) => {
          // Opzionale: gestisci progressi di caricamento
        },
        (error) => {
          console.error('Error loading OBJ model:', error);
          setError('Errore nel caricamento del modello');
          setLoading(false);
        }
      );
    } else {
      console.error('Unsupported 3D model format:', format);
    }
  };

  // Renderizzazione diversa in base al formato
  if (modelData && (modelData.format === 'html' || modelData.format === 'webgl')) {
    // Verifica se abbiamo un URL valido
    if (!modelData.src) {
      return (
        <div 
          style={{
            width: width,
            height: height,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '8px',
            border: '1px solid #ccc',
            backgroundColor: '#f9f9f9',
            color: '#d32f2f',
            flexDirection: 'column',
            padding: '20px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Errore di caricamento</div>
          <div>URL del modello non specificato.</div>
        </div>
      );
    }
    
    console.log("Visualizzazione modello HTML WebGL:", modelData.src);
    
    // URL diretto al modello HTML/WebGL
    const directUrl = modelData.src;
    
    // Ottieni il nome della cartella e del file dal modello
    // Priorità: 1. folderPath esplicito dai metadati, 2. Nome nel titolo, 3. Nome estratto dal percorso
    let baseFileName = '';
    let fileExtension = 'htm';
    
    // Determina il nome del file dal titolo (priorità più alta)
    if (modelData.title && (modelData.title.endsWith('.htm') || modelData.title.endsWith('.html'))) {
      const parts = modelData.title.split('.');
      fileExtension = parts.pop() || 'htm';
      baseFileName = parts.join('.');
    } 
    // Se non abbiamo un nome valido dal titolo, estraiamolo dal percorso src
    else {
      const filename = modelData.src.split('/').pop() || '';
      // Rimuovi l'ID univoco dal nome del file (formato: 1234567890-hash.nome_file.estensione)
      const cleanFilename = filename.replace(/^\d+-[a-f0-9]+\.(.+)$/, '$1');
      const parts = cleanFilename.split('.');
      fileExtension = parts.pop() || 'htm';
      baseFileName = parts.join('.');
    }
    
    // Il nome della cartella è specificato esplicitamente o deriva dal nome del file
    const folderName = modelData.folderPath || baseFileName;
    
    // L'URL ideale è nella forma /uploads/NOME_CARTELLA/NOME_CARTELLA.estensione
    const modelUrl = `/uploads/${folderName}/${folderName}.${fileExtension}`;
    
    console.log('3D Model URL:', {
      folderName,
      baseFileName,
      fileExtension,
      finalUrl: modelUrl,
      originalSrc: modelData.src
    });
    
    // Utilizziamo un pulsante per aprire il modello 3D in una nuova finestra,
    // poiché il modello richiede file esterni nella stessa cartella
    return (
      <div
        style={{
          width: width,
          height: height,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
          border: '1px solid #ccc',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>
            {modelData.title || 'Modello 3D WebGL'}
          </div>
          <div style={{ fontSize: '14px', color: '#666', maxWidth: '80%', margin: '0 auto' }}>
            Questo modello 3D richiede file esterni specifici per funzionare correttamente.
            Utilizza il pulsante qui sotto per visualizzare il modello con tutti i componenti.
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <a
            href={modelUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#0d7855',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '4px',
              fontWeight: 'bold',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
              fontSize: '15px',
              textAlign: 'center',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            Visualizza modello 3D con tutti i componenti
          </a>
        </div>
        
        <div style={{ marginTop: '15px', fontSize: '13px', color: '#777', textAlign: 'center' }}>
          <a 
            href={`/uploads/${folderName}.zip`}
            style={{
              display: 'inline-block',
              marginTop: '10px',
              color: '#0366d6',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Scarica il modello completo (.zip)
          </a>
        </div>
      </div>
    );
  }

  // Three.js renderer per GLB/GLTF
  return (
    <div
      ref={containerRef}
      style={{
        width: width,
        height: height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        border: '1px solid #ccc',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          fontSize: '14px',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>{modelData.title || 'Modello 3D'}</div>
        <a 
          href={modelData.src} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            color: 'white',
            textDecoration: 'none',
            border: '1px solid white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '12px'
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          Apri in nuova finestra
        </a>
      </div>
    </div>
  );
};

export default ThreeModelViewer;