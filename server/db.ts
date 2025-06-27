import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Determina se stiamo usando Supabase o Neon
const databaseUrl = process.env.DATABASE_URL;
const isSupabase = databaseUrl.includes('supabase.com') || 
                   databaseUrl.includes('supabase.co') ||
                   databaseUrl.includes('pooler.supabase.com') ||
                   databaseUrl.includes('tylixamvjebauztnjknq');

console.log('🔍 Database URL check:', {
  url: databaseUrl?.substring(0, 50) + '...',
  isSupabase,
  includes: {
    supabasecom: databaseUrl.includes('supabase.com'),
    supabaseco: databaseUrl.includes('supabase.co'),
    pooler: databaseUrl.includes('pooler.supabase.com'),
    project: databaseUrl.includes('tylixamvjebauztnjknq')
  }
});

let db;
let pool;

if (isSupabase) {
  // Configurazione per Supabase (PostgreSQL standard)
  console.log('🔌 Connecting to Supabase database...');
  const client = postgres(process.env.DATABASE_URL);
  db = drizzlePostgres(client, { schema });
} else {
  // Configurazione per Neon (serverless)
  console.log('🔌 Connecting to Neon database...');
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { db, pool };
