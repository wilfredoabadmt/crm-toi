# Especificación Funcional: Campañas y Recordatorios Programados de WhatsApp

**Rama de la Feature**: `003-campaigns-reminders`  
**Estado**: Especificación Completada  
**Fecha**: 2026-09-12  

---

## 1. Escenarios de Usuario y Pruebas de Aceptación (Priorizados)

### Historia de Usuario 1 — Creación y Configuración de Campaña (Prioridad: P1)
**Como** asesor comercial o responsable de marketing,  
**quiero** redactar una campaña eligiendo una plantilla aprobada de WhatsApp, completando sus variables y adjuntando opcionalmente una imagen o video de cabecera,  
**para** comunicar promociones, avisos de corte, recordatorios de citas o reactivar clientes interesados.

* **Por qué esta prioridad**: Es el núcleo funcional del módulo. Sin poder componer el mensaje y sus recursos, no hay campaña.
* **Prueba Independiente**: Un usuario puede entrar a la sección de Campañas, pulsar "Nueva Campaña", seleccionar una plantilla existente, rellenar el contenido/imagen, ver la previsualización fiel y guardarla como borrador.

#### Escenarios de Aceptación:
1. **Dado** que el usuario está en la sección de Campañas, **Cuando** hace clic en "Nueva Campaña", **Entonces** se le presenta un formulario donde define nombre de campaña, plantilla oficial a usar, variables de texto y archivo multimedia de cabecera (imagen o video).
2. **Dado** que se selecciona una plantilla con variables (ej. `{{1}}`), **Cuando** el usuario escribe el valor de reemplazo, **Entonces** la vista previa muestra cómo se leerá el mensaje final en el teléfono del cliente.
3. **Dado** que el usuario sube una imagen o video, **Cuando** la subida finaliza con éxito, **Entonces** se muestra una vista previa interactiva del archivo dentro del mensaje.

---

### Historia de Usuario 2 — Segmentación de Destinatarios (Prioridad: P1)
**Como** creador de la campaña,  
**quiero** filtrar a los destinatarios eligiendo una o más etapas del Pipeline (ej. *"Propuesta enviada"*, *"Instalación pendiente"* o *"Todos los contactos"*),  
**para** asegurar que el mensaje llegue exclusivamente a la audiencia relevante y no a contactos no deseados.

* **Por qué esta prioridad**: Permite enviar recordatorios quirúrgicos según el estado del cliente en el negocio.
* **Prueba Independiente**: Al seleccionar una etapa del pipeline, el sistema calcula y muestra en pantalla cuántos contactos califican antes de enviar.

#### Escenarios de Aceptación:
1. **Dado** un borrador de campaña, **Cuando** el usuario selecciona la opción "Filtrar por Etapa del Pipeline" y marca una o más etapas, **Entonces** el sistema muestra la lista de contactos calificados con sus números de teléfono y el conteo total.
2. **Dado** que se selecciona "Todos los contactos", **Cuando** se calcula la audiencia, **Entonces** se excluyen automáticamente contactos archivados o que no tengan un número telefónico válido.

---

### Historia de Usuario 3 — Envío de Prueba Antierrores (Prioridad: P1)
**Como** creador de la campaña,  
**quiero** enviar un mensaje de prueba a mi propio teléfono móvil antes de programar el envío masivo,  
**para** verificar en una pantalla real cómo se recibe el texto, la imagen o el video y no cometer errores frente a los clientes.

* **Por qué esta prioridad**: Previene errores costosos y da total tranquilidad al usuario antes de un envío a cientos de personas.
* **Prueba Independiente**: El usuario introduce su número en el botón "Enviar mensaje de prueba" y recibe inmediatamente la plantilla en su WhatsApp.

#### Escenarios de Aceptación:
1. **Dado** un borrador con plantilla y contenido configurado, **Cuando** el usuario ingresa su número y pulsa "Enviar prueba", **Entonces** el sistema realiza el envío individual y confirma en pantalla el resultado exitoso o el motivo de fallo.

---

### Historia de Usuario 4 — Programación en Cronograma (Fecha y Hora) (Prioridad: P2)
**Como** creador de la campaña,  
**quiero** elegir si el despacho se ejecutará inmediatamente o si quedará programado para una fecha y hora futura específica (ej. *"Mañana a las 09:30 AM"*),  
**para** que los mensajes salgan en el horario de mayor impacto sin requerir que yo esté conectado en ese momento.

* **Por qué esta prioridad**: Permite planificar el calendario semanal o mensual de comunicaciones y recordatorios del negocio.
* **Prueba Independiente**: Se programa una campaña para 2 minutos en el futuro y se verifica que al cumplirse la hora cambie a estado de ejecución automáticamente.

#### Escenarios de Aceptación:
1. **Dado** un borrador listo, **Cuando** el usuario elige "Programar para después" e ingresa fecha y hora futura, **Entonces** la campaña pasa al estado correspondiente y se muestra en la pestaña "Programadas".
2. **Dado** que la campaña aún no ha alcanzado su hora de ejecución, **Cuando** el usuario decide cancelarla o reprogramarla, **Entonces** el sistema permite editar la fecha o cancelar el envío sin que se haya enviado ningún mensaje.

