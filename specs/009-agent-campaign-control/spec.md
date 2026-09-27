# Especificación: Control Asistido de Campañas de WhatsApp por el Agente Inteligente

## 1. Propósito y Valor del Negocio
Permitir que los administradores y operadores del negocio puedan **consultar, redactar, configurar y programar campañas de mensajería masiva de WhatsApp interactuando de forma conversacional con el Agente Inteligente**.

En lugar de tener que configurar manualmente cada paso del asistente (selección de plantilla, mapeo de variables, cálculo de audiencia por etapas del embudo y horario de envío), el usuario puede instruir al agente en lenguaje natural:
> *"Quiero enviar una campaña de reactivación mañana a las 9 AM a todos los contactos en etapa 'Cotizado' con la plantilla de promoción de fibra óptica"*.

El agente interpreta el objetivo, verifica las plantillas aprobadas por Meta, calcula el alcance real de la audiencia, valida los datos faltantes y crea la campaña en el sistema lista para revisión o despacho con confirmación humana.

---

## 2. Historias de Usuario

### Historia 1: Consulta y Exploración de Plantillas y Audiencias
**Como** administrador u operador comercial,  
**quiero** preguntarle al agente inteligente qué plantillas de WhatsApp aprobadas tenemos y cuántos contactos califican en cada etapa,  
**para** diseñar una estrategia de difusión sin tener que navegar por múltiples menús y tablas.

#### Criterios de Aceptación:
- El usuario puede consultar: *"¿Qué plantillas aprobadas tenemos disponibles para promociones?"* o *"¿Cuántos leads tenemos actualmente en etapa 'Por Contactar' o 'Cotizado'?"*.
- El agente consulta el catálogo de plantillas oficiales aprobadas por Meta y el conteo de contactos en tiempo real.
- El agente responde de forma clara resumiendo los nombres de las plantillas, sus variables requeridas y el tamaño estimado de la audiencia.

---

### Historia 2: Creación y Configuración Conversacional de Campañas
**Como** propietario del negocio,  
**quiero** pedirle al agente en lenguaje natural que cree una campaña especificando la plantilla, las variables, la audiencia objetivo y la fecha/hora de envío,  
**para** ahorrar tiempo operativo y asegurar que la campaña quede correctamente configurada en el sistema.

#### Criterios de Aceptación:
- El agente reconoce los parámetros esenciales de la campaña:
  1. Nombre descriptivo de la campaña.
  2. Plantilla de WhatsApp aprobada (`templateId`).
  3. Audiencia objetivo (todos los contactos o etapas específicas del pipeline).
  4. Valores de variables requeridas por la plantilla (ej: nombre del contacto, descuento, fecha límite).
  5. Programación de envío (inmediato o fecha/hora futura).
  6. Departamento emisor o línea de WhatsApp asignada para el envío.
- Si falta algún parámetro obligatorio (por ejemplo, una variable requerida de la plantilla o la fecha de programación), el agente pregunta educadamente al usuario antes de proceder.
- Una vez reunidos los datos, el agente crea la campaña en el backend mediante la API del sistema.

---

### Historia 3: Supervisión Humana y Medidas de Protección (Human-in-the-Loop)
**Como** propietario o supervisor,  
**quiero** que toda campaña creada por el agente requiera confirmación explícita o quede en estado de revisión antes del envío masivo real,  
**para** evitar envíos accidentales a cientos de clientes o costos inesperados en la API de WhatsApp.

#### Criterios de Aceptación:
- Antes de activar o programar la campaña, el agente presenta una tarjeta de confirmación o resumen detallado:
  - Nombre de campaña.
  - Plantilla seleccionada y previsualización del mensaje con variables sustituidas.
  - Tamaño exacto de la audiencia (ej: "142 contactos").
  - Horario programado de salida.
  - Línea/departamento emisor.
- Si el usuario que ordena la campaña es un operador (rol `member`), la campaña se registra forzosamente en estado `pending_approval` para que el `owner` la autorice.
- Si el usuario es el propietario (`owner`), el agente solicita confirmación explícita (o permite el despacho inmediato si el usuario lo ratifica).

---

### Historia 4: Envío de Mensaje de Prueba Asistido
**Como** creador de la campaña,  
**quiero** pedirle al agente que envíe un mensaje de prueba a mi número personal de WhatsApp antes de que la campaña salga a los clientes,  
**para** verificar visualmente en mi teléfono cómo se ve el texto, los emojis y los archivos multimedia adjuntos.

#### Criterios de Aceptación:
- El usuario puede indicar: *"Envía una prueba de esta campaña a mi número +591XXXXXXXX"*.
- El agente dispara la prueba individual utilizando la plantilla y las variables configuradas.
- El agente informa si el envío de prueba fue exitoso o si Meta devolvió algún error de formato o plantilla.

---

## 3. Requerimientos Funcionales

- **FR-001**: El agente inteligente debe tener acceso a herramientas de consulta de plantillas aprobadas (`get_approved_templates`) y etapas del embudo (`get_pipeline_stages`).
- **FR-002**: El agente debe contar con la herramienta de cálculo de audiencia (`calculate_campaign_audience`) para informar al usuario cuántos contactos recibirán el mensaje antes de crearlo.
- **FR-003**: El agente debe contar con la herramienta de creación de campaña (`create_campaign`) que valide el esquema de datos y persista la campaña en base de datos.
- **FR-004**: El sistema debe respetar las restricciones de roles: solo usuarios con permisos adecuados pueden autorizar campañas en estado de despacho.
- **FR-005**: El agente debe poder disparar un envío de prueba unitario (`send_campaign_test`) hacia un número de teléfono suministrado por el usuario.
- **FR-006**: Si la empresa cuenta con múltiples líneas de WhatsApp por departamento, el agente debe permitir asociar la campaña al número del departamento emisor adecuado.

---

## 4. Requerimientos No Funcionales

- **NFR-001 (Seguridad y Privacidad)**: Ningún secreto de la API de Meta debe exponerse en las respuestas del agente. Todas las operaciones de envío se realizan internamente en el backend.
- **NFR-002 (Tolerancia a Fallos y Degeneración Grácil)**: Si el servicio de Meta o de IA tiene intermitencias, el sistema no debe perder datos ni dejar campañas en estados inconsistentes; debe informar claramente el error al usuario.
- **NFR-003 (Usabilidad)**: Los resúmenes presentados por el agente deben ser concisos, estructurados y fáciles de validar de un vistazo.

---

## 5. Criterios de Éxito del MVP
1. Un usuario puede solicitar al agente la creación de una campaña en lenguaje natural.
2. El agente lista las opciones de plantillas válidas, calcula la audiencia y solicita confirmación con los datos consolidados.
3. La campaña queda correctamente guardada y visible en el panel `/campaigns` con su audiencia y variables listas para ejecución o programación.
4. Se puede enviar un mensaje de prueba individual a petición del usuario directamente desde la interacción con el agente.
