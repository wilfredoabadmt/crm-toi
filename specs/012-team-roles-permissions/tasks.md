# Tareas: Gestión de Roles y Permisos por Secciones (RBAC Granular)

## Fase 1: Esquema de Base de Datos y Definiciones
- [x] 1.1 Crear `src/lib/permissions.ts` con el catálogo `ALL_SECTIONS`, tipos y presets de permisos por defecto.
- [x] 1.2 Añadir columna `permissions: jsonb("permissions").$type<string[]>()` a la tabla `member` en `src/lib/db/schema.ts`.
- [x] 1.3 Crear migración idempotente `drizzle/0012_member_permissions.sql` y registrar en `drizzle/meta/_journal.json`.

## Fase 2: Backend y Control de Acceso
- [x] 2.1 Actualizar `requireSession` y `resolveMembership` en `src/lib/auth/session.ts` y `src/server/auth/on-signup.ts` para resolver `permissions`.
- [x] 2.2 Actualizar `src/app/api/settings/team/route.ts` (GET para devolver `permissions`, y PATCH para actualizar rol y permisos con validación `owner`).

## Fase 3: Interfaz de Usuario y Menú de Navegación
- [x] 3.1 Crear componente modal `MemberPermissionsModal` o integrarlo en `src/components/settings/team-client.tsx` con checkboxes por sección, presets y selector de rol.
- [x] 3.2 Actualizar `src/app/(app)/layout.tsx` y `src/components/app-nav.tsx` para filtrar dinámicamente los enlaces del menú lateral según los permisos del usuario activo.
- [x] 3.3 Proteger páginas clave del servidor para redirigir si un usuario sin permisos intenta acceder vía URL directa.

## Fase 4: Verificación, Build y Despliegue
- [x] 4.1 Validar tipado y compilación con `npm run build`.
- [ ] 4.2 Commit del hito y push a GitHub (`master`).
- [ ] 4.3 Despliegue y verificación de salud en producción.

