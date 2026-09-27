# Tareas: Multilínea de WhatsApp por Departamento y Derivación Inteligente

## Fase 1: Fundación y Esquema de Base de Datos
- [ ] 1.1 Extender `src/lib/departments.ts` con propiedades de número de WhatsApp (`phoneNumberId`, `displayPhoneNumber`, `verifiedName`) en `DepartmentConfig`.
- [ ] 1.2 Actualizar `src/lib/db/schema.ts` agregando columnas `phoneNumberId` y `departmentId` a la tabla `conversation` y ajustando el índice único a `(organizationId, contactId, phoneNumberId)`.
- [ ] 1.3 Generar migración de base de datos con `drizzle-kit generate` y verificar compatibilidad.

## Fase 2: Configuración de Departamentos y Backend
- [ ] 2.1 Actualizar API `src/app/api/settings/departments/route.ts` para validar y guardar números de WhatsApp por departamento.
- [ ] 2.2 Actualizar `src/server/departments.ts` para resolver las asignaciones de números telefónicos por departamento.
- [ ] 2.3 Implementar selector/campos de número de WhatsApp en la UI de gestión de departamentos (`src/components/settings/departments-tab.tsx` o modal de edición).

## Fase 3: Webhook e Ingesta Multilínea
- [ ] 3.1 Actualizar `src/server/inbox/ingest.ts` para mapear el `phone_number_id` receptor con el departamento correspondiente y crear la conversación asignada a dicho número.
- [ ] 3.2 Actualizar `src/server/inbox/send.ts` y `src/server/whatsapp/credentials.ts` para despachar mensajes salientes a través del `phone_number_id` de la conversación/departamento activo.

## Fase 4: Derivación Inteligente en el Agente IA
- [ ] 4.1 Modificar `buildDepartmentRoutingPrompt` en `src/lib/departments.ts` y `src/server/ai/prompts.ts` para inyectar enlaces de derivación inmediata (`https://wa.me/{numero}?text={contexto}`) al clasificar un lead.
- [ ] 4.2 Probar escenarios de derivación (soporte a técnico, pagos a cobranzas, cotización a comercial) asegurando que el agente despida la sesión y facilite el enlace directo.

## Fase 5: Aislamiento Departamental en el Inbox
- [ ] 5.1 Actualizar `src/components/inbox/conversation-list.tsx` para restringir la vista a los operadores según su departamento asignado, mostrando badge del departamento y número receptor en cada chat.
- [ ] 5.2 Mantener selector de filtro global consolidado para el administrador/propietario (`role === "owner"`).

## Fase 6: Verificación y Despliegue
- [ ] 6.1 Validar tipado y compilación con `npm run build`.
- [ ] 6.2 Commit del hito y push a GitHub (`master`).
- [ ] 6.3 Despliegue en Coolify (`panel.sys.toi.bo`) y verificación de salud en producción.
