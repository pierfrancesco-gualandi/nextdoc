// Script per aggiornare le password degli utenti esistenti con hash bcrypt
const bcryptjs = require('bcryptjs');
const { Pool } = require('@neondatabase/serverless');

// Configurazione del database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcryptjs.hash(password, saltRounds);
}

async function updateUserPasswords() {
  try {
    console.log('Aggiornamento password utenti...');
    
    // Lista degli utenti con le loro password attuali
    const users = [
      { id: 1, username: 'admin', password: 'admin123' },
      { id: 2, username: 'andrea', password: '123456' },
      { id: 3, username: 'pietro', password: '123456' },
      { id: 4, username: 'pier', password: '123456' },
      { id: 5, username: 'aa', password: '123456' }
    ];
    
    for (const user of users) {
      const hashedPassword = await hashPassword(user.password);
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );
      console.log(`Password aggiornata per utente: ${user.username}`);
    }
    
    console.log('Tutte le password sono state aggiornate con successo!');
    process.exit(0);
  } catch (error) {
    console.error('Errore durante l\'aggiornamento delle password:', error);
    process.exit(1);
  }
}

updateUserPasswords();