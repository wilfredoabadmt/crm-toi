# Tareas: Control Asistido de Campañas de WhatsApp por el Agente Inteligente

## Fase 1: Esquema de Base de Datos y Modelo de Campaña
- [ ] 1.1 Agregar columnas `phoneNumberId` y `departmentId` a la tabla `campaign` en `src/lib/db/schema.ts`.
- [ ] 1.2 Generar migración idempotente y limpia en `drizzle/` para actualizar la tabla `campaign`.
- [ ] 1.3 Actualizar `CreateCampaignInput` y `createCampaign` en `src/server/campaigns/campaigns.ts` para persistir la línea/departamento emisor.
- [ ] 1.4 Actualizar `executeCampaign` y `sendTestCampaignMessage` en `src/server/campaigns/dispatch.ts` para despachar usando las credenciales del número emisor asignado.

## Fase 2: Backend del Asistente IA de Campañas
- [ ] 2.1 Crear `src/server/ai/campaign-assistant.ts` con los schemas Zod de acciones, cálculo dinámico de audiencia y prompt especializado para configuración de campañas.
- [ ] 2.2 Crear endpoint `src/app/api/campaigns/ai-assistant/route.ts` autenticado que atienda las interacciones conversacionales, resuelva plantillas y devuelva sugerencias estructuradas.

## Fase 3: Componente de Modal Conversacional (UI)
- [ ] 3.1 Crear `src/components/campaigns/campaign-ai-modal.tsx` con interfaz de chat, historial de mensajes, sugerencias rápidas de campañas y estado de carga.
- [ ] 3.2 Implementar en el modal la tarjeta de previsualización interactiva con el resumen de audiencia, plantilla con variables, selección de departamento y botón de prueba telefónica.
- [ ] 3.3 Integrar el botón **"Confirmar y Guardar Campaña"** que conecta con `createCampaign` y refresca el listado de campañas.

## Fase 4: Integración en la Vista Principal de Campañas
- [ ] 4.1 Añadir botón **"Crear con Asistente IA"** en `src/components/campaigns/campaigns-client.tsx` junto a los controles principales.
- [ ] 4.2 Enlazar el estado del modal con la actualización en tiempo real de la tabla de campañas.

## Fase 5: Verificación, Build y Despliegue
- [ ] 5.1 Validar tipado y compilación local con `npm run build`.
- [ ] 5.2 Commit del hito y push a GitHub (`master`).
- [ ] 5.3 Despliegue en Coolify (`panel.sys.toi.bo`) y comprobación de salud en producción.
