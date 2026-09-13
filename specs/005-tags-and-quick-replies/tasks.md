# Tareas de Implementación: Respuestas Rápidas y Etiquetas

**Feature**: `005-tags-and-quick-replies`  
**Estado**: Planificado  

---

## Tareas

- [ ] **T01 — Schema y Migración de Base de Datos**
  - Definir tablas `tag`, `contact_tag` y `quick_reply` en `src/lib/db/schema.ts`.
  - Crear archivo de migración `drizzle/0007_tags_and_quick_replies.sql` y registrar en `_journal.json`.
  - Agregar prefijos de ID en `src/lib/db/ids.ts` (`tag`, `contactTag`, `quickReply`).

- [ ] **T02 — Endpoints y Servicios Backend**
  - Implementar `/api/tags` y `/api/tags/[id]`.
  - Implementar `/api/contacts/[id]/tags` (asignar/remover etiquetas).
  - Implementar `/api/quick-replies` y `/api/quick-replies/[id]`.

- [ ] **T03 — Paneles de Configuración en `/settings`**
  - Añadir enlaces en el menú secundario de Ajustes: **Etiquetas** y **Respuestas Rápidas**.
  - Crear clientes React con CRUD interactivo y selector de colores de paleta.

- [ ] **T04 — Integración en la Bandeja e Inbox (`/inbox`)**
  - Autocompletado de respuestas rápidas con `/` o botón de acceso rápido.
  - Renderizado de badges de etiquetas en las conversaciones y selector para añadir/quitar etiquetas a un contacto.

- [ ] **T05 — Typecheck, Validación y Despliegue**
  - Correr `npm run typecheck`.
  - Merge a `master` y despliegue a Coolify.
