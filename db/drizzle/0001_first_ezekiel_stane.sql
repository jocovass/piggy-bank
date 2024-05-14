CREATE TABLE IF NOT EXISTS "verifications" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"target" text NOT NULL,
	"secret" text NOT NULL,
	"algorithm" text NOT NULL,
	"digits" integer NOT NULL,
	"period" integer NOT NULL,
	"charSet" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	CONSTRAINT "unique_target_type" UNIQUE("target","type")
);
