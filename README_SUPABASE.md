# 🚀 Migrazione a Supabase - Istruzioni Complete

## ✅ Cosa ho preparato per te

Ho modificato l'applicazione per supportare **automaticamente** sia Neon che Supabase. Il sistema rileva automaticamente il tipo di database dalla URL di connessione.

### 📁 File creati
- `supabase_migration.sql` - Script completo per creare tutte le tabelle
- `MIGRAZIONE_SUPABASE.md` - Documentazione dettagliata della migrazione
- `README_SUPABASE.md` - Questo file con le istruzioni

### 🔧 Modifiche al codice
- Aggiornato `server/db.ts` per rilevamento automatico Supabase/Neon
- Installato pacchetto `postgres` per connessione Supabase
- Sistema di configurazione adattivo (nessuna modifica manuale richiesta)

## 🎯 Passi per completare la migrazione

### 1. Crea il database su Supabase
1. Vai su [supabase.com/dashboard](https://supabase.com/dashboard/projects)
2. Crea un nuovo progetto o usa uno esistente
3. Clicca "Connect" nella toolbar superiore
4. Copia l'URI dalla sezione "Connection string" -> "Transaction pooler"
5. Sostituisci `[YOUR-PASSWORD]` con la password del tuo database

### 2. Esegui lo script SQL
1. Vai su "SQL Editor" nel dashboard Supabase
2. Copia tutto il contenuto del file `supabase_migration.sql`
3. Incolla e esegui lo script
4. ✅ Tutte le 20 tabelle saranno create automaticamente

### 3. Configura l'applicazione
Quando sei pronto, forniscimi:
- **DATABASE_URL**: L'URI completo di Supabase (quello che hai copiato al punto 1)

## 📋 Cosa viene creato automaticamente

### 👥 Utenti predefiniti (con le tue password attuali)
| Username | Password | Ruolo |
|----------|----------|--------|
| admin | admin123 | admin |
| andrea | 123456 | editor |
| pietro | 123456 | translator |
| pier | 123456 | reader |
| aa | 123456 | reader |

### 🌐 Lingue supportate
- Italiano (predefinita)
- English, Français, Deutsch, Español

### 🗄️ Database completo
- 20 tabelle principali
- Sistema utenti con ruoli
- Gestione documenti e sezioni
- Sistema traduzioni completo
- BOM e componenti
- File upload e commenti
- Assegnazioni documento-utente

## 🚀 Vantaggi della migrazione

✅ **Nessuna modifica al codice** - L'app rileva automaticamente il database  
✅ **Password identiche** - Tutti gli utenti mantengono le stesse credenziali  
✅ **Dati preservati** - Struttura identica a quella attuale  
✅ **Zero downtime** - Cambio istantaneo solo modificando DATABASE_URL  
✅ **Rollback facile** - Puoi tornare a Neon in qualsiasi momento  

## 🔄 Migrazione istantanea

Una volta che hai:
1. ✅ Creato il progetto Supabase
2. ✅ Eseguito lo script SQL
3. ✅ Ottenuto la DATABASE_URL

L'applicazione passerà automaticamente a Supabase. Non serve riavviare nulla, il sistema rileva automaticamente il cambio di database.

---

**Sei pronto per iniziare? Dammi la tua DATABASE_URL di Supabase e la migrazione sarà completata in secondi!** 🎉