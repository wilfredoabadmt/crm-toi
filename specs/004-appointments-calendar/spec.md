# Especificación Funcional: Módulo de Agenda, Visitas Técnicas y Citas

**Rama**: `004-appointments-calendar`  
**Fecha**: 2026-09-12  
**Estado**: Especificación y Diseño  

---

## 1. Historias de Usuario Priorizadas

### Historia de Usuario 1 — Creación y Gestión de Citas por el Equipo Humano (P1)
**Como** asesor comercial o coordinador técnico,  
**quiero** programar citas, visitas técnicas o reuniones seleccionando un contacto/lead, asignando un responsable, fecha, hora, duración y dirección o enlace,  
**para** tener organizada la logística de instalaciones, soporte presencial o reuniones con clientes.

#### Escenarios de Aceptación:
1. **Dado** que el usuario ingresa a la nueva sección `/appointments`, **Cuando** pulsa "Nueva Cita", **Entonces** puede buscar un contacto existente o crear uno rápido, indicar el tipo de cita (`instalacion`, `visita_tecnica`, `reunion`, `revision`), fecha, hora de inicio, duración estimada y responsable del equipo asignado.
2. **Dado** que se guarda la cita, **Cuando** se visualiza el Calendario (vista mensual, semanal o diaria), **Entonces** la cita aparece con color identificador según su tipo y estado (`programada`, `confirmada`, `completada`, `cancelada`, `no_asistio`).
3. **Dado** un cambio de horario imprevisto, **Cuando** el usuario arrastra la cita en el calendario o edita sus detalles, **Entonces** se actualiza la fecha/hora en la base de datos y se registra la modificación.

---

### Historia de Usuario 2 — Confirmación y Recordatorio Multimedia por WhatsApp (P1)
**Como** miembro del equipo o administrador del CRM,  
**quiero** que al agendar o reprogramar una cita se pueda enviar automáticamente un mensaje de confirmación al WhatsApp del cliente con opción de adjuntar una imagen (croquis, requisitos, credencial técnica) o video explicativo,  
**para** reducir la tasa de clientes ausentes (*no-shows*) y dar una imagen profesional y de confianza.

#### Escenarios de Aceptación:
1. **Dado** el formulario de creación/edición de cita, **Cuando** el usuario activa la casilla "Enviar confirmación por WhatsApp", **Entonces** puede seleccionar una plantilla oficial de utilidad/servicio aprobada en Meta y subir o adjuntar multimedia desde Cloudflare R2.
2. **Dado** que se confirma el guardado, **Cuando** el cliente recibe el mensaje en WhatsApp, **Entonces** las variables (nombre del cliente, fecha, hora de la cita, nombre del técnico o asesor) se sustituyen con precisión en el cuerpo del mensaje.
3. **Dado** que se programa un recordatorio previo (ej. 24 horas antes o 2 horas antes de la visita), **Cuando** el cron periódico detecta las citas próximas, **Entonces** despacha el mensaje de recordatorio automático al cliente.

---

### Historia de Usuario 3 — Agendamiento Autónomo por el Agente de IA (P2)
**Como** cliente o lead que conversa con la línea de WhatsApp de la empresa,  
**quiero** acordar una fecha y hora para una visita técnica o instalación directamente chateando con el Agente Inteligente,  
**para** no tener que esperar a que un operador humano esté libre para coordinar la cita.

#### Escenarios de Aceptación:
1. **Dado** un cliente que confirma cobertura técnica o interés comercial en el chat, **Cuando** propone un día y horario (ej. *"Puedo el viernes por la mañana a las 10:00"*), **Entonces** el Agente IA verifica la disponibilidad en el calendario, reserva la cita mediante la acción `schedule_appointment` y le devuelve una confirmación formal y empática con los datos de su cita.
2. **Dado** que el Agente IA genera la cita, **Cuando** el equipo ingresa al módulo de Agenda, **Entonces** la cita se visualiza etiquetada como *"Agendada por Agente IA"* con el contacto vinculado y notas del chat.

---

### Historia de Usuario 4 — Vistas y Filtros Operativos (P2)
**Como** supervisor de operaciones o asesor,  
**quiero** filtrar el calendario y listado por técnico asignado, tipo de actividad y estado de la cita,  
**para** balancear la carga de trabajo diaria y monitorear qué visitas técnicas están pendientes o completadas.

#### Escenarios de Aceptación:
1. **Dado** el calendario de citas, **Cuando** se filtra por un miembro específico del equipo, **Entonces** solo se muestran sus visitas agendadas.
2. **Dado** un filtro por estado (`programada`, `completada`, `cancelada`), **Cuando** se aplica, **Entonces** la lista y el calendario se actualizan instantáneamente.

---

## 2. Reglas de Negocio y Casos Borde

1. **Colisión de Horarios:** Si un técnico ya tiene asignada una cita en el mismo rango horario, el sistema emite una advertencia visual ("El asesor ya tiene una cita asignada a esa hora"), pero permite forzar la reserva si es intencional.
2. **Zona Horaria y Formatos:** Todas las fechas y horas se almacenan en UTC en PostgreSQL y se presentan en la zona horaria local de la organización (ej. America/La_Paz).
3. **Cancelación y Trazabilidad:** Si una cita se cancela, se solicita un motivo opcional y se ofrece la posibilidad de notificar la cancelación al cliente por WhatsApp.
4. **Seguridad Multi-Tenant:** Todas las consultas y mutaciones filtran estrictamente por `organization_id`.
