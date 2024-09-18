CREATE TABLE IF NOT EXISTS "user_images" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"user_id" varchar(25) NOT NULL,
	"blob" "bytea" NOT NULL,
	"file_type" text NOT NULL,
	"size" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_images_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text DEFAULT '';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_images" ADD CONSTRAINT "user_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
