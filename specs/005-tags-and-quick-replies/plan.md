# Plan Técnico de Implementación: Respuestas Rápidas y Etiquetas (Tags)

**Feature**: `005-tags-and-quick-replies`  
**Fecha**: 2026-09-13  

---

## 1. Arquitectura y Componentes

1. **Base de Datos & Migración:**
   - Crear tablas `tag`, `contact_tag` y `quick_reply` en `src/lib/db/schema.ts`.
   - Generar migración SQL `0007_tags_and_quick_replies.sql` con índices y constraints de unicidad por organización.
2. **Endpoints de Backend:**
   - `/api/tags`: Listar y crear etiquetas de la organización.
   - `/api/tags/[id]`: Actualizar y eliminar etiqueta.
   - `/api/contacts/[id]/tags`: Obtener y sincronizar etiquetas asignadas a un contacto.
   - `/api/quick-replies`: Listar y registrar respuestas rápidas con atajos.
   - `/api/quick-replies/[id]`: Modificar o borrar respuesta rápida.
3. **Frontend y UX:**
   - **Configuración (`/settings`):**
     - Pestaña **Etiquetas (Tags)**: Listado, selector de color visual y creación rápida.
     - Pestaña **Respuestas Rápidas**: Tabla de atajos (`/shortcut`), título y mensaje.
   - **Bandeja (`/inbox`):**
     - Popover de atajos rápidos cuando el asesor teclea `/` o hace clic en un botón de rayo `⚡` al lado de la caja de redacción.
     - Insignias de etiquetas visibles en la cabecera del chat y en el listado lateral de conversaciones, con modal para agregar/quitar etiquetas en un clic.
