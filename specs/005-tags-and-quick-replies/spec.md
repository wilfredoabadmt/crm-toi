# Especificación Funcional: Respuestas Rápidas (Fast Replies) y Etiquetas (Tags)

**Rama**: `005-tags-and-quick-replies`  
**Fecha**: 2026-09-13  
**Estado**: Especificación y Diseño  

---

## 1. Historias de Usuario Priorizadas

### Historia de Usuario 1 — Gestión y Uso de Respuestas Rápidas (P1)
**Como** asesor de atención o ventas en la Bandeja (`/inbox`),  
**quiero** invocar textos frecuentes escribiendo una barra diagonal (ejemplo: `/banco`, `/planes`, `/horario`) o pulsando un botón de respuestas rápidas,  
**para** contestar en un segundo preguntas repetitivas sin errores de ortografía ni tener que copiar y pegar de otras notas.

#### Escenarios de Aceptación:
1. **Dado** el panel de configuración `/settings/quick-replies`, **Cuando** un usuario crea una respuesta con atajo `planes` y texto detallado de los paquetes de internet, **Entonces** el atajo queda guardado para la organización.
2. **Dado** el chat activo en `/inbox`, **Cuando** el asesor escribe `/` en la caja de texto, **Entonces** se despliega un popover flotante con la lista de atajos disponibles filtrados en tiempo real según lo que vaya escribiendo.
3. **Dado** que el asesor selecciona un atajo o presiona `Enter` / clic, **Cuando** se inserta en la caja de redacción, **Entonces** el texto se completa y el asesor puede enviarlo o editarlo antes de mandarlo.

---

### Historia de Usuario 2 — Creación y Asignación de Etiquetas (Tags) (P1)
**Como** asesor o supervisor,  
**quiero** categorizar a los contactos con etiquetas visuales de color (ej. `VIP`, `Moroso`, `Reclamo`, `Fibra 100M`),  
**para** identificar de un vistazo el perfil del cliente en la Bandeja, en la lista de Contactos y en el Pipeline.

#### Escenarios de Aceptación:
1. **Dado** el panel `/settings/tags`, **Cuando** el usuario crea una etiqueta con nombre (ej. `VIP`) y selecciona un color (azul, verde, rojo, ámbar, púrpura), **Entonces** la etiqueta queda disponible en toda la organización.
2. **Dado** un contacto abierto en `/inbox` o en `/contacts`, **Cuando** el asesor abre el selector de etiquetas, **Entonces** puede marcar o desmarcar etiquetas para ese contacto y los cambios se guardan de inmediato.
3. **Dado** el listado de conversaciones en `/inbox`, **Cuando** una conversación tiene etiquetas asignadas, **Entonces** se muestran pequeños badges de color debajo o al lado del nombre del cliente.

---

### Historia de Usuario 3 — Filtro por Etiquetas en Campañas y Contactos (P2)
**Como** responsable de marketing o cobranzas,  
**quiero** filtrar a los destinatarios de una Campaña o de la lista de Contactos según sus etiquetas (ej. enviar solo a quienes tienen la etiqueta `Moroso` o `Plan Antiguo`),  
**para** hacer envíos masivos hiper-segmentados de alto retorno.

#### Escenarios de Aceptación:
1. **Dado** el asistente de creación de Campañas (`/campaigns`), **Cuando** el usuario elige el tipo de segmentación "Por Etiquetas (Tags)", **Entonces** puede seleccionar una o más etiquetas y el sistema calcula la audiencia calificada en tiempo real.

---

## 2. Reglas de Negocio y Restricciones Técnicas

1. **Unicidad de Atajos:** Dentro de la misma organización, los atajos de respuestas rápidas no deben duplicarse (ej. solo puede existir un `/banco`).
2. **Seguridad Multi-Tenant:** Toda etiqueta y respuesta rápida lleva `organization_id` obligatorio e indexado.
3. **Rendimiento:** La carga de respuestas rápidas y etiquetas en el `/inbox` debe estar en caché local del cliente para que al teclear `/` la respuesta sea instantánea (menos de 10 milisegundos).
