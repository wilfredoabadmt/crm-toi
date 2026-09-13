# Modelo de Datos y Consultas de Agregación: Analytics y Reportes

## 1. Naturaleza de los Datos
El módulo de métricas es puramente de agregación y lectura analítica (**read-only**). No requiere la creación de nuevas tablas ni alteraciones de esquema en PostgreSQL, lo que garantiza **100% de estabilidad y cero riesgo de regresión**.

---

## 2. Entidades Consultadas

### 1. `message`
- **Filtros**: `organization_id = :orgId`, `(wa_timestamp ?? created_at) >= :startDate AND <= :endDate`.
- **Métricas extraídas**:
  - Mensajes entrantes (`direction = 'in'`).
  - Mensajes salientes (`direction = 'out'`).
  - Mensajes generados por el Agente IA (`ai_generated = true`).
  - Distribución por hora del día: `EXTRACT(HOUR FROM ...)`.
  - Distribución por día de la semana: `EXTRACT(DOW FROM ...)`.

### 2. `conversation`
- **Filtros**: `organization_id = :orgId`, `last_message_at >= :startDate`.
- **Métricas extraídas**:
  - Total conversaciones con actividad en el periodo.
  - Conversaciones con handoff / intervención humana vs atendidas solo por IA.
  - Conversaciones no leídas pendientes.

### 3. `lead` y `pipeline_stage`
- **Filtros**: `organization_id = :orgId`.
- **Métricas extraídas**:
  - Conteo de prospectos agrupados por etapa (`stage.name` y `stage.kind`).
  - Tasa de conversión: leads en etapa `won` respecto al total.

### 4. `appointment`
- **Filtros**: `organization_id = :orgId`, `scheduled_at >= :startDate AND <= :endDate`.
- **Métricas extraídas**:
  - Citas programadas, completadas y canceladas.

### 5. `member`, `user` y `department`
- **Filtros**: Miembros activos de la organización.
- **Métricas extraídas**:
  - Desglose de carga por departamento y asesor asignado.
