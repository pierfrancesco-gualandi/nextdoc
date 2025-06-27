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
const isSupabase = process.env.DATABASE_URL.includes('supabase.co');

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
