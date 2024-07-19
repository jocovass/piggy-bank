import { conflictUpdateSetAllColumns } from '~/app/utils/db';
import { db } from '~/db/index.server';
import { accounts, type InsertAccount } from '~/db/schema';

export async function createAccounts(plaidAccounts: InsertAccount[]) {
	const newAccounts = await db
		.insert(accounts)
		.values(plaidAccounts)
		.onConflictDoUpdate({
			target: accounts.plaid_account_id,
			set: conflictUpdateSetAllColumns(accounts, ['name', 'current_balance']),
		})
		.returning();

	return newAccounts;
}
