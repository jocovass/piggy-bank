import { remember } from '@epic-web/remember';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

export const db = remember('drizzle', () => {
	neonConfig.webSocketConstructor = ws;
	const pool = new Pool({ connectionString: process.env.DB_URL });
	return drizzle(pool, { schema });
});
