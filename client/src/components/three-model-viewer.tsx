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
    
    // URL per i visualizzatori
    console.log("Visualizzazione modello HTML WebGL:", modelData.src);
    
    // Se il backend ci ha fornito un URL del visualizzatore specifico, usalo
    const viewerUrl = modelData.viewerUrl;
    const helperUrl = viewerUrl || `/uploads/model-helper.html?modelUrl=${encodeURIComponent(modelData.src)}&title=${encodeURIComponent(modelData.title || 'Modello 3D')}`;
    const directViewerUrl = `/uploads/direct-viewer.html?modelUrl=${encodeURIComponent(modelData.src)}&title=${encodeURIComponent(modelData.title || 'Modello 3D')}`;
    
    // Usa un approccio più semplice per i modelli HTML WebGL
    return (
      <div
        style={{
          width: width,
          height: height,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
          border: '1px solid #ccc',
        }}
      >
        {/* Overlay superiore con titolo e pulsanti */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '14px',
            zIndex: 10, // Aumentato z-index per essere sopra tutto
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{modelData.title || 'Modello 3D WebGL'}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Pulsante per aprire nel visualizzatore */}
            <a 
              href={helperUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: 'white',
                textDecoration: 'none',
                border: '1px solid white',
                padding: '3px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <span>🔍</span> Visualizzatore
            </a>
            
            {/* Pulsante per aprire direttamente */}
            <a 
              href={directViewerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: 'white',
                textDecoration: 'none',
                border: '1px solid white',
                padding: '3px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <span>↗️</span> Apri direttamente
            </a>
          </div>
        </div>
        
        {/* Contenuto principale che mostra un messaggio più semplice con i pulsanti */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '80%',
            textAlign: 'center',
            zIndex: 2,
          }}
        >
          <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '18px' }}>
            Modello 3D WebGL
          </div>
          <div style={{ marginBottom: '15px' }}>
            I modelli WebGL richiedono di essere aperti in una nuova finestra per una corretta visualizzazione.
            Per visualizzare questo modello, usa uno dei seguenti metodi:
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <a 
              href={helperUrl}
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#3498db',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              Apri nel visualizzatore
            </a>
            <a 
              href={directViewerUrl}
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#2ecc71',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              Apri direttamente
            </a>
          </div>
        </div>
        
        {/* Sfondo leggermente più scuro dietro il messaggio principale */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#f5f5f5',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {/* Immagine rappresentativa di un modello 3D (emoji come segnaposto) */}
          <div style={{ fontSize: '50px', opacity: 0.2 }}>🧊</div>
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