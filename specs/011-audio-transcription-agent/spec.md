# Especificación: Comprensión y Transcripción Automática de Notas de Voz / Audios para el Agente

## 1. Propósito y Valor del Negocio
Permitir que el Agente de Inteligencia Artificial del CRM **comprenda con precisión el contenido de las notas de voz y audios** que los clientes envían por WhatsApp, transcribiendo la voz a texto de forma transparente e inmediata para generar respuestas oportunas, certeras y contextualizadas.

Actualmente, cuando un cliente envía un audio, el agente solo recibe la etiqueta genérica `[Cliente adjuntó un audio]`, desconociendo por completo la pregunta, duda o solicitud del cliente. Con esta mejora, el agente procesa el contenido real de la voz.

---

## 2. Decisiones de Clarificación (Fase Clarify)

1. **Servicio de Transcripción (Speech-to-Text)**:
   - **Whisper API**: Se integra con el estándar Whisper (`/v1/audio/transcriptions`).
   - Si la organización tiene configurado **OpenAI**, se utiliza `https://api.openai.com/v1/audio/transcriptions` con el modelo `whisper-1`.
   - Si la organización tiene configurado **Groq Cloud**, se utiliza `https://api.groq.com/openai/v1/audio/transcriptions` con el modelo `whisper-large-v3` (latencia inferior a 300ms).
   - Como fallback general o cuando el LLM configurado sea solo texto (como DeepSeek o Claude), se recurre a la variable de entorno `OPENAI_API_TOKEN` o `GROQ_API_TOKEN` si existen.
2. **Formato en la Bandeja y Base de Datos**:
   - En base de datos, el mensaje entrante conserva la referencia del audio para el reproductor pero incluye la transcripción:  
     `[AUDIO:id] 🎙️ "Transcripción del mensaje de voz..."`
   - En la interfaz web (`message-thread.tsx`):
     - El operador humano sigue viendo el reproductor `<audio controls />`.
     - Debajo del reproductor se muestra el texto transcrito con un distintivo visual (*"🎙️ Transcripción: ..."*).
3. **Pipeline del Agente (`pipeline.ts`)**:
   - En el historial enviado al LLM:
     `[AUDIO:id] 🎙️ "Hola, quería consultar qué planes de internet tienen"`  
     se transforma en:  
     `[Nota de voz del cliente]: "Hola, quería consultar qué planes de internet tienen"`
   - El agente comprende el 100% de la consulta y responde con la información requerida sin interrupciones.

---

## 3. Historias de Usuario

### Historia 1: Comprensión Automática de Audios por el Agente
**Como** Agente de Inteligencia Artificial del CRM,  
**quiero** recibir el texto transcrito de los audios que los clientes envían por WhatsApp,  
**para** comprender su consulta y proporcionar una respuesta útil e inmediata en lugar de una respuesta genérica.

#### Criterios de Aceptación:
- Cuando entra un mensaje de tipo `audio` en WhatsApp, el sistema descarga el archivo binario desde Meta Graph API.
- Envía el audio al endpoint de transcripción (Whisper).
- Si la transcripción es exitosa, se adjunta al texto del mensaje: `[AUDIO:id] 🎙️ "texto transcrito..."`.
- En `pipeline.ts`, el agente recibe `[Nota de voz del cliente]: "texto transcrito..."`.
- Si la transcripción falla o el audio no contiene voz inteligible, se mantiene de forma segura el fallback `[Cliente adjuntó un audio]` para no romper la ejecución.

### Historia 2: Visualización de la Transcripción en el Inbox para Operadores
**Como** agente u operador humano en la bandeja de entrada (`/inbox`),  
**quiero** ver la transcripción de texto debajo de la nota de voz,  
**para** leer rápidamente lo que el cliente dijo sin tener que escuchar el audio completo en entornos ruidosos.

#### Criterios de Aceptación:
- En el componente `MessageThread`, si un mensaje de audio tiene texto transcrito adjunto, se renderiza el reproductor de audio y a continuación una caja con el texto transcrito.
- La previsualización de la conversación en la lista izquierda de chats muestra `🎙️ <primeras palabras>` en lugar de solo `🎵 Nota de voz`.
