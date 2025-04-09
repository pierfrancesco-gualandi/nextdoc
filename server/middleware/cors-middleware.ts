import { NextFunction, Request, Response } from 'express';

/**
 * Middleware per gestire CORS e permessi di accesso attraverso iframe
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Abilita CORS per tutte le origini
  res.header('Access-Control-Allow-Origin', '*');
  
  // Consenti metodi comuni
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Consenti header comuni
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Importante: consenti l'incorporamento in iframe impostando Content-Security-Policy
  // Policy più permissiva per supportare WebGL, script inline e risorse esterne
  res.header('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline'; worker-src * blob:; frame-ancestors 'self' *;");
  res.removeHeader('X-Frame-Options'); // Rimuovi X-Frame-Options per consentire iframe

  // Prepara i tipi MIME corretti per i file di modelli 3D
  // Questa mappatura associa le estensioni dei file ai loro tipi MIME corretti
  const mimeTypeMap: Record<string, string> = {
    '.htm': 'text/html',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.obj': 'model/obj',
    '.stl': 'model/stl',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.iv3d': 'application/octet-stream',
    '.jt': 'application/octet-stream',
    '.vrml': 'model/vrml',
    '.wrl': 'model/vrml',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.bin': 'application/octet-stream',
  };

  // Gestisci le richieste OPTIONS per il preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Imposta il tipo MIME corretto per i file in base all'estensione
  if (req.url.startsWith('/uploads/')) {
    const fileExtension = req.url.split('.').pop()?.toLowerCase();
    if (fileExtension && mimeTypeMap[`.${fileExtension}`]) {
      res.type(mimeTypeMap[`.${fileExtension}`]);
    }
    
    // Aggiungi header specifici per i file HTML che contengono WebGL
    if (fileExtension === 'html' || fileExtension === 'htm') {
      // Consenti l'esecuzione di script inline e risorse esterne
      res.header('X-Content-Type-Options', 'nosniff');
      
      // Permetti tutte le caratteristiche per WebGL
      res.header('Feature-Policy', 'accelerometer *; camera *; geolocation *; gyroscope *; magnetometer *; microphone *; payment *; usb *; xr-spatial-tracking *');
      
      // Permetti l'accesso a WebGL e altre API senza restrizioni
      res.header('Cross-Origin-Embedder-Policy', 'require-corp');
      res.header('Cross-Origin-Opener-Policy', 'same-origin');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  }

  next();
}