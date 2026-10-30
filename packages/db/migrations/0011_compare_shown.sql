CREATE TABLE "compare_shown" (
	"user_id" uuid NOT NULL,
	"compilation_id" uuid NOT NULL,
	"verse" text NOT NULL,
	"translation_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compare_shown_user_id_compilation_id_verse_pk" PRIMARY KEY("user_id","compilation_id","verse")
);
--> statement-breakpoint
ALTER TABLE "compare_shown" ADD CONSTRAINT "compare_shown_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compare_shown" ADD CONSTRAINT "compare_shown_compilation_id_compilation_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compare_shown" ADD CONSTRAINT "compare_shown_translation_id_translation_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translation"("id") ON DELETE cascade ON UPDATE no action;