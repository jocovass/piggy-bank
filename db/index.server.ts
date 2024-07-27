import { remember } from '@epic-web/remember';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { type Logger } from 'drizzle-orm/logger';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

class MyLogger implements Logger {
	logQuery(query: string, params: unknown[]): void {
		// console.log('💥 ', { params });
		console.log(params);
		console.log(query);
	}
}

export const db = remember('drizzle', () => {
	neonConfig.webSocketConstructor = ws;
	const pool = new Pool({ connectionString: process.env.DB_URL });
	return drizzle(pool, { schema, logger: new MyLogger() });
});

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
