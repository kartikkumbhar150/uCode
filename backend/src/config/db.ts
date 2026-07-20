import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let db: ReturnType<typeof drizzle>;

export const connectDB = async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('DATABASE_URL is not set. Skipping DB connection.');
      return;
    }

    const sql = neon(connectionString);
    db = drizzle(sql, { schema });
    console.log('Neon PostgreSQL connected successfully.');
  } catch (error) {
    console.error(`Neon DB connection error: ${error}`);
    process.exit(1);
  }
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
};

export default { connectDB, getDb };
