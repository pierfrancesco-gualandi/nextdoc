import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeDModelModuleContent } from '@shared/schema';

interface ThreeModelViewerProps {
  modelData: ThreeDModelModuleContent;
  width?: string | number;
  height?: string | number;
}

const ThreeModelViewer: React.FC<ThreeModelViewerProps> = ({ 
  modelData, 
  width = '100%', 
  height = '400px' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number | null>(null);

  // Setup the scene, camera, renderer, and controls
  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    
    // Configura i controlli in base alle opzioni del modello
    if (modelData.controls) {
      controls.enableRotate = modelData.controls.rotate;
      controls.enableZoom = modelData.controls.zoom;
      controls.enablePan = modelData.controls.pan;
    } else {
      // Default: abilita tutto
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = true;
    }
    
    controlsRef.current = controls;

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) return;
      
      frameIdRef.current = requestAnimationFrame(animate);
      
      controlsRef.current.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    animate();

    // Load 3D model
    loadModel(modelData.src, modelData.format);

    // Cleanup
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update when model data changes
  useEffect(() => {
    loadModel(modelData.src, modelData.format);
  }, [modelData.src, modelData.format]);

  // Function to load the 3D model
  const loadModel = (src: string, format: string) => {
    if (format === 'html' || format === 'webgl') {
      // For HTML/WebGL content, la visualizzazione avviene tramite iframe,
      // quindi non abbiamo bisogno di caricare nulla qui
      return;
    }
    
    if (!sceneRef.current) return;
    
    // Clear existing model
    sceneRef.current.children = sceneRef.current.children.filter(child => {
      return child.type === 'AmbientLight' || child.type === 'DirectionalLight';
    });

    if (format === 'glb' || format === 'gltf') {
      const loader = new GLTFLoader();
      
      loader.load(
        src,
        (gltf: { scene: THREE.Group }) => {
          if (!sceneRef.current || !cameraRef.current) return;
          
          const model = gltf.scene;
          sceneRef.current.add(model);
          
          // Center and scale the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2.0 / maxDim;
          model.scale.set(scale, scale, scale);
          
          model.position.sub(center.multiplyScalar(scale));
          
          // Reset camera position based on model
          cameraRef.current.position.z = 5;
          
          if (controlsRef.current) {
            controlsRef.current.update();
          }
        },
        (xhr: { loaded: number; total: number }) => {
          // Loading progress
          console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
        },
        (error: unknown) => {
          console.error('Error loading model:', error);
        }
      );
    } else if (format !== 'html' && format !== 'webgl') {
      console.error('Unsupported 3D model format:', format);
    }
  };

  // Rendering diverso in base al formato
  if (modelData.format === 'html' || modelData.format === 'webgl') {
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
            zIndex: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>{modelData.title || 'Modello 3D WebGL'}</div>
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
        <iframe 
          src={modelData.src}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
          title={modelData.title || 'WebGL 3D Model'}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="accelerometer; autoplay; camera; encrypted-media; gyroscope; picture-in-picture"
          data-folder-path={modelData.folderPath || ''}
          onLoad={(e) => {
            // Dopo il caricamento dell'iframe, tentiamo di comunicare con il suo contenuto
            // per passare il percorso della cartella con i file aggiuntivi
            try {
              const iframe = e.currentTarget;
              // Estraiamo il nome della cartella dal percorso se non è esplicitamente fornito
              let folderName = modelData.folderName || '';
              let folderPath = modelData.folderPath || '';
              
              // Se abbiamo folderPath ma non folderName, estraiamo il nome dalla path
              if (folderPath && !folderName) {
                // Rimuovi eventuali slash iniziali o finali
                folderPath = folderPath.replace(/^\/+|\/+$/g, '');
                
                // Prendi solo l'ultimo segmento del percorso come nome cartella
                if (folderPath.includes('/')) {
                  folderName = folderPath.split('/').pop() || '';
                } else {
                  folderName = folderPath;
                }
              }
              
              console.log("ThreeModelViewer - File principale:", modelData.src);
              console.log("ThreeModelViewer - Folder path:", folderPath);
              console.log("ThreeModelViewer - Folder name:", folderName);
              console.log("ThreeModelViewer - All files:", modelData.allFiles?.length || 0);
              console.log("ThreeModelViewer - File structure keys:", Object.keys(modelData.fileStructure || {}).length);
              
              // Se non abbiamo allFiles ma abbiamo un folderName, creiamo una mappatura dummy di base
              let allFiles = modelData.allFiles || [];
              if (allFiles.length === 0 && folderName) {
                // Creiamo una struttura minima con il file HTML principale
                const mainFileName = modelData.src.split('/').pop() || '';
                
                // Estrai l'URL base per i file nella cartella
                const baseUrl = modelData.src.substring(0, modelData.src.lastIndexOf('/') + 1);
                
                // Aggiungi il file principale
                allFiles = [{
                  id: 1,
                  filename: mainFileName,
                  originalName: mainFileName,
                  url: modelData.src,
                  mimeType: 'text/html',
                  relativePath: `${folderName}/${mainFileName}`
                }];
                
                // Aggiungi anche alcune risorse comuni che potrebbero essere necessarie
                const commonResources = [
                  { filename: 'index.html', mimeType: 'text/html' },
                  { filename: 'style.css', mimeType: 'text/css' },
                  { filename: 'script.js', mimeType: 'application/javascript' },
                  { filename: 'res/style.css', mimeType: 'text/css' },
                  { filename: 'res/script.js', mimeType: 'application/javascript' }
                ];
                
                commonResources.forEach((resource, index) => {
                  const url = `${baseUrl}${resource.filename}`;
                  allFiles.push({
                    id: index + 2,
                    filename: resource.filename,
                    originalName: resource.filename,
                    url: url,
                    mimeType: resource.mimeType,
                    relativePath: `${folderName}/${resource.filename}`
                  });
                });
              }
              
              // Prima crea una mappa di percorsi relativi per facilitare l'accesso dall'HTML
              const fileMap: Record<string, string> = {};
              
              // Aggiungiamo sempre il file principale
              const mainFileName = modelData.src.split('/').pop() || '';
              fileMap[mainFileName] = modelData.src;
              
              // Aggiugiamo i percorsi agli helper generati
              const helperUrl = '/uploads/model-helper.html';
              fileMap['model-helper.html'] = helperUrl;
              
              // Se abbiamo la lista dei file con URL, crea una mappa per l'HTML
              if (allFiles.length > 0) {
                allFiles.forEach(file => {
                  // Estrai il nome del file dal percorso relativo per facilitare l'accesso dall'HTML
                  const relativePath = file.relativePath || '';
                  let key = file.originalName;
                  
                  // Prendi solo il nome del file per facilitare l'accesso dall'HTML
                  if (relativePath.includes('/')) {
                    const parts = relativePath.split('/');
                    const fileName = parts[parts.length - 1];
                    // Aggiungi anche una chiave con solo il nome del file
                    fileMap[fileName] = file.url;
                  }
                  
                  // Aggiungi sempre il percorso completo
                  fileMap[file.originalName] = file.url;
                  // E aggiungi anche il percorso relativo se disponibile
                  if (relativePath) {
                    fileMap[relativePath] = file.url;
                  }
                });
              }
              
              // Crea una struttura file minima se non ne abbiamo una
              let fileStructure = modelData.fileStructure || {};
              if (Object.keys(fileStructure).length === 0 && folderName) {
                fileStructure = {};
                
                // Aggiungi il file principale
                fileStructure[mainFileName] = `${folderName}/${mainFileName}`;
                
                // Aggiungi anche le risorse comuni
                allFiles.forEach(file => {
                  if (file.relativePath) {
                    fileStructure[file.originalName] = file.relativePath;
                  } else {
                    fileStructure[file.originalName] = `${folderName}/${file.originalName}`;
                  }
                });
              }
              
              // Ottieni le informazioni sulla cartella del modello per passarle all'iframe
              const modelInfo = {
                type: 'model-folder-info',
                folderPath: folderPath,
                folderName: folderName,
                fileStructure: fileStructure,
                allFiles: allFiles,
                // Aggiungi la mappa dei file
                fileMap: fileMap
              };
              
              console.log('Invio informazioni sul modello all\'iframe:', modelInfo);
              
              // Invia le informazioni all'iframe quando è caricato
              if (iframe.contentWindow) {
                // Invia immediatamente
                iframe.contentWindow.postMessage(modelInfo, '*');
                
                // Riprova ad inviare più volte per assicurarsi che
                // l'iframe abbia avuto tempo di impostare gli event listener
                [500, 1000, 2000].forEach(delay => {
                  setTimeout(() => {
                    if (iframe.contentWindow) {
                      iframe.contentWindow.postMessage(modelInfo, '*');
                    }
                  }, delay);
                });
              }
              
              // Aggiungi un message listener per comunicare con l'iframe
              window.addEventListener('message', (event) => {
                // Verifica se il messaggio è una richiesta di informazioni sulla cartella
                if (event.data && event.data.type === 'request-model-folder-info') {
                  console.log('Ricevuta richiesta di informazioni sulla cartella dal modello:', event.data);
                  if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage(modelInfo, '*');
                  }
                }
              });
            } catch (error) {
              console.error('Errore nel passare le informazioni sulla cartella all\'iframe:', error);
            }
          }}
        />
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