---

### Historia de Usuario 5 — Flujo de Aprobación por Roles (Prioridad: P2)
**Como** Propietario (Owner) de la empresa,  
**quiero** que las campañas preparadas por miembros del equipo requieran mi aprobación antes de salir, mientras que si yo mismo las creo pueda programarlas directamente,  
**para** evitar descuidos de redacción, costes imprevistos o riesgos de penalización en la línea de WhatsApp.

* **Por qué esta prioridad**: Protege la reputación del número de WhatsApp y mantiene el control directivo del negocio.
* **Prueba Independiente**: Un miembro del equipo crea una campaña y el botón final es "Solicitar Aprobación"; entra el Propietario y ve el botón "Aprobar y Programar".

#### Escenarios de Aceptación:
1. **Dado** que un miembro (no propietario) finaliza la configuración de una campaña, **Cuando** presiona "Enviar a Revisión", **Entonces** la campaña queda en estado "Pendiente de Aprobación".
2. **Dado** que el Propietario revisa una campaña pendiente, **Cuando** presiona "Aprobar", **Entonces** la campaña pasa a estado "Programada" (o "Enviando" si era inmediata). Si presiona "Rechazar", puede devolverla con un comentario de corrección.
3. **Dado** que quien crea la campaña es el Propietario, **Cuando** finaliza, **Entonces** puede programarla o enviarla directamente sin pasar por aprobación intermedia.

---

### Historia de Usuario 6 — Tablero de Métricas y Supervisión en Tiempo Real (Prioridad: P3)
**Como** usuario del CRM,  
**quiero** ver el progreso del despacho y las estadísticas de entrega (enviados, entregados, fallidos y respuestas recibidas),  
**para** evaluar el retorno de la acción comercial y atender a los clientes que responden en la Bandeja del CRM.

* **Por qué esta prioridad**: Cierra el ciclo de comunicación; cuando un cliente responde al recordatorio o campaña, la conversación debe continuarse en la Bandeja humana o por el Agente de IA.

#### Escenarios de Aceptación:
1. **Dado** un despacho en progreso, **Cuando** se envían los mensajes, **Entonces** las tarjetas de estadísticas se actualizan mostrando el conteo en tiempo real.
2. **Dado** que un cliente responde al mensaje de la campaña, **Cuando** el webhook recibe la respuesta, **Entonces** la campaña suma 1 al contador de "Respuestas" y la conversación se lista en la Bandeja con la etiqueta de la campaña.

---

## 2. Casos Borde y Reglas de Negocio (Edge Cases)

1. **Contacto sin teléfono o formato inválido:**  
   Si un contacto en el pipeline carece de número válido con código de país, el sistema lo marca como "No elegible" en el resumen de audiencia y no genera un intento fallido en Meta.
2. **La línea de WhatsApp no está conectada o el token expiró:**  
   Si las credenciales de WhatsApp están en estado de desconexión o reconexión requerida, la interfaz impide programar o enviar campañas y muestra una alerta directa con enlace a Ajustes > WhatsApp.
3. **Despacho pausado o cancelado a mitad de camino:**  
   Si una campaña grande (ej. 500 contactos) está enviándose y el Propietario pulsa "Detener Campaña", el despachador frena inmediatamente: los mensajes que ya salieron quedan como enviados y los pendientes se cancelan sin procesar.
4. **Cadencia de envío (Rate Limiting anti-bloqueo):**  
   Los envíos se realizan de forma espaciada (lotes con pausa controlada de microsegundos) para no disparar alertas de spam en los servidores de Meta.
5. **Doble clic o concurrencia:**  
   Una campaña solo puede ser procesada por un único proceso de despacho a la vez para garantizar idempotencia y evitar que un cliente reciba el mensaje duplicado.

---

## 3. Entidades Clave del Dominio

* **Campaña (`Campaign`):**  
  Representa el evento o recordatorio a enviar. Tiene nombre, plantilla asociada, parámetros/variables de reemplazo, recurso multimedia opcional (imagen o video), filtro de audiencia seleccionado, fecha/hora programada, estado del ciclo de vida (`draft`, `pending_approval`, `scheduled`, `sending`, `completed`, `cancelled`, `failed`), creador y aprobador.
* **Destinatario de Campaña (`CampaignRecipient`):**  
  Representa cada contacto individual asignado a una campaña. Registra el contacto, teléfono normalizado, identificador del mensaje devuelto por WhatsApp (`wamid`), estado individual (`pending`, `sent`, `delivered`, `read`, `failed`), mensaje de error si falló y fecha de actualización.

---

## 4. Criterios de Éxito Medibles

* **SC-001**: Un usuario puede crear, configurar la plantilla y programar una campaña completa en menos de 3 minutos.
* **SC-002**: Cero mensajes enviados a números de clientes sin previa validación visual (garantizado por el paso de vista previa y prueba al móvil).
* **SC-003**: 100% de los envíos respetan el flujo de aprobación cuando son creados por miembros no propietarios.
* **SC-004**: Los clientes que respondan a la campaña aparecen de inmediato en la Bandeja general del CRM identificados con el contexto de la campaña.
