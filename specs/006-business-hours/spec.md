# Especificación: Módulo de Horarios de Atención y Respuestas Fuera de Horario

## 1. Propósito y Valor del Negocio
Permitir a los administradores y operadores del CRM configurar visualmente los días y horas de atención de la empresa, mostrando en todo momento a los agentes si el negocio está abierto o cerrado, y automatizando una respuesta cordial o la delegación al asistente inteligente cuando un cliente se comunica fuera del horario laboral.

---

## 2. Historias de Usuario

### Historia 1: Configurar la semana laboral
**Como** administrador del negocio,  
**quiero** definir para cada día de la semana si atendemos o estamos cerrados, y en qué rangos de hora (turno continuo o turno mañana y tarde),  
**para** que el sistema conozca con exactitud los períodos de disponibilidad del equipo.

#### Criterios de Aceptación:
- Puedo activar o desactivar cada día (Lunes a Domingo).
- Para cada día activo, puedo configurar un rango de inicio y fin (ej: 08:30 a 18:30) o dos intervalos en caso de descanso al mediodía (ej: 08:30 a 12:30 y 14:30 a 18:30).
- Puedo seleccionar la zona horaria del negocio (ej: `America/La_Paz`).

---

### Historia 2: Respuesta automática de ausencia
**Como** operador del CRM,  
**quiero** que cuando un cliente escriba por WhatsApp fuera del horario de oficina reciba un mensaje automático de ausencia,  
**para** que sepa que recibimos su mensaje y en qué momento será atendido, evitando incertidumbre o quejas.

#### Criterios de Aceptación:
- El administrador puede redactar el mensaje de ausencia personalizado.
- El sistema envía el mensaje de ausencia únicamente si el canal tiene activada esta opción.
- El sistema cuenta con protección para no enviar repetidamente el mensaje de ausencia si el cliente envía varios mensajes seguidos dentro de una ventana de 24 horas.

---

### Historia 3: Delegación nocturna al Asistente Inteligente
**Como** dueño de negocio,  
**quiero** tener la opción de que el Asistente Inteligente tome el control de la conversación fuera del horario laboral,  
**para** capturar prospectos, agendar citas o resolver preguntas frecuentes mientras el equipo descansa.

#### Criterios de Aceptación:
- Existe una opción para habilitar la intervención del asistente inteligente exclusivamente o de forma preferente fuera de horario.

---

### Historia 4: Indicador de estado en tiempo real
**Como** agente de atención en el Inbox,  
**quiero** ver un indicador visual en el encabezado o en la bandeja que me informe si actualmente estamos "Abiertos (En horario)" o "Cerrados (Fuera de horario)",  
**para** contextualizar mi comunicación con los contactos.

#### Criterios de Aceptación:
- Indicador visual verde cuando la hora local actual cae dentro de una franja activa del día.
- Indicador visual amarillo/gris cuando la hora actual cae fuera del horario o en un día cerrado.
- Indicación de la hora en que volverá a abrir la atención.
