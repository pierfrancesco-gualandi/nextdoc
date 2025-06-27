-- Script SQL per creare tutte le tabelle necessarie su Supabase
-- Esegui questo script nel tuo database Supabase

-- 1. Tabella users (utenti del sistema)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'reader',
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}'
);

-- 2. Tabella uploaded_files (file caricati)
CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    path TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by_id INTEGER NOT NULL,
    folder_name TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Tabella documents (documenti principali)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    version TEXT NOT NULL DEFAULT '1.0',
    created_by_id INTEGER NOT NULL,
    updated_by_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Tabella document_permissions (permessi specifici per documento)
CREATE TABLE document_permissions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    permission TEXT NOT NULL,
    granted_by_id INTEGER NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Tabella sections (sezioni dei documenti)
CREATE TABLE sections (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL,
    parent_id INTEGER,
    is_module BOOLEAN DEFAULT false
);

-- 6. Tabella content_modules (moduli di contenuto)
CREATE TABLE content_modules (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    content JSONB NOT NULL,
    "order" INTEGER NOT NULL
);

-- 7. Tabella document_versions (versioni dei documenti)
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    version TEXT NOT NULL,
    content JSONB NOT NULL,
    created_by_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- 8. Tabella components (componenti per BOM)
CREATE TABLE components (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    details JSONB
);

-- 9. Tabella boms (Bill of Materials)
CREATE TABLE boms (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT
);

-- 10. Tabella bom_items (elementi della BOM)
CREATE TABLE bom_items (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER NOT NULL,
    component_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    level INTEGER NOT NULL DEFAULT 0
);

-- 11. Tabella section_components (componenti collegati alle sezioni)
CREATE TABLE section_components (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL,
    component_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT
);

-- 12. Tabella comments (commenti sui documenti)
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    section_id INTEGER,
    module_id INTEGER
);

-- 13. Tabella languages (lingue per traduzioni)
CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN DEFAULT false
);

-- 14. Tabella translation_assignments (assegnazioni traduttori)
CREATE TABLE translation_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    is_reviewer BOOLEAN DEFAULT false
);

-- 15. Tabella section_translations (traduzioni sezioni)
CREATE TABLE section_translations (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'not_translated',
    translated_by_id INTEGER,
    reviewed_by_id INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 16. Tabella content_module_translations (traduzioni moduli)
CREATE TABLE content_module_translations (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    title TEXT,
    content JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_translated',
    translated_by_id INTEGER,
    reviewed_by_id INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 17. Tabella translation_imports (log importazioni traduzioni)
CREATE TABLE translation_imports (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    imported_by_id INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    format TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB,
    imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 18. Tabella translation_ai_requests (richieste AI traduzioni)
CREATE TABLE translation_ai_requests (
    id SERIAL PRIMARY KEY,
    source_language_id INTEGER NOT NULL,
    target_language_id INTEGER NOT NULL,
    requested_by_id INTEGER NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending',
    request_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    details JSONB
);

-- 19. Tabella document_translations (traduzioni documenti)
CREATE TABLE document_translations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    version TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'not_translated',
    translated_by_id INTEGER,
    reviewed_by_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 20. Tabella user_document_assignments (assegnazioni documento-utente)
CREATE TABLE user_document_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    assigned_by_id INTEGER NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Creazione degli indici unici
CREATE UNIQUE INDEX user_document_unique ON user_document_assignments (user_id, document_id);

-- Inserimento dati di esempio
-- Utenti predefiniti (con le password corrette)
INSERT INTO users (username, password, role, name, email) VALUES
('admin', '$2b$10$CSGnZeqOaCuYafvxnvGjju7Kwg6bzqHIdoLvw6ECKRuWLXlgbMcfe', 'admin', 'Administrator', 'admin@example.com'),
('andrea', '$2b$10$Z08Fh7hnZdSJKyO9Ac6nGe0AhWnYoiDgAjawDy4Xc7CEBTmomu2fa', 'editor', 'Andrea Rossi', 'andrea@example.com'),
('pietro', '$2b$10$3T3ldz4q7dD05yOCVauJa.BpFGQyZtvLfBbglYud2OjxbqoEtQ06m', 'translator', 'Pietro Bianchi', 'pietro@example.com'),
('pier', '$2b$10$oGHkVj48i6QyzkGhl6jc5.Y5wdDsMHqI1aaFxmuDk9gd/FzuJROJy', 'reader', 'Pier Luigi', 'pier@example.com'),
('aa', '$2b$10$3OE73RkY.bAOktqEwDbE/.7krFx.LMWpeLFiw8pkF3Td0ervgfjYG', 'reader', 'Test User', 'aa@example.com');

-- Lingue predefinite  
INSERT INTO languages (code, name, is_active, is_default) VALUES
('it', 'Italiano', true, true),
('en', 'English', true, false),
('fr', 'Français', true, false),
('de', 'Deutsch', true, false),
('es', 'Español', true, false);

-- Password per riferimento:
-- admin: admin123
-- andrea: 123456  
-- pietro: 123456
-- pier: 123456
-- aa: 123456