# Especificación: Panel de Métricas y Rendimiento de Atención (Analytics)

## 1. Propósito y Valor del Negocio
Ofrecer a los administradores y gerentes de la empresa un tablero analítico en tiempo real que sintetice el rendimiento de la atención al cliente, el volumen de interacciones por WhatsApp, las horas de mayor demanda, el impacto del asistente inteligente (IA) y el avance de los prospectos por el embudo comercial.

---

## 2. Historias de Usuario

### Historia 1: Resumen ejecutivo de atención y carga
**Como** administrador o director de operaciones,  
**quiero** visualizar tarjetas con los indicadores clave (total de conversaciones, mensajes entrantes vs salientes, citas generadas y porcentaje de automatización por IA),  
**para** conocer la salud operativa de la empresa en un periodo determinado (hoy, 7 días, 30 días o este mes).

#### Criterios de Aceptación:
- Puedo alternar entre rangos predefinidos: "Hoy", "Últimos 7 días", "Últimos 30 días" y "Este mes".
- Se muestra el volumen total de conversaciones activas con actividad en el periodo.
- Se desglosa el número de mensajes enviados y recibidos.
- Se calcula el porcentaje de conversaciones o mensajes donde intervino con éxito el asistente inteligente.
- Se cuantifican las citas técnicas o comerciales generadas.

---

### Historia 2: Mapa de horas pico y distribución diaria
**Como** supervisor de equipo,  
**quiero** ver gráficos de distribución horaria (00:00 a 23:00) y por día de la semana,  
**para** planificar los horarios y turnos de los agentes en los momentos de mayor saturación de mensajes.

#### Criterios de Aceptación:
- Gráfico de barras interactivo con el volumen de mensajes recibidos por hora.
- Gráfico de distribución de carga por día de la semana (Lunes a Domingo).
- Destacado visual de la franja horaria pico.

---

### Historia 3: Rendimiento por Área y Asesor
**Como** gerente de área,  
**quiero** consultar el volumen de atenciones distribuidas por departamento (Ventas, Soporte, Facturación) y por operador,  
**para** balancear la carga de trabajo y reconocer al personal más activo.

#### Criterios de Aceptación:
- Tabla con los asesores u operadores del equipo y la cantidad de conversaciones gestionadas.
- Distribución porcentual de conversaciones por área departamental.

---

### Historia 4: Conversión del Pipeline de Ventas
**Como** líder comercial,  
**quiero** visualizar cuántos contactos se encuentran en cada etapa del embudo comercial (Nuevo, En conversación, Interesado, Cliente ganado, Perdido),  
**para** evaluar el porcentaje de cierre y la efectividad del proceso de ventas.

#### Criterios de Aceptación:
- Gráfico de barras o embudo con el recuento de contactos por etapa.
- Tasa de conversión global de prospectos a clientes ganados.

---

### Historia 5: Exportación de métricas
**Como** administrador,  
**quiero** descargar un resumen en formato CSV con el detalle de las métricas del periodo,  
**para** presentar reportes ejecutivos o realizar análisis en hojas de cálculo externas.

#### Criterios de Aceptación:
- Botón para exportar el resumen de métricas en formato CSV compatible con Excel.
