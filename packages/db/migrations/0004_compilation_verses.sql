CREATE TABLE "compilation_verse" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"compilation_id" uuid NOT NULL,
	"entered" text NOT NULL,
	"scope" "int4range" NOT NULL,
	"origin" text NOT NULL,
	"edit_kind" text,
	"source_translation_id" uuid,
	"source_snapshot" jsonb,
	"source_hash" text,
	"source_import_id" uuid,
	"content" jsonb,
	"change_note" text,
	"word_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compilation_verse_compilation_id_entered_unique" UNIQUE("compilation_id","entered"),
	CONSTRAINT "compilation_verse_edited" CHECK ("compilation_verse"."origin" <> 'edited' OR ("compilation_verse"."edit_kind" IS NOT NULL AND "compilation_verse"."source_translation_id" IS NOT NULL AND "compilation_verse"."source_snapshot" IS NOT NULL AND "compilation_verse"."content" IS NOT NULL)),
	CONSTRAINT "compilation_verse_source" CHECK ("compilation_verse"."origin" <> 'source' OR "compilation_verse"."source_translation_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "compilation_verse_revision" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"compilation_id" uuid NOT NULL,
	"entered" text NOT NULL,
	"author_id" uuid NOT NULL,
	"origin" text,
	"edit_kind" text,
	"source_translation_id" uuid,
	"content" jsonb,
	"change_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compilation_verse" ADD CONSTRAINT "compilation_verse_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_verse" ADD CONSTRAINT "compilation_verse_source_translation_id_translation_id_fk" FOREIGN KEY ("source_translation_id") REFERENCES "public"."translation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_verse" ADD CONSTRAINT "compilation_verse_source_import_id_translation_import_id_fk" FOREIGN KEY ("source_import_id") REFERENCES "public"."translation_import"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_verse_revision" ADD CONSTRAINT "compilation_verse_revision_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_verse_revision" ADD CONSTRAINT "compilation_verse_revision_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_verse_revision" ADD CONSTRAINT "compilation_verse_revision_source_translation_id_translation_id_fk" FOREIGN KEY ("source_translation_id") REFERENCES "public"."translation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compilation_verse_revision_idx" ON "compilation_verse_revision" USING btree ("compilation_id","entered");