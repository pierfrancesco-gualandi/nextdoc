#!/usr/bin/env node

// Script per migrare solo section_components da Neon a Supabase
import pg from 'pg';
const { Pool } = pg;

const neonPool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_8HTzcJRVhGm0@ep-flat-waterfall-a5y577pm.us-east-2.aws.neon.tech/neondb?sslmode=require"
});

const supabasePool = new Pool({
  connectionString: "postgresql://postgres.tylixamvjebauztnjknq:STSERV_2025!@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"
});

async function migrateSectionComponents() {
  console.log('🔧 Migrando section_components...');
  
  try {
    const result = await neonPool.query(`
      SELECT id, section_id, component_id, quantity, notes
      FROM section_components 
      ORDER BY id
    `);
    
    console.log(`Trovati ${result.rows.length} section_components da migrare`);
    
    let migrated = 0;
    for (const sc of result.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO section_components (id, section_id, component_id, quantity, notes)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            section_id = EXCLUDED.section_id,
            component_id = EXCLUDED.component_id,
            quantity = EXCLUDED.quantity,
            notes = EXCLUDED.notes
        `, [sc.id, sc.section_id, sc.component_id, sc.quantity, sc.notes]);
        
        migrated++;
        if (migrated % 25 === 0) {
          console.log(`Migrati ${migrated}/${result.rows.length} section_components...`);
        }
      } catch (error) {
        console.error(`Errore migrando section_component ${sc.id}:`, error.message);
      }
    }
    
    console.log(`✅ Migrati ${migrated} section_components`);
    
    // Aggiorna la sequenza
    const maxResult = await supabasePool.query(`SELECT MAX(id) FROM section_components`);
    const maxId = maxResult.rows[0].max || 0;
    await supabasePool.query(`SELECT setval('section_components_id_seq', ${maxId + 1})`);
    
    console.log('🎉 Migrazione section_components completata!');
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
  } finally {
    await neonPool.end();
    await supabasePool.end();
  }
}

migrateSectionComponents().catch(console.error);