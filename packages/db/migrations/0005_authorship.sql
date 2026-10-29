CREATE TABLE "authorship_declaration" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"compilation_id" uuid NOT NULL,
	"entered" text NOT NULL,
	"author_id" uuid NOT NULL,
	"statement_version" integer NOT NULL,
	"text_hash" text NOT NULL,
	"journal_id" uuid,
	"chain_head" text,
	"declared_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorship_journal" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"compilation_id" uuid NOT NULL,
	"entered" text NOT NULL,
	"author_id" uuid NOT NULL,
	"start_text" text NOT NULL,
	"text" text NOT NULL,
	"head_hash" text NOT NULL,
	"events" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "composition_event" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"journal_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"elapsed" integer,
	"kind" text NOT NULL,
	"position" integer NOT NULL,
	"removed" text NOT NULL,
	"inserted" text NOT NULL,
	"paste_origin" text,
	"paste_translation_id" uuid,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL,
	CONSTRAINT "composition_event_journal_id_seq_unique" UNIQUE("journal_id","seq")
);
--> statement-breakpoint
CREATE TABLE "similarity_report" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"compilation_id" uuid NOT NULL,
	"entered" text NOT NULL,
	"translation_id" uuid NOT NULL,
	"text_hash" text NOT NULL,
	"score" integer NOT NULL,
	"matched" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "similarity_report_compilation_id_entered_translation_id_unique" UNIQUE("compilation_id","entered","translation_id")
);
--> statement-breakpoint
CREATE TABLE "study_trail" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"journal_id" uuid NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"resource" text NOT NULL,
	"translation_id" uuid
);
--> statement-breakpoint
ALTER TABLE "authorship_declaration" ADD CONSTRAINT "authorship_declaration_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorship_declaration" ADD CONSTRAINT "authorship_declaration_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorship_declaration" ADD CONSTRAINT "authorship_declaration_journal_id_authorship_journal_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."authorship_journal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorship_journal" ADD CONSTRAINT "authorship_journal_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorship_journal" ADD CONSTRAINT "authorship_journal_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composition_event" ADD CONSTRAINT "composition_event_journal_id_authorship_journal_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."authorship_journal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composition_event" ADD CONSTRAINT "composition_event_paste_translation_id_translation_id_fk" FOREIGN KEY ("paste_translation_id") REFERENCES "public"."translation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "similarity_report" ADD CONSTRAINT "similarity_report_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "similarity_report" ADD CONSTRAINT "similarity_report_translation_id_translation_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_trail" ADD CONSTRAINT "study_trail_journal_id_authorship_journal_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."authorship_journal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_trail" ADD CONSTRAINT "study_trail_translation_id_translation_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authorship_declaration_verse_idx" ON "authorship_declaration" USING btree ("compilation_id","entered");--> statement-breakpoint
CREATE INDEX "authorship_journal_verse_idx" ON "authorship_journal" USING btree ("compilation_id","entered");--> statement-breakpoint
CREATE INDEX "study_trail_journal_idx" ON "study_trail" USING btree ("journal_id");--> statement-breakpoint
ALTER TABLE "compilation_verse" ADD CONSTRAINT "compilation_verse_own" CHECK ("compilation_verse"."origin" NOT IN ('own', 'pasted') OR ("compilation_verse"."content" IS NOT NULL AND "compilation_verse"."source_translation_id" IS NULL));