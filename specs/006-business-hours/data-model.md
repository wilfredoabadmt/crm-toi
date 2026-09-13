# Modelo de Datos: Horarios de Atención (Business Hours)

## 1. Tabla `business_schedule`
Representa la configuración global de horario comercial para la organización.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `text` | PRIMARY KEY (`bsched_<nanoid>`) | Identificador único |
| `organization_id` | `text` | NOT NULL, REFERENCES `organization(id)` ON DELETE CASCADE | Organización propietaria |
| `timezone` | `text` | NOT NULL, DEFAULT `'America/La_Paz'` | Zona horaria del negocio (IANA) |
| `is_enabled` | `boolean` | NOT NULL, DEFAULT `true` | Si el control de horario está activo |
| `out_of_hours_action` | `text` | NOT NULL, DEFAULT `'away_message'` | Acción fuera de horario: `'none'`, `'away_message'`, `'ai_takeover'`, `'both'` |
| `away_message` | `text` | DEFAULT `'¡Hola {{1}}! Nuestro horario de atención es de Lunes a Viernes de 8:30 a 18:30. En este momento el equipo está fuera de oficina, pero te responderemos a primera hora.'` | Mensaje de ausencia |
| `created_at` | `timestamp` | NOT NULL, DEFAULT `now()` | Fecha de creación |
| `updated_at` | `timestamp` | NOT NULL, DEFAULT `now()` | Fecha de última actualización |

**Índices:**
- UNIQUE (`organization_id`): Una sola configuración de horario principal por organización.

---

## 2. Tabla `business_schedule_day`
Detalle de apertura por cada día de la semana (1 = Lunes, 7 = Domingo).

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `text` | PRIMARY KEY (`bsday_<nanoid>`) | Identificador de fila |
| `schedule_id` | `text` | NOT NULL, REFERENCES `business_schedule(id)` ON DELETE CASCADE | Horario padre |
| `day_of_week` | `integer` | NOT NULL (1=Lunes, ..., 7=Domingo) | Día de la semana |
| `is_open` | `boolean` | NOT NULL, DEFAULT `true` | Indica si el negocio abre este día |
| `open_time_1` | `text` | NOT NULL, DEFAULT `'08:30'` | Hora de apertura turno 1 (HH:MM) |
| `close_time_1` | `text` | NOT NULL, DEFAULT `'12:30'` | Hora de cierre turno 1 (HH:MM) |
| `open_time_2` | `text` | NULLABLE, DEFAULT `'14:30'` | Hora apertura turno 2 (opcional) |
| `close_time_2` | `text` | NULLABLE, DEFAULT `'18:30'` | Hora cierre turno 2 (opcional) |

**Índices:**
- UNIQUE (`schedule_id`, `day_of_week`)

---

## 3. Modificación a `conversation` (No disruptiva)
- `last_away_message_at`: `timestamp` NULLABLE — Registra la última vez que se envió el mensaje de ausencia a este contacto para evitar reiteración antes de 24 horas.
