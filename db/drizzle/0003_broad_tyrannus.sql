CREATE TABLE IF NOT EXISTS "accounts" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"bank_connection_id" varchar(25) NOT NULL,
	"user_id" varchar(25) NOT NULL,
	"plaid_account_id" text NOT NULL,
	"name" text NOT NULL,
	"official_name" text,
	"mask" text,
	"current_balance" numeric(20, 2),
	"available_balance" numeric(20, 2),
	"iso_currency_code" text,
	"unofficial_currency_code" text,
	"type" text NOT NULL,
	"subtype" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_connections" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"user_id" varchar(25) NOT NULL,
	"plaid_institution_id" text NOT NULL,
	"name" text NOT NULL,
	"primary_color" text,
	"logo" text,
	"item_id" text NOT NULL,
	"access_token" text NOT NULL,
	"consent_expiration_time" timestamp with time zone,
	"transaction_cursor" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"account_id" varchar(25) NOT NULL,
	"user_id" varchar(25) NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"iso_currency_code" text,
	"unofficial_currency_code" text,
	"name" text NOT NULL,
	"pending" boolean NOT NULL,
	"plaid_transaction_id" text NOT NULL,
	"logo_url" text,
	"authorized_date" timestamp with time zone,
	"payment_channel" text NOT NULL,
	"category" text,
	"subcategory" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_bank_connection_id_bank_connections_id_fk" FOREIGN KEY ("bank_connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "index_bank_connections_id" ON "accounts" USING btree ("bank_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "index_bank_connections_userId" ON "bank_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "index_transactions_account_id" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "index_transactions_user_id" ON "transactions" USING btree ("user_id");