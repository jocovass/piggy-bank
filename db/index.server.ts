import { remember } from '@epic-web/remember';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import ws from 'ws';
import * as schema from './schema';

const { Pool: PgPool } = pg;

export const db = remember('drizzle', () => {
	if (process.env.NODE_ENV === 'production') {
		neonConfig.webSocketConstructor = ws;
		const pool = new Pool({ connectionString: process.env.DB_URL });
		return neonDrizzle(pool, { schema });
	} else {
		const client = new PgPool({ connectionString: process.env.DB_URL });
		return pgDrizzle(client, { schema });
	}
});

export type DB = typeof db;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
