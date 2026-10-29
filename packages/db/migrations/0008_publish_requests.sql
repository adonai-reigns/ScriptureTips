CREATE TABLE "publish_request" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"compilation_id" uuid,
	"publication_id" uuid,
	"version_id" uuid,
	"requested_by" uuid NOT NULL,
	"visibility" text NOT NULL,
	"consent_statement" integer NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"problems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "publish_request" ADD CONSTRAINT "publish_request_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_request" ADD CONSTRAINT "publish_request_publication_id_publication_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publication"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_request" ADD CONSTRAINT "publish_request_version_id_publication_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."publication_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_request" ADD CONSTRAINT "publish_request_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "publish_request_compilation_idx" ON "publish_request" USING btree ("compilation_id","created_at");