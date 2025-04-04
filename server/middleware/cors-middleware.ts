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
  res.header('Content-Security-Policy', "frame-ancestors 'self' *");
  res.header('X-Frame-Options', 'ALLOWALL');

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
  }

  next();
}