# Plan Técnico: Control Asistido de Campañas de WhatsApp por el Agente Inteligente

## 1. Stack y Arquitectura

- **Framework**: Next.js 15 App Router (standalone) + React 19 + TypeScript.
- **Base de Datos**: PostgreSQL + Drizzle ORM.
- **Inteligencia Artificial**: OpenAI API / DeepSeek (vía `chatJson` tipado con Zod y structured outputs).
- **Proveedor WhatsApp**: Meta Cloud API (Graph API v21.0) con WABA y números por departamento.
- **Seguridad**:
  - Multi-tenant estricto vía `organizationId`.
  - Las credenciales nunca se exponen al cliente ni al prompt del LLM (solo se manejan identificadores `phoneNumberId`, `templateId`, `stageId`).
  - Esquema de roles: `owner` puede programar y autorizar; `member` crea en `pending_approval`.
  - Acción humana explícita (*Human-in-the-loop*): el agente genera la campaña en borrador/pendiente y el usuario confirma con un botón en UI.

---

## 2. Decisiones de Diseño y Esquema de Datos

### A. Extensión del Modelo de Datos (`src/lib/db/schema.ts`)
Para soportar la línea emisora de WhatsApp en campañas:
1. Agregar columna opcional en `campaign`:
   - `phoneNumberId: text("phone_number_id")`
   - `departmentId: text("department_id")`
2. Si `phoneNumberId` es `null`, la campaña se envía por la línea central de la organización (`meta_credentials`). Si tiene un valor, se despacha usando `getCredentialsForLine(organizationId, phoneNumberId)`.

### B. Endpoint de Asistente de Campañas (`/api/campaigns/ai-assistant`)
Nuevo endpoint interactivo con soporte de streaming o `chatJson` estructurado que:
1. Recibe el historial de la conversación del modal asistido.
2. Inyecta el contexto de la organización:
   - Plantillas aprobadas (`template` con `status = 'approved'`).
   - Etapas activas del pipeline (`pipelineStage`).
   - Departamentos con sus números de WhatsApp configurados.
3. El LLM responde con un schema Zod estructurado:
   - `type: "reply"`: Preguntas de aclaración, sugerencias o respuestas informativas.
   - `type: "audience_preview"`: Conteo de audiencia calculado dinámicamente.
   - `type: "campaign_draft"`: Tarjeta con los datos listos para crear/confirmar (nombre, templateId, variableValues, targetType, targetStageIds, scheduledAt, departmentId).
   - `type: "test_send_result"`: Resultado de prueba enviada a un teléfono.

---

## 3. Componentes y Archivos a Modificar / Crear

### Capa Backend
1. **`src/lib/db/schema.ts`**:
   - Agregar `phoneNumberId` y `departmentId` a la tabla `campaign`.
2. **`src/server/campaigns/campaigns.ts`**:
   - Permitir `phoneNumberId` y `departmentId` en `CreateCampaignInput` y `createCampaign`.
3. **`src/server/campaigns/dispatch.ts`**:
   - Usar `getCredentialsForLine` en `executeCampaign` y `sendTestCampaignMessage` respetando el `phoneNumberId` de la campaña.
4. **`src/server/ai/campaign-assistant.ts`**:
   - Definir prompts, schemas Zod de acciones del asistente y orquestación de herramientas internas (cálculo de audiencia, validación de variables).
5. **`src/app/api/campaigns/ai-assistant/route.ts`**:
   - Ruta POST autenticada para procesar los turnos de conversación del modal de campañas.

### Capa Frontend (UI)
1. **`src/components/campaigns/campaigns-client.tsx`**:
   - Añadir botón destacado con icono de IA / Sparkles: **"Crear con Asistente IA"** junto a "Nueva Campaña".
2. **`src/components/campaigns/campaign-ai-modal.tsx`** (Nuevo componente):
   - Diálogo modal con interfaz de chat conversacional moderna y fluida.
   - Burbujas de chat con sugerencias rápidas ("Reactivar clientes de cotizaciones", "Promo de fibra óptica para fin de mes").
   - Tarjeta interactiva de previsualización cuando el agente arma la campaña:
     - Badge de departamento / número emisor.
     - Audiencia estimada con conteo exacto.
     - Plantilla con variables sustituidas.
     - Botón para enviar prueba de WhatsApp a un teléfono.
     - Botón principal de confirmación humana: **"Crear y Programar Campaña"** que registra la campaña y la muestra en la lista.

---

## 4. Plan de Verificación y Pruebas
1. **Compilación y Tipado**: Ejecutar `npm run build` para asegurar coherencia en tipos de Drizzle y Next.js.
2. **Prueba Funcional del Asistente**:
   - Abrir el modal en `/campaigns`.
   - Pedir una campaña en lenguaje natural.
   - Verificar que el asistente calcula la audiencia real y sugiere las variables.
   - Enviar mensaje de prueba al WhatsApp del usuario.
   - Confirmar y verificar que la campaña aparece programada en el listado de campañas.
3. **Despliegue**: Commit, push y verificación en Coolify (`crm-atencion.sys.toi.bo`).
