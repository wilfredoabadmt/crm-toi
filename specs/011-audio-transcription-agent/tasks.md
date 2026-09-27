# Tareas: Comprensión y Transcripción Automática de Audios para el Agente

## Fase 1: Módulo de Transcripción de Audio (Whisper)
- [x] 1.1 Crear `src/server/ai/transcription.ts` con soporte para Whisper API (OpenAI y Groq) con timeout y tolerancia a fallos.
- [x] 1.2 Añadir función de descarga segura de binario de audio en `src/server/inbox/media-storage.ts`.

## Fase 2: Integración en Ingesta y Pipeline del Agente
- [x] 2.1 Modificar `src/server/inbox/ingest.ts` para transcribir audios entrantes en segundo plano y persistir `[AUDIO:id] 🎙️ "transcripción"`.
- [x] 2.2 Actualizar `src/server/ai/pipeline.ts` para que el agente reciba el texto transcrito en el historial y comprenda lo dicho por el cliente.

## Fase 3: Visualización en el Inbox
- [x] 3.1 Actualizar `src/components/inbox/helpers.ts` para detectar la transcripción en los mensajes de audio.
- [x] 3.2 Modificar `src/components/inbox/message-thread.tsx` para mostrar la transcripción bajo el reproductor de audio.

## Fase 4: Verificación, Build y Despliegue
- [x] 4.1 Validar tipado y compilación con `npm run build`.
- [x] 4.2 Commit y push a GitHub (`master`).
- [ ] 4.3 Despliegue en producción y verificación de salud.
