# Migrazione a Supabase

## Passi per migrare il database da Neon a Supabase

### 1. Preparazione su Supabase
1. Vai al [Dashboard Supabase](https://supabase.com/dashboard/projects)
2. Crea un nuovo progetto o usa uno esistente
3. Una volta nel progetto, clicca "Connect" nella toolbar superiore
4. Copia l'URI dalla sezione "Connection string" -> "Transaction pooler"
5. Sostituisci `[YOUR-PASSWORD]` con la password del database che hai impostato

### 2. Creazione tabelle
1. Vai su "SQL Editor" nel dashboard di Supabase
2. Copia e incolla tutto il contenuto del file `supabase_migration.sql`
3. Esegui lo script per creare tutte le tabelle

### 3. Configurazione applicazione
Fornisci questi dati quando richiesti:
- **DATABASE_URL**: L'URI completo di connessione da Supabase
- **SUPABASE_ANON_KEY**: La chiave anonima del progetto (opzionale per questa app)

### 4. Struttura database creata
Lo script crea 20 tabelle principali:

#### Tabelle utenti e sicurezza
- `users` - Utenti del sistema con ruoli (admin, editor, translator, reader)
- `user_document_assignments` - Assegnazioni documenti agli utenti

#### Tabelle documenti
- `documents` - Documenti principali
- `document_permissions` - Permessi specifici per documento
- `document_versions` - Versioni e cronologia documenti
- `document_translations` - Traduzioni complete dei documenti
- `sections` - Sezioni e capitoli
- `content_modules` - Moduli di contenuto (testo, immagini, video, 3D, etc.)

#### Tabelle componenti e BOM
- `components` - Database componenti
- `boms` - Bill of Materials
- `bom_items` - Elementi nelle BOM
- `section_components` - Componenti collegati alle sezioni

#### Tabelle traduzioni
- `languages` - Lingue supportate
- `translation_assignments` - Assegnazioni traduttori a lingue
- `section_translations` - Traduzioni delle sezioni
- `content_module_translations` - Traduzioni dei moduli
- `translation_imports` - Log delle importazioni traduzioni
- `translation_ai_requests` - Richieste di traduzione automatica

#### Tabelle sistema
- `uploaded_files` - File caricati (immagini, documenti, modelli 3D)
- `comments` - Commenti sui documenti

### 5. Utenti predefiniti
Lo script crea automaticamente 5 utenti:

| Username | Password | Ruolo | Nome |
|----------|----------|-------|------|
| admin | admin123 | admin | Administrator |
| andrea | 123456 | editor | Andrea Rossi |
| pietro | 123456 | translator | Pietro Bianchi |
| pier | 123456 | reader | Pier Luigi |
| aa | 123456 | reader | Test User |

### 6. Lingue predefinite
- Italiano (predefinita)
- English
- Français
- Deutsch
- Español

## Note tecniche
- Tutte le password sono hasstate con bcrypt
- Le tabelle usano SERIAL per le chiavi primarie (auto-increment)
- I timestamp includono il fuso orario (TIMESTAMP WITH TIME ZONE)
- Gli indici unici prevengono duplicazioni nelle assegnazioni utente-documento
- I campi JSONB consentono contenuto flessibile per moduli e traduzioni

Una volta completata la migrazione, l'applicazione funzionerà identicamente ma con il database su Supabase invece che Neon.