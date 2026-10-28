CREATE TABLE "compilation" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"abbreviation" text NOT NULL,
	"base_translation_id" uuid NOT NULL,
	"scheme" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compilation_owner_id_slug_unique" UNIQUE("owner_id","slug")
);
--> statement-breakpoint
CREATE TABLE "compilation_rule" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"compilation_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"scope" "int4range" NOT NULL,
	"entered" text NOT NULL,
	"source_translation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compilation" ADD CONSTRAINT "compilation_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation" ADD CONSTRAINT "compilation_base_translation_id_translation_id_fk" FOREIGN KEY ("base_translation_id") REFERENCES "public"."translation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_rule" ADD CONSTRAINT "compilation_rule_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_rule" ADD CONSTRAINT "compilation_rule_source_translation_id_translation_id_fk" FOREIGN KEY ("source_translation_id") REFERENCES "public"."translation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compilation_rule_compilation_idx" ON "compilation_rule" USING btree ("compilation_id");