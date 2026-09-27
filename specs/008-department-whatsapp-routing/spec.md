# Especificación: Multilínea de WhatsApp por Departamento y Derivación Inteligente de Clientes

## 1. Propósito y Valor del Negocio
Permitir que la empresa opere con **múltiples números de WhatsApp oficiales** asignados a cada departamento (Técnico, Comercial, Administrativo, Gerencia y sucursales) bajo la misma infraestructura de Tech Provider. 

Esto garantiza que:
1. Cada departamento opere de forma autónoma con su propia línea telefónica visible para el cliente.
2. Los operadores de un área solo atiendan y visualicen los chats correspondientes a su número asignado (manteniendo privacidad y foco).
3. El Agente Inteligente (IA) atienda las entradas y derive proactivamente a los clientes al número de WhatsApp del departamento que resuelve su necesidad, ya sea mediante enlaces de transferencia rápida directa (`wa.me`) o enrutamiento multicanal en tiempo real.

---

## 2. Historias de Usuario

### Historia 1: Asignación de Número de WhatsApp por Departamento
**Como** propietario o administrador del negocio,  
**quiero** vincular un número de WhatsApp (identificador de teléfono, número visible y nombre verificado) a cada departamento o sucursal desde el panel de configuración,  
**para** que las operaciones comerciales, técnicas, administrativas y directivas tengan canales oficiales independientes.

#### Criterios de Aceptación:
- En la sección de gestión de departamentos, el administrador puede asignar o cambiar el número de WhatsApp asociado a cada área.
- Se puede definir un número principal (recepción central) y números específicos por departamento.
- El sistema valida que el número asignado esté activo y registrado bajo la cuenta de WhatsApp Business (WABA).
- Si un departamento no tiene un número exclusivo asignado, hereda automáticamente la línea central de la empresa.

---

### Historia 2: Bandeja de Entrada Aislada por Departamento
**Como** operador o miembro de un departamento (por ejemplo: soporte técnico o cobranzas),  
**quiero** que mi bandeja de entrada muestre únicamente los mensajes y conversaciones recibidos en el número de WhatsApp asignado a mi área,  
**para** enfocarme exclusivamente en mis casos sin interferir con las conversaciones de otros departamentos ni saturar la pantalla.

#### Criterios de Aceptación:
- Los operadores con rol de miembro solo tienen acceso a los chats del número de WhatsApp de su departamento.
- En la lista de conversaciones se visualiza una insignia con el departamento y la línea por la que ingresó el contacto.
- Los supervisores o administradores generales (rol `owner`) pueden ver una vista consolidada de todas las líneas o filtrar por departamento en un clic.
- Al responder a un mensaje desde la bandeja, la respuesta saliente se envía forzosamente a través del número de WhatsApp del departamento correspondiente.

---

### Historia 3: Derivación Inteligente por el Asistente IA
**Como** cliente que escribe al canal de atención con una consulta específica (ejemplo: corte de fibra óptica o consulta de factura),  
**quiero** que el asistente virtual identifique de inmediato mi necesidad y me comunique con el WhatsApp exacto del departamento encargado,  
**para** ser atendido de forma rápida por el especialista adecuado sin tener que buscar números en directorios externos.

#### Criterios de Aceptación:
- Cuando el cliente manifiesta una avería, el asistente responde despidiéndose amablemente, generando la tarjeta en el pipeline técnico y facilitando el enlace directo al WhatsApp del área técnica con un mensaje prellenado:  
  *«He transferido tu reporte al Departamento Técnico con Alvaro. Puedes continuar tu atención haciendo clic aquí: [Contactar a Soporte Técnico]»*.
- Si el cliente consulta por pagos o facturación, el asistente lo deriva al número del área administrativa con Janneth.
- Si el cliente solicita planes nuevos o cobertura, el asistente coordina con el número de ventas con Andrea.
- Si un cliente escribe directamente al número específico de un área (ej: escribe directo al WhatsApp de Cobranzas pero pide soporte técnico), el asistente también detecta la necesidad cruzada y lo deriva al número correspondiente.

---

### Historia 4: Recepción Unificada del Tech Provider (Webhook Multilínea)
**Como** administrador del sistema,  
**quiero** que todos los eventos y mensajes entrantes de los distintos números de la empresa se procesen a través del mismo webhook centralizado de WhatsApp Cloud API,  
**para** no tener que configurar servidores ni webhooks independientes por cada número telefónico.

#### Criterios de Aceptación:
- El webhook de entrada reconoce de manera transparente el identificador del número receptor (`phone_number_id`).
- El mensaje se asigna a la conversación y departamento correcto en milisegundos.
- Se preserva la trazabilidad del número de origen y destino en cada mensaje del historial.
- Los reintentos, confirmaciones de entrega y lectura funcionan de manera aislada e independiente para cada línea.

---

## 3. Requisitos Funcionales Clave

1. **FR-DEPWABA-01**: Cada departamento registrado en el sistema debe soportar un identificador de teléfono (`phoneNumberId`), número visible (`displayPhoneNumber`) y etiqueta del área.
2. **FR-DEPWABA-02**: Las conversaciones se aíslan por par `(contactId, phoneNumberId)`: si un cliente escribe a dos números de departamento diferentes, tiene dos conversaciones separadas en cada departamento sin mezclar historiales.
3. **FR-DEPWABA-03**: El envío de mensajes salientes (manuales o de IA) debe seleccionar dinámicamente el `phoneNumberId` asociado a la conversación y departamento correspondiente.
4. **FR-DEPWABA-04**: El prompt del Agente IA debe contener los números directos de cada área para generar enlaces de derivación instantánea (`https://wa.me/...`) que transfieren al cliente al número del departamento que resuelve su necesidad.
5. **FR-DEPWABA-05**: Filtrado estricto por departamento en la bandeja de entrada según el rol y membresía del usuario activo.
6. **FR-DEPWABA-06**: Gestión centralizada de credenciales bajo el WABA principal de Tech Provider (un único token de acceso con múltiples `phoneNumberId` autorizados).

---

## 4. Decisiones y Clarificaciones de Negocio

- **Modelo de conversaciones:** Hilos separados por departamento. Si el cliente escribe al WhatsApp Técnico se atiende en el hilo de Soporte, y si escribe al de Cobranzas se atiende en el hilo de Administración.
- **Mecanismo de derivación del Agente IA:** El agente despide amablemente la conversación actual y entrega el botón/enlace de WhatsApp (`https://wa.me/NUMERO?text=...`) con texto prellenado para que el cliente continúe en el WhatsApp del departamento respectivo.
- **Topología de credenciales de Meta:** Un solo token WABA principal para todos los números (modelo Tech Provider con WABA compartida), asignando a cada departamento su respectivo `phoneNumberId` y `displayPhoneNumber`.

