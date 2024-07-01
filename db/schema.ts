import { UTCDate } from '@date-fns/utc';
import { createId as cuid } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
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
		expiresAt: timestamp('expiresAt', { withTimezone: true }),
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

export const bankConnections = pgTable(
	'bank_connections',
	{
		id: varchar('id', { length: 25 })
			.primaryKey()
			.notNull()
			.$defaultFn(() => cuid()),
		user_id: varchar('user_id', { length: 25 })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/**
		 * The bank id is a unique and stable identifier assigned by Plaid to
		 * each financial institution they support.
		 */
		institution_id: text('institution_id').notNull(),
		/**
		 * Bank name.
		 */
		name: text('name').notNull(),
		/**
		 * Bank primary color.
		 */
		primary_color: text('primary_color'),
		/**
		 * Logo of the bank.
		 */
		logo: text('logo'),
		/**
		 * An "Item" represents a login at a financial institution. A single item
		 * can be associated with multiple "accounts". To retrieve transaction data
		 * from these accounts you can use the same "access_token".
		 */
		item_id: text('item_id').notNull(),
		/**
		 * Access token issued by plaid after a successful login. This token can be
		 * used to retrieve transaction data from the financial institution.
		 *
		 * This token has an expiration data of 90 days, after we need to ask the
		 * users consent again to access their financial data.
		 *
		 * This regualtion falls under the Second Payment Services Directive (PSD2)
		 * https://www.finance.gov/regulations-policy/second-payment-services-directive-psd-2/
		 */
		access_token: text('access_token').notNull(),
		/**
		 * The RFC3339 timestamp after which the consent provided by the end user
		 * will expire. Will need to request a new access_token.
		 */
		consent_expiration_time: timestamp('consent_expiration_time', {
			withTimezone: true,
		}),
		/**
		 * A cursor is tied to an item, which represents a set of login credentials
		 * and associated accounts for a user at a financial institution.
		 *
		 * When you fetch transactions incrementally, the cursor helps Plaid know
		 * where to start the next fetch to get only new or updated transactions.
		 */
		transaction_cursor: text('transaction_cursor'),
		/**
		 * A flag that indicates whether the bank connection is active or not.
		 */
		is_active: boolean('is_active').notNull().default(true),
		created_at: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updated_at: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdateFn(() => new UTCDate()),
	},
	table => {
		return {
			index_bank_connections_userId: index('index_bank_connections_userId').on(
				table.user_id,
			),
		};
	},
);

/**
 * User types
 */
export const selectUserSchema = createSelectSchema(users);
export const insertUserChema = createInsertSchema(users);
export type User = z.infer<typeof selectUserSchema>;

/**
 * Password types
 */
export const selectPasswordSchema = createSelectSchema(passwords);
export type Password = z.infer<typeof selectPasswordSchema>;

/**
 * Session types
 */
export const selectSessionSchema = createSelectSchema(sessions);
export type Session = z.infer<typeof selectSessionSchema>;
