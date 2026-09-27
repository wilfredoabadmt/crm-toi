-- Modulo de Agente IA: soporte de LLM personalizado, modelo y token cifrado
ALTER TABLE "agent_profile" ADD COLUMN IF NOT EXISTS "llm_base_url" text;
--> statement-breakpoint
ALTER TABLE "agent_profile" ADD COLUMN IF NOT EXISTS "llm_model" text;
--> statement-breakpoint
ALTER TABLE "agent_profile" ADD COLUMN IF NOT EXISTS "llm_token_cipher" text;
--> statement-breakpoint
ALTER TABLE "agent_profile" ADD COLUMN IF NOT EXISTS "llm_token_iv" text;
--> statement-breakpoint
ALTER TABLE "agent_profile" ADD COLUMN IF NOT EXISTS "llm_token_tag" text;
