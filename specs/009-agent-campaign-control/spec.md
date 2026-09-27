# Especificación: Control Asistido de Campañas de WhatsApp por el Agente Inteligente

## 1. Propósito y Valor del Negocio
Permitir que los administradores y operadores del negocio puedan **consultar, redactar, configurar y programar campañas de mensajería masiva de WhatsApp interactuando de forma conversacional con el Agente Inteligente**.

En lugar de tener que configurar manualmente cada paso del asistente (selección de plantilla, mapeo de variables, cálculo de audiencia por etapas del embudo y horario de envío), el usuario puede instruir al agente en lenguaje natural desde el módulo de Campañas:
> *"Quiero enviar una campaña de reactivación mañana a las 9 AM a todos los contactos en etapa 'Cotizado' con la plantilla de promoción de fibra óptica desde la línea de Ventas"*.

El agente interpreta el objetivo, verifica las plantillas aprobadas por Meta, calcula el alcance real de la audiencia, valida los datos faltantes y crea la campaña en el sistema lista para revisión o despacho con confirmación humana.

---

## 2. Decisiones de Clarificación (Fase Clarify)

1. **Ubicación de la Interfaz:**
   - La asistencia conversacional estará integrada directamente en el módulo de Campañas (`/campaigns`), mediante un botón destacado **"Crear con Asistente IA"** que despliega un modal interactivo con chat fluido y vista previa de tarjeta de campaña.
2. **Mecanismo de Aprobación y Protección (Human-in-the-Loop):**
   - El agente **nunca dispara el envío masivo directo a ciegas**.
   - Toda campaña generada por el asistente se guarda en estado `draft` (o `pending_approval` si la inicia un operador `member`) con un resumen estructurado y botón interactivo **"Confirmar y Programar / Enviar"**, requiriendo el clic humano explícito.
3. **Multilínea por Departamento en Campañas:**
   - Se habilita el soporte de la línea emisora (`phoneNumberId` / `departmentId`) tanto en el backend de campañas como en el agente, permitiendo que las campañas de cobranzas salgan por el número de Cobranzas y las de promociones por el de Ventas o la línea central.

---

## 3. Historias de Usuario

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
**Como** usuario con permisos en el módulo de campañas,  
**quiero** pedirle al agente en lenguaje natural que cree una campaña especificando la plantilla, las variables, la audiencia objetivo, la fecha/hora de envío y el departamento emisor,  
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
- Una vez reunidos los datos, el agente crea la campaña en el backend mediante la API del sistema y presenta una tarjeta de resumen lista para confirmación.

---

### Historia 3: Supervisión Humana y Medidas de Protección (Human-in-the-Loop)
**Como** propietario o supervisor,  
**quiero** que toda campaña creada por el agente requiera confirmación explícita mediante un botón de acción en la interfaz antes del envío masivo real,  
**para** evitar envíos accidentales a cientos de clientes o costos inesperados en la API de WhatsApp.

#### Criterios de Aceptación:
- Al terminar la configuración, el agente presenta una tarjeta de confirmación o resumen visual:
  - Nombre de campaña.
  - Plantilla seleccionada y previsualización del texto.
  - Tamaño exacto de la audiencia (ej: "142 contactos").
  - Horario programado de salida.
  - Línea/departamento emisor.
- La campaña queda registrada en estado seguro (`draft` o `pending_approval`) y muestra un botón directo para que el usuario la confirme con un clic.

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

## 4. Requerimientos Funcionales

- **FR-001**: El agente inteligente debe tener acceso a herramientas de consulta de plantillas aprobadas (`get_approved_templates`), etapas del embudo (`get_pipeline_stages`) y departamentos disponibles (`get_departments`).
- **FR-002**: El agente debe contar con la herramienta de cálculo de audiencia (`calculate_campaign_audience`) para informar al usuario cuántos contactos recibirán el mensaje antes de crearlo.
- **FR-003**: El agente debe contar con la herramienta de creación de campaña (`create_campaign`) que valide el esquema de datos y persista la campaña en base de datos.
- **FR-004**: Soporte de departamento/número emisor en el modelo de campaña y en el despacho de la misma (`phoneNumberId` / `departmentId`).
- **FR-005**: Modal de chat con el asistente integrado en `/campaigns` con botón "Crear con Asistente IA".
- **FR-006**: Envío de prueba individual asistido (`send_campaign_test`).

---

## 5. Requerimientos No Funcionales

- **NFR-001 (Seguridad y Privacidad)**: Ningún secreto de la API de Meta ni tokens se exponen al cliente.
- **NFR-002 (Consistencia y Simplicidad)**: La creación asistida utiliza las mismas funciones y validaciones del backend que usa el wizard manual (`createCampaign`, `calculateAudience`, `sendTestCampaignMessage`).
- **NFR-003 (Usabilidad)**: La conversación debe ser ágil, mostrando sugerencias de autocompletado y tarjetas de previsualización comprensibles para no técnicos.

---

## 6. Criterios de Éxito del MVP
1. Un usuario hace clic en "Crear con Asistente IA" en `/campaigns` y solicita una campaña en lenguaje natural.
2. El agente ayuda a elegir la plantilla, resolver las variables, calcular la audiencia y seleccionar el departamento emisor.
3. El agente genera la tarjeta resumen con previsualización y crea el borrador de campaña.
4. El usuario puede enviar una prueba a su WhatsApp y confirmar la campaña con un solo clic.
