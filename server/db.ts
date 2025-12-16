import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

// RDS requires SSL connection
// Add sslmode=no-verify for development (allows self-signed certificates)
// For production, download RDS CA certificate and use proper SSL config
const connectionString = process.env.DATABASE_URL || '';
const databaseUrl = connectionString.includes('?') 
  ? connectionString + '&sslmode=no-verify'
  : connectionString + '?sslmode=no-verify';

const pool = new pg.Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });
