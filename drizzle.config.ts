import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// RDS requires SSL connection
// Add sslmode=no-verify for development (allows self-signed certificates)
const databaseUrl = process.env.DATABASE_URL.includes('?') 
  ? process.env.DATABASE_URL + '&sslmode=no-verify'
  : process.env.DATABASE_URL + '?sslmode=no-verify';

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
