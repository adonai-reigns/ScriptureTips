CREATE TABLE "publication" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"compilation_id" uuid,
	"owner_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"abbreviation" text NOT NULL,
	"visibility" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"base_translation_id" uuid NOT NULL,
	"scheme" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "publication_owner_id_slug_unique" UNIQUE("owner_id","slug")
);
--> statement-breakpoint
CREATE TABLE "publication_chapter" (
	"version_id" uuid NOT NULL,
	"book" text NOT NULL,
	"chapter" integer NOT NULL,
	"position" integer NOT NULL,
	"verses" jsonb NOT NULL,
	"hash" text NOT NULL,
	CONSTRAINT "publication_chapter_version_id_book_chapter_pk" PRIMARY KEY("version_id","book","chapter")
);
--> statement-breakpoint
CREATE TABLE "publication_version" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"publication_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"status" text NOT NULL,
	"meta" jsonb NOT NULL,
	"change_note" text,
	"change_summary" jsonb,
	"verse_count" integer NOT NULL,
	"content_hash" text NOT NULL,
	"previous_hash" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_version_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "publication_version_publication_id_number_unique" UNIQUE("publication_id","number")
);
--> statement-breakpoint
ALTER TABLE "publication" ADD CONSTRAINT "publication_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication" ADD CONSTRAINT "publication_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication" ADD CONSTRAINT "publication_base_translation_id_translation_id_fk" FOREIGN KEY ("base_translation_id") REFERENCES "public"."translation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_chapter" ADD CONSTRAINT "publication_chapter_version_id_publication_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."publication_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_version" ADD CONSTRAINT "publication_version_publication_id_publication_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publication"("id") ON DELETE no action ON UPDATE no action;