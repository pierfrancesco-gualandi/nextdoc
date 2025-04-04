import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeDModelModuleContent } from '@shared/schema';

interface ThreeDirectViewerProps {
  modelData: ThreeDModelModuleContent;
  width?: string | number;
  height?: string | number;
}

const ThreeDirectViewer: React.FC<ThreeDirectViewerProps> = ({
  modelData,
  width = '100%',
  height = '400px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let animationFrameId: number | null = null;

    const init = async () => {
      try {
        // Crea la scena
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);

        // Aggiungi luci
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(1, 1, 1);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-1, 0.5, -1);
        scene.add(directionalLight2);

        // Crea la camera
        const container = containerRef.current;
        if (!container) return;
        
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        camera.position.set(0, 0, 5);

        // Crea il renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        if (container) {
          renderer.setSize(container.clientWidth, container.clientHeight);
          container.appendChild(renderer.domElement);
        }
        renderer.setPixelRatio(window.devicePixelRatio);

        // Aggiungi i controlli
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1;
        controls.maxDistance = 10;
        controls.update();

        // Carica il modello in base al formato
        if (['glb', 'gltf'].includes(modelData.format)) {
          await loadGLTFModel(modelData.src, scene);
        } else {
          // Se non è un formato supportato, mostra un messaggio di errore
          setError(`Formato non supportato: ${modelData.format}`);
          setLoading(false);
          return;
        }

        // Inizia il ciclo di rendering
        const animate = () => {
          if (!renderer || !scene || !camera || !controls) return;
          
          controls.update();
          renderer.render(scene, camera);
          animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        // Gestisci il ridimensionamento della finestra
        const handleResize = () => {
          if (!camera || !renderer || !container) return;
          
          const newAspect = container.clientWidth / container.clientHeight;
          camera.aspect = newAspect;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
        };

        window.addEventListener('resize', handleResize);

        // Pulisci l'animazione quando il componente viene smontato
        return () => {
          window.removeEventListener('resize', handleResize);
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
          if (renderer && container) {
            container.removeChild(renderer.domElement);
          }
          renderer?.dispose();
        };
      } catch (err) {
        console.error('Errore nell\'inizializzazione del visualizzatore 3D:', err);
        setError('Errore nel caricamento del modello 3D');
        setLoading(false);
      }
    };

    // Funzione per caricare modelli GLTF/GLB
    const loadGLTFModel = (url: string, scene: THREE.Scene): Promise<void> => {
      return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        
        // Mostra il progresso di caricamento
        loader.load(
          url,
          (gltf) => {
            // Calcola le dimensioni del modello per centrarlo
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = box.getSize(new THREE.Vector3()).length();
            const center = box.getCenter(new THREE.Vector3());

            // Ridimensiona il modello
            const scale = 3 / size;
            gltf.scene.scale.set(scale, scale, scale);

            // Centra il modello
            gltf.scene.position.x = -center.x * scale;
            gltf.scene.position.y = -center.y * scale;
            gltf.scene.position.z = -center.z * scale;

            // Aggiungi il modello alla scena
            scene.add(gltf.scene);
            setLoading(false);
            resolve();
          },
          (progress) => {
            // Aggiorna il progresso di caricamento
            if (progress.lengthComputable) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setLoadingProgress(percent);
              console.log(`${percent}% loaded`);
            }
          },
          (error) => {
            console.error('Errore nel caricamento del modello:', error);
            setError('Errore nel caricamento del modello 3D');
            setLoading(false);
            reject(error);
          }
        );
      });
    };

    init();
  }, [modelData.src, modelData.format]);

  return (
    <div
      ref={containerRef}
      style={{
        width: width,
        height: height,
        position: 'relative',
        borderRadius: '8px',
        border: '1px solid #ccc',
        overflow: 'hidden',
      }}
    >
      {/* Titolo del modello */}
      {modelData.title && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '8px 12px',
            fontSize: '14px',
            zIndex: 10,
          }}
        >
          {modelData.title}
        </div>
      )}

      {/* Indicatore di caricamento */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(245, 245, 245, 0.7)',
            zIndex: 5,
          }}
        >
          <div style={{ marginBottom: '10px' }}>Caricamento modello...</div>
          <div
            style={{
              width: '200px',
              height: '4px',
              background: '#ddd',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${loadingProgress}%`,
                height: '100%',
                background: '#3498db',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ marginTop: '5px', fontSize: '12px' }}>{loadingProgress}%</div>
        </div>
      )}

      {/* Messaggio di errore */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(245, 245, 245, 0.9)',
            color: '#e74c3c',
            padding: '20px',
            textAlign: 'center',
            zIndex: 5,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default ThreeDirectViewer;