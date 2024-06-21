import 'dotenv/config';
import { type Config } from 'drizzle-kit';

export default {
	schema: './db/schema.ts',
	out: './db/drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DB_URL,
	},
} satisfies Config;
