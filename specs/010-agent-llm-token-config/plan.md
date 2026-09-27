# Plan Técnico: Configuración Dinámica de Modelo LLM y Token de API para el Agente

## 1. Stack y Arquitectura

- **Framework**: Next.js 15 App Router (standalone) + React 19 + TypeScript.
- **Base de Datos**: PostgreSQL + Drizzle ORM.
- **Criptografía**: Cifrado simétrico AES-256-GCM (`src/lib/crypto.ts`) para proteger el token del LLM en reposo.
- **Adaptador LLM**: `src/lib/ai/index.ts` adaptado para aceptar credenciales en tiempo de ejecución (`baseUrl`, `model`, `token`) resolviéndolas desde el perfil de la organización o haciendo fallback a las variables globales.
- **Seguridad**:
  - Multi-tenant por `organizationId`.
  - Roles: Solo usuarios con rol `owner` pueden ver el estado del LLM y modificar las credenciales.
  - El token completo **nunca** viaja en respuestas GET al cliente; se expone únicamente `tokenLast4`.
  - Prueba de salud previa: no se permite guardar un token o modelo que falle la prueba de conexión básica.

---

## 2. Decisiones de Diseño y Esquema de Datos

### A. Modificación del Esquema (`src/lib/db/schema.ts`)
Añadir a la tabla `agent_profile`:
- `llmBaseUrl`: `text("llm_base_url")` — URL base del proveedor (ej: `https://openrouter.ai/api`).
- `llmModel`: `text("llm_model")` — Identificador del modelo (ej: `openai/gpt-4o-mini`, `deepseek/deepseek-chat`).
- `llmTokenCipher`: `text("llm_token_cipher")` — Token cifrado con AES-256-GCM.
- `llmTokenIv`: `text("llm_token_iv")` — Vector de inicialización del cifrado.
- `llmTokenTag`: `text("llm_token_tag")` — Tag de autenticación del cifrado.

### B. Módulo de Resolución de Credenciales (`src/server/ai/credentials.ts`)
Crear un módulo dedicado para resolver las credenciales activas del LLM:
1. `getLlmCredentials(organizationId)`:
   - Consulta `agent_profile`. Si tiene token cifrado, lo descifra con `decryptSecret`.
   - Si no tiene token configurado en BD, utiliza los valores por defecto del entorno (`getEnv().OPENROUTER_API_TOKEN`, etc.).
   - Retorna: `{ baseUrl, model, token, isCustom }`.
2. `saveLlmCredentials(organizationId, { baseUrl, model, token })`:
   - Cifra el token con `encryptSecret`.
   - Actualiza `agent_profile` en PostgreSQL.
   - Actualiza `process.env.OPENROUTER_API_TOKEN`, `process.env.OPENROUTER_MODEL`, `process.env.OPENROUTER_BASE_URL` en memoria.
   - Llama a `syncEnvFile({ baseUrl, model, token })` para actualizar el archivo `.env` en disco si existe.

### C. Utilidad de Sincronización del `.env` (`src/server/ai/env-sync.ts`)
1. Comprueba si existe el archivo `.env` en la raíz del proyecto (`process.cwd()`).
2. Lee su contenido y reemplaza o añade las variables de forma atómica:
   - `OPENROUTER_API_TOKEN=<token>`
   - `OPENROUTER_MODEL=<model>`
   - `OPENROUTER_BASE_URL=<baseUrl>`
3. Escribe de nuevo el archivo `.env` preservando las demás variables intactas (base de datos, secretos, WhatsApp, etc.).

### D. Endpoint de Prueba y Guardado
1. **`POST /api/agent/llm-test`**:
   - Recibe `{ baseUrl, model, token }`.
   - Realiza una llamada de prueba ultrarrápida a `${baseUrl}/v1/chat/completions` con `max_tokens: 5`.
   - Devuelve `{ ok: true, latencyMs }` o `{ ok: false, error: string }`.
2. **`GET /api/agent/profile`**:
   - Devuelve `llmConfig: { baseUrl, model, configured: boolean, tokenLast4?: string }`.
3. **`PUT /api/agent/profile`**:
   - Permite actualizar los campos de LLM junto con el resto del perfil, disparando la persistencia cifrada y la sincronización del `.env`.

---

## 3. Componentes y Archivos a Modificar / Crear

### Capa Backend
- `src/lib/db/schema.ts`: Agregar columnas LLM a `agentProfile`.
- `drizzle/0011_agent_llm_config.sql`: Migración Drizzle con sentencias `ADD COLUMN IF NOT EXISTS`.
- `drizzle/meta/_journal.json`: Registro de la migración.
- `src/server/ai/credentials.ts`: Lógica de obtención, descifrado y guardado de credenciales LLM.
- `src/server/ai/env-sync.ts`: Sincronizador del archivo `.env` en disco.
- `src/app/api/agent/llm-test/route.ts`: Endpoint de validación en tiempo real.
- `src/app/api/agent/profile/route.ts`: Extensión de schemas GET y PUT.
- `src/lib/ai/index.ts`: Adaptar `chatJson` para recibir o consultar credenciales por organización.

### Capa Frontend
- `src/components/agent/agent-client.tsx`:
  - Agregar componente `LlmConfigCard` en la parte superior del panel del Agente.
  - Selector de proveedor (OpenRouter, Personalizado).
  - Sugerencias rápidas de modelos (OpenAI, DeepSeek, Claude, Llama) y campo de texto libre.
  - Input para la API Key con máscara de contraseña y visualización de últimos 4 dígitos.
  - Botón de **"Probar conexión"** con badge de estado y latencia.
  - Botón de **"Guardar proveedor de IA"**.

---

## 4. Plan de Verificación y Pruebas
1. **Compilación y Tipos**: Validar con `npm run build`.
2. **Prueba Unitaria de Sincronización del `.env`**: Comprobar que modifica las líneas correctas sin borrar otras variables.
3. **Prueba de Cifrado y Descifrado**: Verificar que los tokens no se guarden en texto plano en PostgreSQL.
4. **Prueba en Vivo**: Probar la conexión con una clave válida y verificar que el agente responde en el Inbox con el modelo configurado.
5. **Despliegue**: Commit, push y verificación en Coolify (`crm-atencion.sys.toi.bo`).
