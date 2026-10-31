CREATE TABLE "lemma" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"language" text NOT NULL,
	"strong" text NOT NULL,
	"extended_strong" text,
	"key" text NOT NULL,
	"base_lemma_id" uuid,
	"headword" text,
	"transliteration" text,
	"part_of_speech" text,
	"name_kind" text,
	"proper_name_id" uuid,
	"gloss" text,
	CONSTRAINT "lemma_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "lexicon" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"catalog_id" text NOT NULL,
	"name" text NOT NULL,
	"author" text NOT NULL,
	"year" integer,
	"language" text NOT NULL,
	"license_key" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"report" jsonb NOT NULL,
	CONSTRAINT "lexicon_catalog_id_unique" UNIQUE("catalog_id")
);
--> statement-breakpoint
CREATE TABLE "lexicon_entry" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"lexicon_id" uuid NOT NULL,
	"lemma_id" uuid NOT NULL,
	"entry_ref" text DEFAULT '' NOT NULL,
	"headword" text,
	"body" jsonb NOT NULL,
	CONSTRAINT "lexicon_entry_lexicon_id_lemma_id_entry_ref_unique" UNIQUE("lexicon_id","lemma_id","entry_ref")
);
--> statement-breakpoint
CREATE TABLE "proper_name" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tipnr_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"strongs" text[] NOT NULL,
	"description" text,
	"summary" text,
	"details" jsonb,
	"ai_generated" boolean DEFAULT true NOT NULL,
	CONSTRAINT "proper_name_tipnr_id_unique" UNIQUE("tipnr_id")
);
--> statement-breakpoint
CREATE TABLE "source_text" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"catalog_id" text NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"tradition" text NOT NULL,
	"license_key" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"report" jsonb NOT NULL,
	CONSTRAINT "source_text_catalog_id_unique" UNIQUE("catalog_id")
);
--> statement-breakpoint
CREATE TABLE "token" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"source_text_id" uuid NOT NULL,
	"book" text NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"position" integer NOT NULL,
	"reading" text NOT NULL,
	"surface" text NOT NULL,
	"transliteration" text,
	"lemma_id" uuid,
	"proper_name_id" uuid,
	"affixes" jsonb,
	"morphology" text,
	"gloss" text,
	"editions" text[],
	"canonical" text[] NOT NULL,
	"canonical_range" "int4range",
	CONSTRAINT "token_source_text_id_book_chapter_verse_position_reading_unique" UNIQUE("source_text_id","book","chapter","verse","position","reading")
);
--> statement-breakpoint
CREATE TABLE "translation_alignment" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"verse_text_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"strong" text NOT NULL,
	"lemma_id" uuid,
	"token_id" uuid,
	CONSTRAINT "translation_alignment_verse_text_id_position_strong_unique" UNIQUE("verse_text_id","position","strong")
);
--> statement-breakpoint
ALTER TABLE "lemma" ADD CONSTRAINT "lemma_base_lemma_id_lemma_id_fk" FOREIGN KEY ("base_lemma_id") REFERENCES "public"."lemma"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lemma" ADD CONSTRAINT "lemma_proper_name_id_proper_name_id_fk" FOREIGN KEY ("proper_name_id") REFERENCES "public"."proper_name"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexicon_entry" ADD CONSTRAINT "lexicon_entry_lexicon_id_lexicon_id_fk" FOREIGN KEY ("lexicon_id") REFERENCES "public"."lexicon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexicon_entry" ADD CONSTRAINT "lexicon_entry_lemma_id_lemma_id_fk" FOREIGN KEY ("lemma_id") REFERENCES "public"."lemma"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token" ADD CONSTRAINT "token_source_text_id_source_text_id_fk" FOREIGN KEY ("source_text_id") REFERENCES "public"."source_text"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token" ADD CONSTRAINT "token_lemma_id_lemma_id_fk" FOREIGN KEY ("lemma_id") REFERENCES "public"."lemma"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token" ADD CONSTRAINT "token_proper_name_id_proper_name_id_fk" FOREIGN KEY ("proper_name_id") REFERENCES "public"."proper_name"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_alignment" ADD CONSTRAINT "translation_alignment_verse_text_id_verse_text_id_fk" FOREIGN KEY ("verse_text_id") REFERENCES "public"."verse_text"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_alignment" ADD CONSTRAINT "translation_alignment_lemma_id_lemma_id_fk" FOREIGN KEY ("lemma_id") REFERENCES "public"."lemma"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_alignment" ADD CONSTRAINT "translation_alignment_token_id_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."token"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lemma_strong_idx" ON "lemma" USING btree ("strong");--> statement-breakpoint
CREATE INDEX "lemma_base_idx" ON "lemma" USING btree ("base_lemma_id");--> statement-breakpoint
CREATE INDEX "lexicon_entry_lemma_idx" ON "lexicon_entry" USING btree ("lemma_id");--> statement-breakpoint
CREATE INDEX "token_lemma_idx" ON "token" USING btree ("lemma_id");--> statement-breakpoint
CREATE INDEX "token_canonical_range_index" ON "token" USING gist ("canonical_range");--> statement-breakpoint
CREATE INDEX "translation_alignment_lemma_idx" ON "translation_alignment" USING btree ("lemma_id");--> statement-breakpoint
CREATE INDEX "translation_alignment_token_idx" ON "translation_alignment" USING btree ("token_id");