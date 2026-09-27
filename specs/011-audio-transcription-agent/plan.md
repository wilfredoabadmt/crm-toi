# Plan Técnico: Comprensión y Transcripción Automática de Notas de Voz / Audios para el Agente

## 1. Arquitectura y Componentes

- **Módulo de Transcripción (`src/server/ai/transcription.ts`)**:
  - Función `transcribeAudio(audioBuffer: Buffer, filename: string, orgId: string): Promise<string | null>`.
  - Resuelve las credenciales de la organización mediante `getLlmCredentials(orgId)`.
  - Si el proveedor es OpenAI o Groq, usa su clave directamente. Si es otro (Claude/DeepSeek), busca credenciales de soporte (`OPENAI_API_TOKEN` o `GROQ_API_TOKEN`).
  - Utiliza `FormData` estándar de Node para enviar el binario en multipart a `/v1/audio/transcriptions`.
  - Manejo de excepciones: no lanza errores fatales; si la transcripción falla (ruido, silencio, timeout), retorna `null`.
- **Descarga de Audio desde Meta (`src/server/whatsapp/media.ts`)**:
  - Función `fetchMetaAudioBuffer(mediaId: string, token: string): Promise<Buffer | null>`.
  - Descarga el audio OGG/Opus de WhatsApp usando el Bearer token de la organización.
- **Punto de Ingesta (`src/server/inbox/ingest.ts`)**:
  - Al procesar `msg.type === "audio"`:
    - Descarga el audio en memoria.
    - Llama a `transcribeAudio`.
    - Si obtiene texto: `messageText = \`[AUDIO:\${msg.audio.id}] 🎙️ "\${transcript}"\``.
    - Si no obtiene texto: `messageText = \`[AUDIO:\${msg.audio.id}]\``.
- **Cerebro del Agente (`src/server/ai/pipeline.ts`)**:
  - Actualizar regex de transformación de historial:
    `\[AUDIO:[^\]]+\]\s*(?:🎙️\s*"(.*?)")?` -> si tiene transcripción: `"[Nota de voz del cliente]: $1"`, si no: `"[Cliente adjuntó un audio]"`.
- **Frontend Inbox (`src/components/inbox/helpers.ts` y `message-thread.tsx`)**:
  - En `parseMediaMessage`, extraer el audio ID y la transcripción `transcript`.
  - En `message-thread.tsx`, mostrar el reproductor de audio y debajo la burbuja de transcripción con icono de micrófono.
