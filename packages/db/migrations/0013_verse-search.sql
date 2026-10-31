ALTER TABLE "verse_text" ADD COLUMN "plain" text;--> statement-breakpoint
ALTER TABLE "verse_text" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(plain, ''))) STORED;--> statement-breakpoint
CREATE INDEX "verse_text_search_idx" ON "verse_text" USING gin ("search");