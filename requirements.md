# Requisitos · Acadezer

Versión 1.0 académica · 9 de noviembre de 2026.

Este documento reemplaza el alcance inmobiliario para el trabajo futuro. Define comportamiento objetivo, no funcionalidades ya integradas en Angular. Contrato base: backend [5f61e85](https://github.com/SantinoCataldo/acadezer/tree/5f61e8533471af1959efcffd4ccb806f61267df2).

## 1. Alcance principal

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| AUTH-01 | Registro de estudiante. | Enviar nombre, email y contraseña; manejar 201 con usuario y conflicto de email. El registro no inicia sesión automáticamente. |
| AUTH-02 | Login. | Guardar accessToken y usuario recibidos. No solicitar ni almacenar refresh token. |
| AUTH-03 | Restauración y expiración. | Consultar /auth/me para validar la sesión recuperada. Ante expiración o 401, cerrar sesión local y llevar al login sin bucles. |
| AUTH-04 | Logout. | Descartar token y datos privados locales; no prometer revocación de JWT en servidor. |
| AUTH-05 | Aislamiento de datos. | Mostrar recursos del usuario autenticado y manejar 404/403. El backend es la autoridad sobre propiedad y permisos. |
| MAT-01 | CRUD de materias. | Nombre obligatorio hasta 150 caracteres; descripción opcional hasta 2000. |
| MAT-02 | Borrado de materia. | Confirmar que se borran también apuntes, pendientes, evaluaciones y asistencias asociados. |
| APU-01 | CRUD de apuntes de texto. | Título obligatorio hasta 200 caracteres y contenido obligatorio hasta 20000; asociación a una materia propia. |
| PEN-01 | CRUD de pendientes. | Título hasta 200 caracteres, descripción opcional hasta 2000 y fecha límite opcional. Nacen incompletos. |
| PEN-02 | Completar y reabrir pendientes. | PATCH explícito con completado true/false; un PUT de contenido no reemplaza esta operación. |
| PEN-03 | Próximos pendientes. | Consultar un rango desde/hasta y mostrar los no completados con fecha. Los pendientes sin fecha siguen visibles en su materia. |
| EVA-01 | CRUD de evaluaciones. | Nombre hasta 200 caracteres, fecha obligatoria y calificación opcional entre 0 y 10 con hasta dos decimales. Una nota 0 es válida y distinta de null. |
| ASI-01 | CRUD de asistencias. | Fecha obligatoria y estado PRESENTE, AUSENTE o JUSTIFICADA. |
| ASI-02 | Unicidad de asistencia. | Una sola asistencia por materia y fecha; informar conflicto y permitir editar el registro existente. |
| IA-01 | Preguntas desde un apunte. | Guardar primero el apunte y solicitar exactamente cinco preguntas/respuestas al endpoint de generación. |
| IA-02 | Práctica y persistencia. | Ocultar respuestas hasta que el estudiante quiera verlas e informar que las preguntas no se guardan en el servidor. |
| IA-03 | Fallos y límites. | Manejar contenido insuficiente, IA no configurada, timeout y proveedor fallido; conservar el apunte. No inventar preguntas como si fueran de la API. |
| NAV-01 | Recorrido del estudiante. | Inicio con materias y próximos pendientes, detalle de materia y editor de apunte con práctica. Formularios cortos pueden usar diálogos accesibles. |

## 2. Administración secundaria

El backend agrega STUDENT y ADMIN. Se integra después del recorrido principal; no es requisito para empezar materias y apuntes.

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| ADM-01 | Listar usuarios y estadísticas. | Usar los endpoints administrativos; no presentar un listado global de contenido privado. |
| ADM-02 | Habilitar/deshabilitar estudiantes. | PATCH con enabled booleano; manejar denegación y cuenta bloqueada. |
| ADM-03 | Respetar roles. | El registro público crea STUDENT. ADMIN se asigna fuera del frontend; no habilitar selector de rol ni acceso a materias ajenas. |

## 3. Requisitos no funcionales

- **RNF-01 · Accesibilidad:** teclado, foco visible, etiquetas y confirmaciones claras; sonido opcional y respeto por movimiento reducido. El recorrido debe poder completarse sin sonido o animación.
- **RNF-02 · Responsive:** validar a 375 px y escritorio, sin desbordamiento horizontal ni controles inaccesibles.
- **RNF-03 · Seguridad:** Bearer solo al origen de Acadezer y rutas protegidas, incluido /auth/me. No incluir secretos del proveedor de IA en Angular. No considerar un JWT decodificado prueba de autorización.
- **RNF-04 · Estado asíncrono:** carga, vacío, error y recuperación por operación; impedir doble envío y generación simultánea accidental. No reintentar automáticamente solicitudes de IA ni mutaciones.
- **RNF-05 · Fechas:** tratar LocalDate como YYYY-MM-DD, sin convertir fechas de clase o entrega en instantes UTC. Definir «hoy» en la zona del usuario.
- **RNF-06 · Mantenibilidad:** TypeScript estricto, sin any, componentes standalone, Signals, inject, control de flujo moderno y formularios reactivos tipados. Tailwind v4, sin SCSS.
- **RNF-07 · Evidencia:** build y comprobaciones relevantes por commit de código. Las pruebas no deben invocar al proveedor real de IA o tocar una base compartida accidentalmente.
- **RNF-08 · Datos locales:** no prometer recuperación de texto sin guardar ni de preguntas después de recargar. Confirmar abandono cuando corresponda.

## 4. Exclusiones y decisiones pendientes

Fuera de alcance: archivos multimedia, chatbot con historial, resúmenes, Google login, correos, grupos, docentes, notificaciones externas, calendario integrado y reglas de aprobación/promoción/asistencia mínima.

Un promedio simple puede incorporarse después, ignorando calificaciones null y sin afirmar que representa la nota oficial. No es necesario para el primer recorrido.

Pendientes antes de las etapas correspondientes:

1. Identidad visual de Acadezer. El DESIGN.md existente pertenece al proyecto anterior y no se adopta automáticamente.
2. URL real del backend desplegado y CORS de producción.
3. Política de almacenamiento del access token y limpieza de las claves heredadas durante la migración.

No se requieren cambios en el backend para el recorrido principal descrito. Cualquier diferencia con el servidor ejecutado se registra contra el commit de referencia antes de ajustar contratos.
