# Especificación: Configuración Dinámica de Modelo LLM y Token de API para el Agente

## 1. Propósito y Valor del Negocio
Permitir que el propietario o administrador del negocio pueda **configurar, cambiar y personalizar el proveedor de LLM, el modelo de inteligencia artificial y su clave de API (Token)** directamente desde el panel de control del Agente (`/agent`), sin depender de variables estáticas ni requerir despliegues técnicos.

Esto otorga:
1. **Autonomía y Libertad de Elección**: El cliente puede alternar entre sus modelos favoritos (ej. OpenAI `gpt-4o`, `gpt-4o-mini`, DeepSeek `deepseek-chat`, Anthropic `claude-3.5-sonnet`, Meta `llama-3.3-70b-instruct` o endpoints compatibles con OpenAI).
2. **Control de Costos y Confianza**: El cliente puede usar su propia API Key con su propia facturación o límites de gasto.
3. **Resiliencia Operativa**: Los cambios se sincronizan en memoria en tiempo real y se persisten de forma segura cifrada (AES-256-GCM), actualizando opcionalmente el archivo `.env` local sin interrumpir el funcionamiento del agente ni romper el sistema.

---

## 2. Historias de Usuario

### Historia 1: Configuración de Credenciales de LLM en el Panel del Agente
**Como** propietario del CRM,  
**quiero** acceder a una tarjeta de configuración de "Proveedor y Modelo de IA" en el panel `/agent` con campos para Base URL, Modelo y Token de API,  
**para** ingresar mis propias credenciales y elegir el modelo que mejor se adapte a mis requerimientos y presupuesto.

#### Criterios de Aceptación:
- En la interfaz `/agent`, se muestra una sección visible para administradores/owners: "Configuración del Modelo de IA".
- Campos configurables:
  - **Proveedor / Endpoint Base**: Selector rápido con opciones populares (OpenRouter por defecto `https://openrouter.ai/api`, OpenAI directo `https://api.openai.com/v1`, o Personalizado).
  - **Modelo**: Campo de texto con autocompletado y sugerencias de modelos destacados (`openai/gpt-4o-mini`, `deepseek/deepseek-chat`, `anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.3-70b-instruct`).
  - **Token de API**: Campo protegido (tipo contraseña) para ingresar la API Key. Se muestran solo los últimos 4 dígitos una vez guardada.
- Si no hay token configurado, el sistema muestra el banner informativo de advertencia guiando al usuario.

---

### Historia 2: Validación Inmediata de Conexión (Test Connection)
**Como** administrador,  
**quiero** hacer clic en un botón "Probar conexión" antes de guardar los cambios,  
**para** asegurarme de que el token es válido, que el modelo existe y que responde correctamente en formato JSON.

#### Criterios de Aceptación:
- El usuario puede presionar "Probar conexión".
- El sistema envía un mensaje de prueba mínimo y valida que el LLM devuelva un JSON estructurado válido.
- Si la prueba es exitosa, se muestra una confirmación en verde: *"Conexión exitosa con [modelo] (Latencia: 320ms)"*.
- Si falla (token revocado, saldo insuficiente o modelo inválido), se muestra el mensaje de error exacto devuelto por la API para facilitar su corrección antes de guardar.

---

### Historia 3: Persistencia Segura y Actualización Dinámica
**Como** sistema CRM,  
**quiero** que al guardar los datos del LLM se almacenen de forma cifrada en la base de datos, se actualicen en memoria para el proceso en curso y se sincronice el archivo `.env` local,  
**para** que el agente inteligente comience a utilizar el nuevo modelo de inmediato sin necesidad de reiniciar el servidor.

#### Criterios de Aceptación:
- El token se cifra en reposo mediante AES-256-GCM (`cipher`, `iv`, `tag`).
- La memoria de `process.env` y el adaptador de IA adoptan los nuevos valores al instante.
- Si existe un archivo `.env` en la raíz, se actualizan las entradas `OPENROUTER_API_TOKEN`, `OPENROUTER_MODEL` y `OPENROUTER_BASE_URL` reemplazando los valores existentes.
- Si el cliente elimina su token personalizado, el sistema hace fallback grácil a las variables de entorno predeterminadas de la instancia.

---

## 3. Requerimientos Funcionales

- **FR-001**: Extender el esquema de `agentProfile` en base de datos para almacenar `llmBaseUrl`, `llmModel`, `llmTokenCipher`, `llmTokenIv`, `llmTokenTag`.
- **FR-002**: Generar migración limpia e incremental de base de datos (`drizzle/`).
- **FR-003**: Adaptar `src/lib/ai/index.ts` y `src/server/ai/pipeline.ts` para resolver las credenciales de la organización activa (`agentProfile`) antes de recurrir a las variables globales.
- **FR-004**: Endpoint `POST /api/agent/llm-test` para verificar credenciales y modelos en tiempo real.
- **FR-005**: Endpoint `GET /api/agent/profile` y `PUT /api/agent/profile` actualizados para devolver el estado del LLM (ocultando el secreto con `last4`) y permitir su actualización autorizada (solo rol `owner`).
- **FR-006**: Actualizador seguro del archivo `.env` en disco para mantener sincronizado el entorno del sistema.

---

## 4. Requerimientos No Funcionales

- **NFR-001 (Seguridad Absoluta)**: El token completo de API nunca se devuelve en respuestas GET al frontend ni se expone en logs.
- **NFR-002 (Cero Tiempo de Inactividad)**: El cambio de modelo o token tiene efecto en el siguiente turno del agente sin reiniciar procesos ni tirar conexiones activas.
- **NFR-003 (Robustez y Recuperación)**: Si el nuevo modelo falla o genera un error de proveedor, el sistema degrada la acción a un handoff humano o respuesta segura, protegiendo las conversaciones de los clientes.

---

## 5. Criterios de Éxito del MVP
1. El usuario puede ingresar a `/agent`, ver la tarjeta de configuración de IA y cargar su propia clave y modelo.
2. El botón de prueba confirma que la API Key y el modelo funcionan en menos de 2 segundos.
3. Al guardar, el agente responde inmediatamente en el inbox utilizando el nuevo modelo configurado.
4. El archivo `.env` local queda actualizado con los nuevos valores.
