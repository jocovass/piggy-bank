ALTER TABLE "accounts" ADD CONSTRAINT "accounts_plaid_account_id_unique" UNIQUE("plaid_account_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plaid_transaction_id_unique" UNIQUE("plaid_transaction_id");