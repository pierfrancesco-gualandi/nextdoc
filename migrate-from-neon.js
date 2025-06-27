#!/usr/bin/env node

// Script per migrare i dati dal database Neon a Supabase
import pg from 'pg';
const { Pool } = pg;

// Configurazione database Neon (sorgente)
const neonPool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_8HTzcJRVhGm0@ep-flat-waterfall-a5y577pm.us-east-2.aws.neon.tech/neondb?sslmode=require"
});

// Configurazione database Supabase (destinazione)
const supabasePool = new Pool({
  connectionString: "postgresql://postgres.tylixamvjebauztnjknq:STSERV_2025!@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"
});

async function migrateData() {
  console.log('🚀 Iniziando migrazione da Neon a Supabase...');
  
  try {
    // 1. Migra i documenti principali
    console.log('📄 Migrando documenti...');
    const documentsResult = await neonPool.query(`
      SELECT id, title, description, status, version, created_by_id, updated_by_id, created_at, updated_at 
      FROM documents 
      ORDER BY id
    `);
    
    for (const doc of documentsResult.rows) {
      await supabasePool.query(`
        INSERT INTO documents (id, title, description, status, version, created_by_id, updated_by_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          version = EXCLUDED.version,
          updated_at = EXCLUDED.updated_at
      `, [doc.id, doc.title, doc.description, doc.status, doc.version, doc.created_by_id, doc.updated_by_id, doc.created_at, doc.updated_at]);
    }
    console.log(`✅ Migrati ${documentsResult.rows.length} documenti`);

    // 2. Migra le sezioni
    console.log('📑 Migrando sezioni...');
    const sectionsResult = await neonPool.query(`
      SELECT id, document_id, title, description, "order", parent_id, is_module
      FROM sections 
      ORDER BY document_id, "order"
    `);
    
    for (const section of sectionsResult.rows) {
      await supabasePool.query(`
        INSERT INTO sections (id, document_id, title, description, "order", parent_id, is_module)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          "order" = EXCLUDED."order",
          parent_id = EXCLUDED.parent_id,
          is_module = EXCLUDED.is_module
      `, [section.id, section.document_id, section.title, section.description, section.order, section.parent_id, section.is_module]);
    }
    console.log(`✅ Migrate ${sectionsResult.rows.length} sezioni`);

    // 3. Migra i moduli di contenuto
    console.log('🔧 Migrando moduli di contenuto...');
    const modulesResult = await neonPool.query(`
      SELECT id, section_id, type, content, "order"
      FROM content_modules 
      ORDER BY section_id, "order"
    `);
    
    for (const module of modulesResult.rows) {
      await supabasePool.query(`
        INSERT INTO content_modules (id, section_id, type, content, "order")
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          content = EXCLUDED.content,
          "order" = EXCLUDED."order"
      `, [module.id, module.section_id, module.type, module.content, module.order]);
    }
    console.log(`✅ Migrati ${modulesResult.rows.length} moduli di contenuto`);

    // 4. Migra i componenti
    console.log('⚙️ Migrando componenti...');
    const componentsResult = await neonPool.query(`
      SELECT id, code, description, details
      FROM components 
      ORDER BY id
    `);
    
    for (const component of componentsResult.rows) {
      await supabasePool.query(`
        INSERT INTO components (id, code, description, details)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          description = EXCLUDED.description,
          details = EXCLUDED.details
      `, [component.id, component.code, component.description, component.details]);
    }
    console.log(`✅ Migrati ${componentsResult.rows.length} componenti`);

    // 5. Migra le BOM
    console.log('📋 Migrando BOM...');
    const bomsResult = await neonPool.query(`
      SELECT id, title, description
      FROM boms 
      ORDER BY id
    `);
    
    for (const bom of bomsResult.rows) {
      await supabasePool.query(`
        INSERT INTO boms (id, title, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description
      `, [bom.id, bom.title, bom.description]);
    }
    console.log(`✅ Migrate ${bomsResult.rows.length} BOM`);

    // 6. Migra gli elementi BOM
    console.log('🔗 Migrando elementi BOM...');
    const bomItemsResult = await neonPool.query(`
      SELECT id, bom_id, component_id, quantity, level
      FROM bom_items 
      ORDER BY bom_id, level, id
    `);
    
    for (const item of bomItemsResult.rows) {
      await supabasePool.query(`
        INSERT INTO bom_items (id, bom_id, component_id, quantity, level)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          quantity = EXCLUDED.quantity,
          level = EXCLUDED.level
      `, [item.id, item.bom_id, item.component_id, item.quantity, item.level]);
    }
    console.log(`✅ Migrati ${bomItemsResult.rows.length} elementi BOM`);

    // 7. Migra i file caricati
    console.log('📁 Migrando file caricati...');
    const filesResult = await neonPool.query(`
      SELECT id, filename, original_name, path, mimetype, size, uploaded_by_id, folder_name, uploaded_at
      FROM uploaded_files 
      ORDER BY id
    `);
    
    for (const file of filesResult.rows) {
      await supabasePool.query(`
        INSERT INTO uploaded_files (id, filename, original_name, path, mimetype, size, uploaded_by_id, folder_name, uploaded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          filename = EXCLUDED.filename,
          original_name = EXCLUDED.original_name,
          path = EXCLUDED.path,
          mimetype = EXCLUDED.mimetype,
          size = EXCLUDED.size,
          folder_name = EXCLUDED.folder_name
      `, [file.id, file.filename, file.original_name, file.path, file.mimetype, file.size, file.uploaded_by_id, file.folder_name, file.uploaded_at]);
    }
    console.log(`✅ Migrati ${filesResult.rows.length} file`);

    // Aggiorna le sequenze per evitare conflitti negli ID
    console.log('🔄 Aggiornando sequenze...');
    
    const sequences = [
      'documents_id_seq',
      'sections_id_seq', 
      'content_modules_id_seq',
      'components_id_seq',
      'boms_id_seq',
      'bom_items_id_seq',
      'uploaded_files_id_seq'
    ];

    for (const seq of sequences) {
      const tableName = seq.replace('_id_seq', '');
      const result = await supabasePool.query(`SELECT MAX(id) FROM ${tableName}`);
      const maxId = result.rows[0].max || 0;
      await supabasePool.query(`SELECT setval('${seq}', ${maxId + 1})`);
    }

    console.log('🎉 Migrazione completata con successo!');
    
    // Statistiche finali
    const stats = await supabasePool.query(`
      SELECT 
        (SELECT COUNT(*) FROM documents) as documenti,
        (SELECT COUNT(*) FROM sections) as sezioni,
        (SELECT COUNT(*) FROM content_modules) as moduli,
        (SELECT COUNT(*) FROM components) as componenti,
        (SELECT COUNT(*) FROM boms) as bom,
        (SELECT COUNT(*) FROM bom_items) as elementi_bom,
        (SELECT COUNT(*) FROM uploaded_files) as file
    `);
    
    console.log('\n📊 Statistiche migrazione:');
    console.log(`• Documenti: ${stats.rows[0].documenti}`);
    console.log(`• Sezioni: ${stats.rows[0].sezioni}`);
    console.log(`• Moduli: ${stats.rows[0].moduli}`);
    console.log(`• Componenti: ${stats.rows[0].componenti}`);
    console.log(`• BOM: ${stats.rows[0].bom}`);
    console.log(`• Elementi BOM: ${stats.rows[0].elementi_bom}`);
    console.log(`• File: ${stats.rows[0].file}`);

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    throw error;
  } finally {
    await neonPool.end();
    await supabasePool.end();
  }
}

// Esegui la migrazione
migrateData().catch(console.error);