import { integer, pgTable, text } from 'drizzle-orm/pg-core';

export const count = pgTable('count', {
	id: integer('id').primaryKey(),
	count: integer('count').default(0),
	name: text('name'),
	age: integer('age'),
});
