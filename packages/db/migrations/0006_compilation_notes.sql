CREATE TABLE "compilation_note" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"compilation_verse_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"origin" text NOT NULL,
	"removed" boolean DEFAULT false NOT NULL,
	"source_note" jsonb,
	"body" jsonb,
	"after" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compilation_note_compilation_verse_id_position_unique" UNIQUE("compilation_verse_id","position"),
	CONSTRAINT "compilation_note_origin" CHECK (CASE "compilation_note"."origin"
        WHEN 'original' THEN "compilation_note"."removed" AND "compilation_note"."source_note" IS NOT NULL AND "compilation_note"."body" IS NULL
        WHEN 'modified' THEN NOT "compilation_note"."removed" AND "compilation_note"."source_note" IS NOT NULL AND "compilation_note"."body" IS NOT NULL
        ELSE NOT "compilation_note"."removed" AND "compilation_note"."source_note" IS NULL AND "compilation_note"."body" IS NOT NULL AND "compilation_note"."after" IS NOT NULL AND "compilation_note"."after" >= 0
      END)
);
--> statement-breakpoint
ALTER TABLE "compilation_verse_revision" ADD COLUMN "notes" jsonb;--> statement-breakpoint
ALTER TABLE "compilation_note" ADD CONSTRAINT "compilation_note_compilation_verse_id_compilation_verse_id_fk" FOREIGN KEY ("compilation_verse_id") REFERENCES "public"."compilation_verse"("id") ON DELETE cascade ON UPDATE no action;