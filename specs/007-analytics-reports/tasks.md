# Tareas: Panel de Métricas y Rendimiento de Atención (Analytics)

## Fase 1: Capa de Lógica y Agregación de Datos
- [ ] 1.1 Implementar `src/server/reports/service.ts` con cálculo de métricas por rango, desglose de mensajes, horas pico, embudo de ventas y CSV export.
- [ ] 1.2 Implementar ruta API `src/app/api/reports/route.ts` con soporte de parámetros de rango.
- [ ] 1.3 Implementar ruta API `src/app/api/reports/export/route.ts` con cabeceras `Content-Type: text/csv`.

## Fase 2: Componentes de Interfaz de Usuario
- [ ] 2.1 Crear `src/components/reports/reports-client.tsx` con cards KPI, visualización de horas pico, distribución semanal, progreso de pipeline y tabla de miembros.
- [ ] 2.2 Crear página principal `src/app/(app)/reports/page.tsx`.
- [ ] 2.3 Agregar enlace en la barra de navegación principal `src/components/app-nav.tsx`.

## Fase 3: Validación y Despliegue
- [ ] 3.1 Ejecutar `npm run typecheck` para asegurar cero errores de compilación.
- [ ] 3.2 Commit de la rama `007-analytics-reports`.
- [ ] 3.3 Merge a `master` y push a GitHub.
- [ ] 3.4 Despliegue a producción vía Coolify y validación final.
