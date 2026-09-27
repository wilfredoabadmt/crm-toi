# Tareas: Configuración Dinámica de Modelo LLM y Token de API para el Agente

## Fase 1: Esquema de Base de Datos y Cifrado
- [x] 1.1 Agregar columnas `llmBaseUrl`, `llmModel`, `llmTokenCipher`, `llmTokenIv`, `llmTokenTag` a la tabla `agentProfile` en `src/lib/db/schema.ts`.
- [x] 1.2 Crear migración idempotente `drizzle/0011_agent_llm_config.sql` y registrar en `drizzle/meta/_journal.json`.

## Fase 2: Lógica Backend, Cifrado y Sincronización de .env
- [x] 2.1 Crear `src/server/ai/env-sync.ts` con la función `syncEnvFile` para actualizar o reemplazar de forma segura `OPENROUTER_API_TOKEN`, `OPENROUTER_MODEL` y `OPENROUTER_BASE_URL` en el archivo `.env` en disco.
- [x] 2.2 Crear `src/server/ai/credentials.ts` con funciones `getLlmCredentials` y `saveLlmCredentials` con cifrado AES-256-GCM y actualización de memoria.
- [x] 2.3 Crear endpoint `src/app/api/agent/llm-test/route.ts` para verificar la conectividad del modelo y token en tiempo real.
- [x] 2.4 Actualizar `src/app/api/agent/profile/route.ts` (GET y PUT) para devolver `llmConfig` (con `tokenLast4`) y permitir guardar los nuevos campos con permisos de `owner`.
- [x] 2.5 Adaptar `src/lib/ai/index.ts` para que `callProvider` resuelva dinámicamente las credenciales activas del perfil.

## Fase 3: Interfaz de Usuario (UI) en el Panel del Agente
- [x] 3.1 Crear componente `LlmConfigCard` en `src/components/agent/llm-config-card.tsx` con campos para Base URL, Modelo (con botones de modelos sugeridos: GPT-4o mini, DeepSeek, Claude 3.5, Llama 3.3) y API Key.
- [x] 3.2 Añadir botón interactivo **"Probar conexión"** con badge de estado (éxito con latencia / error descriptivo).
- [x] 3.3 Integrar `LlmConfigCard` en `src/components/agent/agent-client.tsx` en la parte superior del panel del Agente.

## Fase 4: Verificación, Build y Despliegue
- [x] 4.1 Validar tipado y compilación local con `npm run build`.
- [x] 4.2 Commit del hito y push a GitHub (`master`).
- [x] 4.3 Despliegue en Coolify (`panel.sys.toi.bo`) y comprobación de salud en producción.
