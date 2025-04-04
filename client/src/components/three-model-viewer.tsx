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
        {modelData.title && (
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
            }}
          >
            {modelData.title}
          </div>
        )}
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
              if (iframe.contentWindow && modelData.folderPath) {
                iframe.contentWindow.postMessage({
                  type: 'model-folder-path',
                  folderPath: modelData.folderPath
                }, '*');
              }
            } catch (error) {
              console.error('Errore nel passare il percorso cartella all\'iframe:', error);
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
      {modelData.title && (
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
          }}
        >
          {modelData.title}
        </div>
      )}
    </div>
  );
};

export default ThreeModelViewer;