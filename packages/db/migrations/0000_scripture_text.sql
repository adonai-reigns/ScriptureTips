CREATE TABLE "translation" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"catalog_id" text NOT NULL,
	"abbreviation" text NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"direction" text NOT NULL,
	"scheme" text NOT NULL,
	"license_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_catalog_id_unique" UNIQUE("catalog_id")
);
--> statement-breakpoint
CREATE TABLE "translation_book" (
	"translation_id" uuid NOT NULL,
	"book" text NOT NULL,
	"usfm" text NOT NULL,
	"position" integer NOT NULL,
	"names" jsonb NOT NULL,
	CONSTRAINT "translation_book_translation_id_book_pk" PRIMARY KEY("translation_id","book")
);
--> statement-breakpoint
CREATE TABLE "translation_import" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"translation_id" uuid NOT NULL,
	"source" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"report" jsonb NOT NULL,
	"verse_count" integer NOT NULL,
	"note_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translator_note" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"verse_text_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"marker" text NOT NULL,
	"caller" text NOT NULL,
	"category" text,
	"span" text,
	"body" jsonb NOT NULL,
	CONSTRAINT "translator_note_verse_text_id_position_unique" UNIQUE("verse_text_id","position")
);
--> statement-breakpoint
CREATE TABLE "verse_text" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"translation_id" uuid NOT NULL,
	"book" text NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"to_verse" integer,
	"published" text,
	"canonical" text[] NOT NULL,
	"mapping" text NOT NULL,
	"canonical_range" "int4range",
	"headings" jsonb NOT NULL,
	"content" jsonb NOT NULL,
	CONSTRAINT "verse_text_translation_id_book_chapter_verse_unique" UNIQUE("translation_id","book","chapter","verse"),
	CONSTRAINT "verse_bridge" CHECK ("verse_text"."to_verse" IS NULL OR "verse_text"."to_verse" > "verse_text"."verse")
);
--> statement-breakpoint
ALTER TABLE "translation_book" ADD CONSTRAINT "translation_book_translation_id_translation_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_import" ADD CONSTRAINT "translation_import_translation_id_translation_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translator_note" ADD CONSTRAINT "translator_note_verse_text_id_verse_text_id_fk" FOREIGN KEY ("verse_text_id") REFERENCES "public"."verse_text"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_text" ADD CONSTRAINT "verse_text_translation_id_translation_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verse_text_canonical_range_index" ON "verse_text" USING gist ("canonical_range");