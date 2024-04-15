import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const db = drizzle(neon(process.env.DB_URL!));

async function main() {
	try {
		await migrate(db, { migrationsFolder: './db/drizzle' });
		console.log('✅ Migration completed');
	} catch (e) {
		console.error('Error during migraton: ', e);
		process.exit(1);
	}
}

main();
