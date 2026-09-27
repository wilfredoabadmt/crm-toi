# Plan Técnico: Multilínea de WhatsApp por Departamento y Derivación Inteligente

## 1. Stack y Arquitectura

- **Framework**: Next.js 15 App Router (standalone) + React 19 + TypeScript.
- **Base de Datos**: PostgreSQL + Drizzle ORM.
- **Proveedor WhatsApp**: Meta Cloud API (WhatsApp Business Account - WABA) bajo modelo Tech Provider (un WABA token central con múltiples `phoneNumberId`).
- **Seguridad**:
  - Aislamiento multi-tenant por `organizationId`.
  - Secretos y token de Meta cifrados en base de datos (`tokenCipher`, `tokenIv`, `tokenTag`).
  - Variables de entorno declaradas solo por nombre (`DATABASE_URL`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`).
  - Control de acceso por rol (`owner` vs `member` según membresía de departamento).

---

## 2. Decisiones de Diseño y Esquema de Datos

### Modelo de Datos (`src/lib/db/schema.ts`)
1. **Extensión de `conversation`**:
   - Agregar columna `phoneNumberId: text("phone_number_id")` para registrar por qué número de WhatsApp ingresó o se gestiona la conversación.
   - Agregar columna `departmentId: text("department_id")` para asociar la conversación directamente al departamento dueño.
   - Ajustar el índice único de conversación real: `(organizationId, contactId, phoneNumberId)` de modo que un contacto pueda tener un chat activo en Técnico y otro chat activo en Cobranzas.
2. **Estructura departamental (`DepartmentConfig` en `src/lib/departments.ts`)**:
   - Extender la interfaz con:
     - `phoneNumberId?: string`
     - `displayPhoneNumber?: string`
     - `verifiedName?: string`
   - Si un departamento no tiene asignado número propio, hereda el número central de la organización (`meta_credentials`).

---

## 3. Componentes y Archivos a Modificar

### A. Capa de WhatsApp y Webhook
- **`src/server/whatsapp/credentials.ts`**:
  - `getCredentialsForDepartment(organizationId, departmentId | phoneNumberId)`: Retorna las credenciales con el token de la org y el `phoneNumberId` específico correspondiente al departamento para emitir mensajes.
- **`src/server/inbox/ingest.ts`**:
  - Al procesar el webhook entrante (`processMessagesValue`), resolver el departamento a partir del `value.metadata.phone_number_id`.
  - Crear/asociar la conversación con su respectivo `phoneNumberId` y `departmentId`.
- **`src/server/inbox/send.ts`**:
  - Al enviar un mensaje (`sendText` o `sendImage`), usar el `phoneNumberId` guardado en la conversación (o el asignado a su departamento) para que la respuesta salga por la misma línea.

### B. Capa del Agente Inteligente (IA)
- **`src/lib/departments.ts` & `src/server/ai/prompts.ts`**:
  - Actualizar `buildDepartmentRoutingPrompt`:
    - Inyectar los números de WhatsApp directos configurados para cada departamento.
    - Generar enlaces directos formateados (`https://wa.me/{numero_limpio}?text=Hola...`).
    - Cuando el cliente manifieste necesidad técnica, administrativa o comercial, el agente se despide y provee el enlace directo de derivación inmediata.

### C. Capa de API y Configuración
- **`src/app/api/settings/departments/route.ts`**:
  - Permitir guardar y editar los campos `phoneNumberId`, `displayPhoneNumber` en los departamentos base y personalizados.
- **`src/components/settings/departments-tab.tsx` (o modal de edición de departamento)**:
  - Añadir campos para configurar el número de WhatsApp asociado a cada departamento (o selector de números disponibles en la WABA).

### D. Capa de Interfaz de Usuario (Inbox)
- **`src/components/inbox/conversation-list.tsx` & `inbox-client.tsx`**:
  - Para miembros (`role === "member"`), filtrar por defecto y de forma restringida las conversaciones pertenecientes a los departamentos donde el usuario es miembro.
  - Mostrar en la tarjeta de conversación una pequeña etiqueta/badge indicando el departamento y número por el que entró el chat.
  - Para `owner`, mantener selector rápido para ver todas o filtrar por departamento específico.

---

## 4. Estrategia de Migración y Compatibilidad

- **Retrocompatibilidad**: Las conversaciones existentes que no tengan `phoneNumberId` asumirán automáticamente el número principal de `meta_credentials`.
- **Migración sin downtime**: Las nuevas columnas en `schema.ts` se añadirán con valores por defecto o nulables temporalmente mientras corre la migración en arranque (`migrate.mjs`).
