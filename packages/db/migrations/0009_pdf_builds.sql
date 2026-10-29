CREATE TABLE "pdf_build" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"compilation_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"scope" text,
	"status" text NOT NULL,
	"pages" integer,
	"spine" real,
	"error" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pdf_build" ADD CONSTRAINT "pdf_build_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_build" ADD CONSTRAINT "pdf_build_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pdf_build_compilation_idx" ON "pdf_build" USING btree ("compilation_id","requested_at");--> statement-breakpoint
CREATE INDEX "pdf_build_requested_by_idx" ON "pdf_build" USING btree ("requested_by","requested_at");