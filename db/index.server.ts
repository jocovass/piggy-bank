import { remember } from '@epic-web/remember';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

export const db = remember('drizzle', () => {
	return drizzle(neon(process.env.DB_URL!));
});
