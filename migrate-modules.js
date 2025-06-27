#!/usr/bin/env node

// Script per migrare solo i moduli di contenuto rimasti
import pg from 'pg';
const { Pool } = pg;

const neonPool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_8HTzcJRVhGm0@ep-flat-waterfall-a5y577pm.us-east-2.aws.neon.tech/neondb?sslmode=require"
});

const supabasePool = new Pool({
  connectionString: "postgresql://postgres.tylixamvjebauztnjknq:STSERV_2025!@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"
});

async function migrateModules() {
  console.log('🔧 Migrando moduli di contenuto...');
  
  try {
    const modulesResult = await neonPool.query(`
      SELECT id, section_id, type, content, "order"
      FROM content_modules 
      ORDER BY section_id, "order"
    `);
    
    console.log(`Trovati ${modulesResult.rows.length} moduli da migrare`);
    
    let migrated = 0;
    for (const module of modulesResult.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO content_modules (id, section_id, type, content, "order")
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            content = EXCLUDED.content,
            "order" = EXCLUDED."order"
        `, [module.id, module.section_id, module.type, module.content, module.order]);
        
        migrated++;
        if (migrated % 50 === 0) {
          console.log(`Migrati ${migrated}/${modulesResult.rows.length} moduli...`);
        }
      } catch (error) {
        console.error(`Errore migrando modulo ${module.id}:`, error.message);
      }
    }
    
    console.log(`✅ Migrati ${migrated} moduli di contenuto`);
    
    // Aggiorna la sequenza
    const result = await supabasePool.query(`SELECT MAX(id) FROM content_modules`);
    const maxId = result.rows[0].max || 0;
    await supabasePool.query(`SELECT setval('content_modules_id_seq', ${maxId + 1})`);
    
    console.log('🎉 Migrazione moduli completata!');
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
  } finally {
    await neonPool.end();
    await supabasePool.end();
  }
}

migrateModules().catch(console.error);