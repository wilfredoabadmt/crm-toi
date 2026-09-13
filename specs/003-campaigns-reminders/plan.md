# Plan Técnico de Implementación: Campañas y Recordatorios de WhatsApp

**Rama**: `003-campaigns-reminders` | **Fecha**: 2026-09-12 | **Spec**: [`spec.md`](./spec.md)

---

## 1. Resumen Ejecutivo y Enfoque Técnico

Implementación en la arquitectura activa (`src/` — Next.js 15, Drizzle ORM, PostgreSQL y Meta Cloud API) del módulo integral de Campañas y Recordatorios masivos/programados:
1. **Modelo de datos**: Dos tablas en PostgreSQL (`campaign` y `campaign_recipient`) con clave `organization_id` obligatoria y relación con las plantillas existentes (`template`) y contactos (`contact`).
2. **Multimedia**: Reutilización directa del cliente Cloudflare R2 ([`src/lib/storage/r2.ts`](file:///f:/Documentos/GitHub/crm-toi-main/src/lib/storage/r2.ts)) para hospedar las imágenes y videos adjuntos a las cabeceras de plantilla de WhatsApp.
3. **Despacho y Cron**: Servicio de ejecución por lotes con *rate limiting* anti-bloqueo (máx. 15-20 mensajes/seg) y endpoint de cron `/api/campaigns/dispatch` asegurable con token para ejecutar campañas programadas que alcancen su fecha y hora.
4. **Seguridad y Roles**: Verificación en backend de rol (`owner` vs `member`). Si un miembro crea una campaña, su estado inicial es `pending_approval` y solo un `owner` puede autorizarla.
5. **Frontend**: Nueva ruta `/campaigns` accesible desde la barra lateral `AppNav`, con vista de métricas en tarjetas y wizard de creación intuitivo en 3 pasos con envío de prueba al móvil.

---

## 2. Contexto Tecnológico y Dependencias

* **Framework & Runtime**: Next.js 15.1.3 (Node.js 22 runtime para endpoints de despacho).
* **ORM & Base de Datos**: Drizzle ORM `^0.38.3` sobre PostgreSQL 16.
* **Almacenamiento Multimedia**: Cloudflare R2 (S3-compatible) mediante `@aws-sdk/client-s3`.
* **Proveedor de Mensajería**: WhatsApp Cloud API v23 (Meta Graph API).
* **Autenticación**: Better Auth multi-tenant (extracción de `session.organizationId` y `session.role`).

---

## 3. Modelo de Datos (Drizzle ORM en `src/lib/db/schema.ts`)

### 3.1. Tabla `campaign`
* `id`: `text` (prefijo `camp_`)
* `organizationId`: `text` NOT NULL (FK `organization.id`)
* `name`: `text` NOT NULL (Nombre identificador)
* `templateId`: `text` NOT NULL (FK `template.id`)
* `mediaUrl`: `text` (URL pública en R2 para imagen/video de cabecera)
* `mediaType`: `text` (`image` | `video` | `document`)
* `variableValues`: `jsonb` (Diccionario de valores para `{{1}}`, `{{2}}`, etc.)
* `targetType`: `text` (`all_contacts` | `pipeline_stages`) NOT NULL
* `targetStageIds`: `jsonb` (Array de IDs de etapas de pipeline seleccionadas)
* `totalRecipients`: `integer` DEFAULT 0
* `sentCount`: `integer` DEFAULT 0
* `deliveredCount`: `integer` DEFAULT 0
* `readCount`: `integer` DEFAULT 0
* `failedCount`: `integer` DEFAULT 0
* `status`: `text` (`draft` | `pending_approval` | `scheduled` | `sending` | `completed` | `cancelled` | `failed`)
* `scheduledAt`: `timestamp` (Fecha y hora programada de inicio)
* `startedAt`: `timestamp`
* `completedAt`: `timestamp`
* `createdById`: `text` (FK `user.id`)
* `approvedById`: `text` (FK `user.id`)
* `createdAt`, `updatedAt`: `timestamp` DEFAULT NOW()

### 3.2. Tabla `campaign_recipient`
* `id`: `text` (prefijo `rcpt_`)
* `organizationId`: `text` NOT NULL (FK `organization.id`)
* `campaignId`: `text` NOT NULL (FK `campaign.id` ON DELETE CASCADE)
* `contactId`: `text` NOT NULL (FK `contact.id`)
* `phone`: `text` NOT NULL (Teléfono normalizado E.164)
* `status`: `text` (`pending` | `sent` | `delivered` | `read` | `failed`)
* `waMessageId`: `text` (ID retornado por Meta Cloud API)
* `error`: `text` (Mensaje de error en caso de fallo)
* `sentAt`: `timestamp`
* `deliveredAt`: `timestamp`
* `createdAt`, `updatedAt`: `timestamp` DEFAULT NOW()

---

## 4. Endpoints y Capa de API

1. `GET /api/campaigns`: Listar campañas de la organización con contadores agregados.
2. `POST /api/campaigns`: Crear nueva campaña (o borrador) con cálculo de audiencia.
3. `GET /api/campaigns/[id]`: Obtener detalle, estadísticas y primeros destinatarios de la campaña.
4. `POST /api/campaigns/[id]/approve`: Propietario autoriza una campaña pendiente.
5. `POST /api/campaigns/[id]/cancel`: Cancelar campaña programada o en envío.
6. `POST /api/campaigns/test-send`: Envío de prueba individual al número del operador.
7. `POST /api/campaigns/dispatch`: Endpoint del despachador (ejecuta pendientes/programadas que alcanzaron su hora). Protegido con `CRON_SECRET` para invocación periódica o llamada directa interna.

---

## 5. UI y Flujo en Frontend

* **Menú Lateral (`AppNav`)**:
  * Nuevo enlace a `/campaigns` con icono `Megaphone`.
* **Página Principal (`src/app/(app)/campaigns/page.tsx`)**:
  * Encabezado con estadísticas generales y botón "Nueva Campaña".
  * Pestañas: **Todas**, **Programadas**, **Enviadas**, **Borradores**.
  * Tarjetas de campaña con progreso visual (% de entrega) y estados legibles con badges de colores.
* **Asistente de Creación (`CampaignWizardModal`)**:
  1. *Paso 1*: Seleccionar Plantilla aprobada de WhatsApp. Si requiere multimedia, subir imagen/video directo a R2. Llenar variables de texto. Previsualizador en teléfono.
  2. *Paso 2*: Elegir filtro de audiencia (Todas las etapas o etapas específicas del Pipeline). Muestra el número de contactos elegibles calculados en vivo.
  3. *Paso 3*: Envío de prueba al número personal del usuario + Selección de fecha y hora en selector de calendario nativo o "Enviar ahora".
  4. Botón contextual: Si es `member` → "Enviar a Aprobación". Si es `owner` → "Programar y Despachar".
