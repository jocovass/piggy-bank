import { UTCDate } from '@date-fns/utc';
import { createId as cuid } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	varchar,
} from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { type z } from 'zod';

export const users = pgTable('users', {
	id: varchar('id', { length: 25 })
		.primaryKey()
		.notNull()
		.$defaultFn(() => cuid()),
	email: text('email').notNull().unique(),
	firstName: text('firstName').notNull(),
	lastName: text('lastName').notNull(),
	createdAt: timestamp('createdAt', { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdateFn(() => new UTCDate()),
});

export const userRelations = relations(users, ({ one, many }) => ({
	password: one(passwords, {
		fields: [users.id],
		references: [passwords.userId],
	}),
	sessions: many(sessions, {
		relationName: 'user_sessions',
	}),
	connections: many(connections, {
		relationName: 'user_connections',
	}),
}));

export const passwords = pgTable(
	'passwords',
	{
		hash: text('hash').notNull(),
		userId: varchar('userId', { length: 25 })
			.references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' })
			.notNull(),
		createdAt: timestamp('createdAt', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updatedAt', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdateFn(() => new UTCDate()),
	},
	table => {
		return {
			index_passwords_userId: index('index_passwords_userId').on(table.userId),
		};
	},
);

export const sessions = pgTable(
	'sessions',
	{
		id: varchar('id', { length: 25 })
			.primaryKey()
			.notNull()
			.$defaultFn(() => cuid()),
		expirationDate: timestamp('expirationDate', {
			withTimezone: true,
		}).notNull(),
		userId: varchar('userId', { length: 25 })
			.references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' })
			.notNull(),
		createdAt: timestamp('createdAt', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updatedAt', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdateFn(() => new UTCDate()),
	},
	table => {
		return {
			index_sessions_userId: index('index_sessions_userId').on(table.userId),
		};
	},
);

export const sessionRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
		relationName: 'user_sessions',
	}),
}));

export const connections = pgTable(
	'connections',
	{
		id: varchar('id', { length: 25 })
			.primaryKey()
			.notNull()
			.$defaultFn(() => cuid()),
		providerId: text('providerId').notNull(),
		providerName: text('providerName').notNull(),
		userId: varchar('userId', { length: 25 })
			.notNull()
			.references(() => users.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		createdAt: timestamp('createdAt', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updatedAt', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdateFn(() => new UTCDate()),
	},
	table => {
		return {
			unique_providerName_providerId: unique(
				'unique_providerName_providerId',
			).on(table.providerId, table.providerName),
		};
	},
);

export const connetionRelations = relations(connections, ({ one }) => ({
	user: one(users, {
		fields: [connections.userId],
		references: [users.id],
		relationName: 'user_connections',
	}),
}));

export const verifications = pgTable(
	'verifications',
	{
		id: varchar('id', { length: 25 })
			.primaryKey()
			.notNull()
			.$defaultFn(() => cuid()),
		createdAt: timestamp('createdAt', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updatedAt', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdateFn(() => new UTCDate()),
		/**
		 * The type of verification, e.g. "email", "phone" or "onboarding"
		 */
		type: text('type').notNull(),
		/**
		 * The thing we're trying to verify, e.g. a user's email or phone number
		 */
		target: text('target').notNull(),
		/**
		 * The secret key used to generate the otp
		 */
		secret: text('secret').notNull(),
		/**
		 * The algorithm used to generate the otp
		 */
		algorithm: text('algorithm').notNull(),
		/**
		 * The number of digits in the otp
		 */
		digits: integer('digits').notNull(),
		/**
		 * The number of seconds the otp is valid for
		 */
		period: integer('period').notNull(),
		/**
		 * The valid characters for the otp
		 */
		charSet: text('charSet').notNull(),
		/**
		 * When it's safe to delete this verification
		 */
		expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
	},
	table => {
		return {
			unique_target_type: unique('unique_target_type').on(
				table.target,
				table.type,
			),
		};
	},
);

export const selectUserSchema = createSelectSchema(users);
export const selectPasswordSchema = createSelectSchema(passwords);
export type User = z.infer<typeof selectUserSchema>;
export type Password = z.infer<typeof selectPasswordSchema>;
