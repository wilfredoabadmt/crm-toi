# Plan Técnico: Panel de Métricas y Rendimiento de Atención (Analytics)

## 1. Stack y Arquitectura
- **Framework**: Next.js 15 App Router + React 19 + TypeScript.
- **Base de Datos**: PostgreSQL + Drizzle ORM (consultas de agregación indexadas).
- **Gráficos**: Componentes nativos con Tailwind CSS y SVG optimizados (cero dependencias externas pesadas, carga ultrarrápida).
- **Seguridad**: Multi-tenant estricto con `organizationId` obtenido de la sesión Better Auth.

---

## 2. Archivos a Crear o Modificar

### Capa de Servidor
- `src/server/reports/service.ts`:
  - `getAnalyticsSummary(organizationId, range)`: Cálculo de KPIs, distribución horaria, desglose de pipeline, appointments y productividad de equipo.
  - `generateReportsCsv(summary)`: Generación de archivo CSV para descarga.

### Capa de API
- `src/app/api/reports/route.ts`: `GET` para obtener datos del dashboard según `?range=today|7d|30d|month`.
- `src/app/api/reports/export/route.ts`: `GET` para descarga de reporte en formato CSV.

### Capa de Interfaz de Usuario
- `src/components/reports/reports-client.tsx`: Dashboard ejecutivo con selector de período, 4 KPI cards, gráfico de horas pico, distribución semanal, funnel del pipeline y tabla de carga por asesor.
- `src/app/(app)/reports/page.tsx`: Página Server Component con Metadata.
- `src/components/app-nav.tsx`: Entrada en el menú de navegación principal con icono `BarChart3`.
