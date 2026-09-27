# Plan Técnico: Configuración Dinámica de Modelo LLM y Token de API para el Agente (Multi-Proveedor Universal)

## 1. Stack y Arquitectura

- **Framework**: Next.js 15 App Router (standalone) + React 19 + TypeScript.
- **Base de Datos**: PostgreSQL + Drizzle ORM.
- **Criptografía**: Cifrado simétrico AES-256-GCM (`src/lib/crypto.ts`) para proteger el token del LLM en reposo.
- **Adaptador LLM Universal**: `src/lib/ai/index.ts` adaptado para aceptar credenciales en tiempo de ejecución (`baseUrl`, `model`, `token`) y soportar automáticamente tanto el protocolo **OpenAI Chat Completions** (usado por OpenAI, DeepSeek, Groq, xAI, OpenRouter, Mistral, Ollama) como el protocolo **Anthropic Messages** (usado por Anthropic Claude oficial con cabecera `x-api-key`).
- **Seguridad**:
  - Multi-tenant por `organizationId`.
  - Roles: Solo usuarios con rol `owner` pueden ver el estado del LLM y modificar las credenciales.
  - El token completo **nunca** viaja en respuestas GET al cliente; se expone únicamente `tokenLast4`.
  - Prueba de salud previa: no se permite guardar un token o modelo que falle la prueba de conexión básica.

---

## 2. Decisiones de Diseño y Esquema de Datos

### A. Modificación del Esquema (`src/lib/db/schema.ts`)
Añadido a la tabla `agent_profile`:
- `llmBaseUrl`: `text("llm_base_url")` — URL base del proveedor (ej: `https://api.openai.com`, `https://api.anthropic.com`, `https://api.deepseek.com`, `https://api.groq.com/openai`, `https://openrouter.ai/api`).
- `llmModel`: `text("llm_model")` — Identificador del modelo (ej: `gpt-4o-mini`, `claude-3-5-sonnet-20241022`, `deepseek-chat`).
- `llmTokenCipher`, `llmTokenIv`, `llmTokenTag`: Token cifrado con AES-256-GCM.

### B. Adaptador Universal en `src/lib/ai/index.ts` y Endpoint de Test `src/app/api/agent/llm-test/route.ts`
1. **Detección de Protocolo**:
   - Si `baseUrl` incluye `anthropic.com` o el token empieza con `sk-ant-`:
     - Endpoint: `${cleanBaseUrl}/v1/messages` (o ajustado si ya incluye `/v1`).
     - Headers:
       - `x-api-key: <token>`
       - `anthropic-version: 2023-06-01`
       - `Content-Type: application/json`
     - Body:
       - Extrae mensaje de sistema a `system: "..."`.
       - Formatea los mensajes de usuario/asistente en `messages: [...]`.
       - Asigna `max_tokens: 4096` (o 50 para el test).
     - Respuesta: Extrae contenido de `json.content[0].text`.
   - Si es protocolo compatible con OpenAI (OpenAI, DeepSeek, Groq, xAI, OpenRouter, Custom):
     - Normalización de URL: si `cleanBaseUrl` termina en `/v1`, se concatena `/chat/completions`; de lo contrario `${cleanBaseUrl}/v1/chat/completions`.
     - Headers: `Authorization: Bearer <token>`.
     - Respuesta: Extrae `json.choices[0].message.content`.

### C. Módulo de Resolución de Credenciales (`src/server/ai/credentials.ts`)
1. `getLlmCredentials(organizationId)`:
   - Consulta `agent_profile`. Si tiene token cifrado, lo descifra con `decryptSecret`.
   - Si no tiene token configurado en BD, utiliza los valores por defecto del entorno (`getEnv().OPENROUTER_API_TOKEN`, etc.).
   - Retorna: `{ baseUrl, model, token, isCustom }`.
2. `saveLlmCredentials(organizationId, { baseUrl, model, token })`:
   - Cifra el token con `encryptSecret`.
   - Actualiza `agent_profile` en PostgreSQL.
   - Actualiza `process.env.OPENROUTER_API_TOKEN`, `process.env.OPENROUTER_MODEL`, `process.env.OPENROUTER_BASE_URL` en memoria.
   - Sincroniza `.env` físico.

### D. Interfaz de Selección Rápida Multi-Proveedor (`src/components/agent/llm-config-card.tsx`)
- Selector de proveedores mediante botones / tabs con iconos y marcas:
  - **OpenAI**: `https://api.openai.com/v1` (`gpt-4o-mini`, `gpt-4o`, `o1-mini`)
  - **Anthropic Claude**: `https://api.anthropic.com/v1` (`claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`)
  - **DeepSeek**: `https://api.deepseek.com` (`deepseek-chat`, `deepseek-reasoner`)
  - **Groq**: `https://api.groq.com/openai/v1` (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`)
  - **OpenRouter**: `https://openrouter.ai/api` (todos los modelos de pasarela)
  - **Personalizado**: entrada abierta de URL Base y Modelo para cualquier proveedor compatible (Z.AI, xAI, Ollama, etc.).

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
