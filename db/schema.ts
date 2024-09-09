import { UTCDate } from '@date-fns/utc';
import { createId as cuid } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import {
	boolean,
	decimal,
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
import { type DateToDateString } from '~/app/utils/type-helpers';

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
	bankConnections: many(bankConnections, {
		relationName: 'user_bank_connections',
	}),
	accounts: many(accounts, {
		relationName: 'user_accounts',
	}),
	transactions: many(transactions, {
		relationName: 'user_transactions',
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
		plaid_institution_id: text('plaid_institution_id').notNull(),
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
		plaid_item_id: text('item_id').notNull(),
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

export const bankConnectionRelations = relations(
	bankConnections,
	({ one, many }) => ({
		user: one(users, {
			fields: [bankConnections.user_id],
			references: [users.id],
		}),
		accounts: many(accounts, {
			relationName: 'bank_connection_accounts',
		}),
	}),
);

export const accounts = pgTable(
	'accounts',
	{
		id: varchar('id', { length: 25 })
			.primaryKey()
			.notNull()
			.$defaultFn(() => cuid()),
		bank_connection_id: varchar('bank_connection_id', { length: 25 })
			.notNull()
			.references(() => bankConnections.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		user_id: varchar('user_id', { length: 25 })
			.notNull()
			.references(() => users.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		/**
		 * Plaid unique identifier for the account.
		 */
		plaid_account_id: text('plaid_account_id').notNull().unique(),
		/**
		 * The name of the account.
		 */
		name: text('name').notNull(),
		/**
		 *	The official name given byt the financial institution.
		 */
		official_name: text('official_name'),
		/**
		 * The last 2-4 alphanumeric characters of an account's official account number.
		 */
		mask: text('mask'),
		/**
		 * The total amount of funds in or owed by the account.
		 *
		 * For credit type accounts, a positive balance idicates the amount owed, a
		 * negative amount indicates the lender owing the accound holder.
		 */
		current_balance: decimal('current_balance', { precision: 20, scale: 2 }),
		/**
		 * The amount of funds available to be withdrawn from the account.
		 */
		available_balance: decimal('available_balance', {
			precision: 20,
			scale: 2,
		}),
		/**
		 * The ISO 4217 currency code of the balance.
		 */
		iso_currency_code: text('iso_currency_code'),
		unofficial_currency_code: text('unofficial_currency_code'),
		type: text('type').notNull(),
		subtype: text('subtype'),
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
			index_bank_connection_id: index('index_bank_connections_id').on(
				table.bank_connection_id,
			),
		};
	},
);

export const accountRelations = relations(accounts, ({ one, many }) => ({
	bankConnection: one(bankConnections, {
		fields: [accounts.bank_connection_id],
		references: [bankConnections.id],
		relationName: 'bank_connection_accounts',
	}),
	user: one(users, {
		fields: [accounts.user_id],
		references: [users.id],
	}),
	transactions: many(transactions, {
		relationName: 'account_transactions',
	}),
}));

export const transactions = pgTable(
	'transactions',
	{
		id: varchar('id', { length: 25 })
			.primaryKey()
			.notNull()
			.$defaultFn(() => cuid()),
		account_id: varchar('account_id', { length: 25 })
			.notNull()
			.references(() => accounts.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		user_id: varchar('user_id', { length: 25 })
			.notNull()
			.references(() => users.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		/**
		 * The settled value of the transaction.
		 *
		 * In plaid positive values inidicate money moving out of the acccount and
		 * nagative values indicate money moving into the account. This is true
		 * for both credit and debit accounts.
		 */
		amount: decimal('amount', { precision: 20, scale: 2 }).notNull(),
		/**
		 * The ISO 4217 currency code of the transaction.
		 */
		iso_currency_code: text('iso_currency_code'),
		/**
		 * The unofficial currency code of the transaction.
		 */
		unofficial_currency_code: text('unofficial_currency_code'),
		/**
		 * The merchant name.
		 * This field correponds to the "mercahnt_name" field in plaid but if that field
		 * is not peresnt we use the "name" field isntead.
		 */
		name: text('name').notNull(),
		/**
		 * Pending transactions details may change before they are settled.
		 */
		pending: boolean('pending').notNull(),
		/**
		 * Unique id for the transaction.
		 */
		plaid_transaction_id: text('plaid_transaction_id').notNull().unique(),
		/**
		 * The URL of a logo associated with this transaction.
		 */
		logo_url: text('logo_url'),
		/**
		 * Date and tiem when the transaction was authorized.
		 */
		authorized_date: timestamp('authorized_date', { withTimezone: true }),
		/**
		 * The channel used to make a payment. i.e. "online" | "in store"
		 */
		payment_channel: text('payment_channel').notNull(),
		/**
		 * A high level category that communicates the broad category of the transaction.
		 */
		category: text('category'),
		/**
		 * A granular category conveying the transaction's intent. This field can also
		 * be used as a unique identifier for the category
		 */
		subcategory: text('subcategory'),
		/**
		 * A flag that indicates whether a transaction is active or not.
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
			index_transactions_account_id: index('index_transactions_account_id').on(
				table.account_id,
			),
			index_transactions_user_id: index('index_transactions_user_id').on(
				table.user_id,
			),
		};
	},
);

export const transactionRelations = relations(transactions, ({ one }) => ({
	account: one(accounts, {
		fields: [transactions.account_id],
		references: [accounts.id],
	}),
	user: one(users, {
		fields: [transactions.user_id],
		references: [users.id],
	}),
}));

/**
 * User types
 */
export const selectUserSchema = createSelectSchema(users);
export const insertUserChema = createInsertSchema(users);
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserChema>;

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

/**
 * Bank Connection types
 */
export const selectBankConnectionSchema = createSelectSchema(bankConnections);
export type BankConnection = DateToDateString<
	z.infer<typeof selectBankConnectionSchema>
>;
export const insertBankConnectionSchema = createInsertSchema(bankConnections);
export type InsertBankConnection = z.infer<typeof insertBankConnectionSchema>;

/**
 * Accounts types
 */
export const selectAccountSchema = createSelectSchema(accounts);
export type Account = DateToDateString<z.infer<typeof selectAccountSchema>>;
export const insertAccountSchema = createInsertSchema(accounts);
export type InsertAccount = z.infer<typeof insertAccountSchema>;

/**
 * Transactions types
 */
export const selectTransactionSchema = createSelectSchema(transactions);
export type Transaction = DateToDateString<
	z.infer<typeof selectTransactionSchema>
>;
export const insertTransactionSchema = createInsertSchema(transactions);
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
