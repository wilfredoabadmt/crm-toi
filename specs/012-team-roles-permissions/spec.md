# Especificación: Gestión de Roles y Permisos por Secciones para el Equipo (RBAC Granular)

## 1. Propósito y Valor del Negocio
Permitir que el **Super Administrador (Owner / Propietario)** del CRM pueda **gestionar los roles de cada miembro del equipo** y configurar de forma precisa y granular a **qué secciones de la plataforma tiene acceso cada persona mediante casillas de verificación (checkboxes)**.

Esto resuelve:
1. **Control y Seguridad**: Evitar que operadores o técnicos accedan a configuraciones críticas (WhatsApp Cloud API, credenciales de IA, facturación o borrado de miembros).
2. **Flexibilidad Operativa**: Permitir crear perfiles a medida (ej: un miembro de ventas solo ve "Bandeja" y "Pipeline"; un técnico solo ve "Bandeja" y "Cobertura NAP"; un supervisor ve "Dashboard", "Contactos" y "Reportes").
3. **Experiencia Limpia**: Los miembros solo ven en el menú lateral (`AppNav`) las secciones a las que tienen autorización. Si intentan ingresar directamente por URL a una sección restringida, el sistema los redirige de forma segura a su primera sección permitida.

---

## 2. Decisiones de Clarificación (Fase Clarify)

1. **Catálogo de Secciones Configurables**:
   - `dashboard`: Dashboard y métricas
   - `inbox`: Bandeja de entrada de WhatsApp
   - `pipeline`: Embudo de ventas (Pipeline)
   - `appointments`: Agenda de citas e instalaciones
   - `campaigns`: Campañas masivas de WhatsApp
   - `contacts`: Directorio de contactos
   - `todos`: Tareas internas
   - `coverage`: Consulta y gestión de Cobertura NAP
   - `agent`: Agente Inteligente y Base de Conocimiento
   - `lab`: Laboratorio de simulación de IA
   - `settings`: Configuración del sistema
2. **Roles Disponibles**:
   - `owner`: Super Administrador (acceso total a todas las secciones, gestión de equipo y llaves de la organización; inmutable).
   - `admin`: Administrador de área (acceso a secciones autorizadas y configuración estándar).
   - `member`: Operador / Agente estándar (acceso únicamente a las secciones marcadas en sus checkboxes).
3. **Persistencia de Permisos**:
   - Columna `permissions` de tipo `jsonb` o `text[]` en la tabla `member` en PostgreSQL.
   - Si un miembro tiene `permissions: null`, hereda los permisos por defecto según su rol (`owner`: todas; `member`: `["inbox", "contacts", "todos"]`).
4. **Protección de Navegación y Rutas**:
   - **Frontend**: El menú lateral `AppNav` filtra los enlaces según el arreglo de permisos del usuario.
   - **Servidor / Páginas**: Si un miembro intenta navegar a una ruta fuera de sus permisos (ej. `/agent`), es redirigido a su sección principal habilitada (ej. `/inbox`).

---

## 3. Historias de Usuario

### Historia 1: Panel de Asignación de Permisos y Roles (Super Administrador)
**Como** Super Administrador (Owner),  
**quiero** abrir un panel o modal de "Roles y Permisos" para cualquier miembro del equipo con checkboxes para cada sección del sistema,  
**para** habilitar o restringir el acceso a herramientas específicas según las responsabilidades de cada colaborador.

#### Criterios de Aceptación:
- En `/settings/team`, cada miembro muestra su rol actual y un botón de acción: *"Permisos y Rol"*.
- Al hacer clic, se despliega un modal o panel interactivo:
  - Selector de Rol (`Administrador`, `Operador / Miembro`).
  - Lista de checkboxes organizados por secciones con iconos claros:
    - [ ] Dashboard
    - [ ] Bandeja de entrada (Inbox)
    - [ ] Pipeline de ventas
    - [ ] Agenda de citas
    - [ ] Campañas de WhatsApp
    - [ ] Directorio de contactos
    - [ ] Tareas (Todos)
    - [ ] Cobertura NAP
    - [ ] Agente IA
    - [ ] Laboratorio IA
    - [ ] Configuración
  - Botones de acción rápida: *"Seleccionar todo"* / *"Solo atención básica"*.
  - Botón *"Guardar permisos"*.
- El propietario (`owner`) siempre conserva acceso total y no puede ser despojado de sus privilegios.

### Historia 2: Cumplimiento de Permisos en la Navegación del Miembro
**Como** operador o miembro del equipo,  
**quiero** que la barra de navegación lateral me muestre exclusivamente las secciones autorizadas por el administrador,  
**para** tener una interfaz limpia, sin distracciones y sin acceso a secciones restringidas.

#### Criterios de Aceptación:
- La barra de navegación lateral (`AppNav`) lee los permisos del usuario activo y oculta los ítems no autorizados.
- Si un usuario tiene restringida una sección e intenta ingresar directamente digitando la URL en el navegador, el sistema lo redirige a la primera página que tenga autorizada.
