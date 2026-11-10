# Requisitos · Acadezer

Versión 1.1 académica · Borrador para revisión · 9 de noviembre de 2026.

Total: **38 requisitos**, distribuidos en **30 funcionales** (27 principales y 3 de administración secundaria) y **8 no funcionales**. Las operaciones de consulta, edición y eliminación tienen criterios propios; no se agrega alcance de backend para alcanzar esta cantidad.

Este documento reemplaza el alcance inmobiliario para el trabajo futuro. Define comportamiento objetivo, no funcionalidades ya integradas en Angular. El contrato base se inspeccionó en el backend [5f61e85](https://github.com/SantinoCataldo/acadezer/tree/5f61e8533471af1959efcffd4ccb806f61267df2); la renovación por cookie HttpOnly es una actualización posterior del backend.

## 1. Alcance principal

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| AUTH-01 | Registro de estudiante. | Enviar nombre, email y contraseña; manejar 201 y conflicto de email. Si el registro se confirma, intentar iniciar sesión con esas credenciales y continuar al onboarding; si el login falla, informar que la cuenta ya existe y ofrecer el acceso manual. |
| AUTH-02 | Login. | Mantener el usuario recibido en memoria y accessToken en sessionStorage, con fallback en memoria si no está disponible. El refresh token se recibe solo en cookie HttpOnly; Angular no lo lee ni lo persiste. |
| AUTH-03 | Restauración y expiración. | Validar con /auth/me cuando haya access token vigente; si falta o venció, renovar con la cookie HttpOnly y X-CSRF-Protection: 1. Ante un 401 de renovación, cerrar sesión y llevar al login sin bucles; un fallo transitorio no elimina un access token vigente. No prometer persistencia tras cerrar la pestaña. |
| AUTH-04 | Logout. | Descartar token y datos privados locales, llamar /auth/logout con credenciales y X-CSRF-Protection: 1 para revocar la sesión y limpiar la cookie HttpOnly. |
| AUTH-05 | Aislamiento de datos. | Mostrar recursos del usuario autenticado y manejar 404/403. El backend es la autoridad sobre propiedad y permisos. |
| MAT-01 | Crear y editar materias. | Nombre obligatorio hasta 150 caracteres; descripción opcional hasta 2000. Al guardar, mostrar los datos confirmados por la API. |
| MAT-02 | Borrado de materia. | Confirmar que se borran también apuntes, pendientes, evaluaciones y asistencias asociados. |
| MAT-03 | Consultar materias y su detalle. | Listar las materias propias; al seleccionar una, consultar sus datos y acceder a sus apuntes, pendientes, evaluaciones y asistencias. Si no hay materias, ofrecer crear la primera. |
| APU-01 | Crear y editar apuntes de texto. | Título obligatorio hasta 200 caracteres y contenido obligatorio hasta 20000; asociación a una materia propia. |
| APU-02 | Consultar apuntes. | Listar los apuntes de la materia seleccionada y abrir su contenido guardado. Identificar cuándo hay cambios locales que todavía no se guardaron. |
| APU-03 | Eliminar un apunte. | Pedir confirmación, eliminar únicamente el apunte elegido y actualizar su listado. Si la operación falla, conservarlo y mostrar el error. |
| PEN-01 | Crear y editar pendientes. | Título obligatorio hasta 200 caracteres, descripción opcional hasta 2000 y fecha límite opcional. Nacen incompletos. |
| PEN-02 | Completar y reabrir pendientes. | PATCH explícito con completado true/false; un PUT de contenido no reemplaza esta operación. |
| PEN-03 | Próximos pendientes. | Consultar un rango desde/hasta y mostrar los no completados con fecha. Los pendientes sin fecha siguen visibles en su materia. |
| PEN-04 | Consultar pendientes por materia. | Mostrar título, descripción, fecha cuando exista y estado de cada pendiente; incluir tanto completados como incompletos y pendientes sin fecha. |
| PEN-05 | Eliminar un pendiente. | Confirmar la eliminación del pendiente seleccionado y actualizar tanto el listado de su materia como próximos pendientes cuando esté visible. |
| EVA-01 | Crear y editar evaluaciones. | Nombre obligatorio hasta 200 caracteres, fecha obligatoria y calificación opcional entre 0 y 10 con hasta dos decimales. Una nota 0 es válida y distinta de null. |
| EVA-02 | Consultar evaluaciones. | Listar evaluaciones de una materia y consultar sus datos. Mostrar una calificación null como pendiente de calificación, sin convertirla en cero ni asignar aprobado/desaprobado. |
| EVA-03 | Eliminar una evaluación. | Confirmar y borrar la evaluación seleccionada, sin modificar otras evaluaciones o recursos de la materia. Actualizar el listado al completar la operación. |
| ASI-01 | Crear y editar asistencias. | Fecha obligatoria y estado PRESENTE, AUSENTE o JUSTIFICADA. |
| ASI-02 | Unicidad de asistencia. | Una sola asistencia por materia y fecha; informar conflicto y permitir editar el registro existente. |
| ASI-03 | Consultar asistencias. | Mostrar los registros de la materia con su fecha y estado. Una fecha sin registro no se interpreta automáticamente como ausencia. |
| ASI-04 | Eliminar una asistencia. | Confirmar la eliminación del registro elegido y retirarlo del listado al completar la operación. No reemplazarlo por una ausencia automática. |
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
- **RNF-04 · Estado asíncrono:** carga, vacío, error y recuperación por operación; impedir doble envío. Ante 429 en login, registro o preguntas, mostrar message y bloquear la acción por Retry-After (entero positivo; mínimo 1 s si falta o es inválido), sin borrar JWT ni reintentar automáticamente. La espera de concurrencia no garantiza disponibilidad al terminar. Ver [contrato 429](./docs/MANEJO_429.md).
- **RNF-05 · Fechas:** tratar LocalDate como YYYY-MM-DD, sin convertir fechas de clase o entrega en instantes UTC. Definir «hoy» en la zona del usuario.
- **RNF-06 · Mantenibilidad:** TypeScript estricto, sin any, componentes standalone, Signals, inject, control de flujo moderno y formularios reactivos tipados. Tailwind v4, sin SCSS.
- **RNF-07 · Evidencia:** build y comprobaciones relevantes por commit de código. Las pruebas no deben invocar al proveedor real de IA o tocar una base compartida accidentalmente.
- **RNF-08 · Datos locales:** no prometer recuperación de texto sin guardar ni de preguntas después de recargar. Confirmar abandono cuando corresponda.

## 4. Exclusiones y decisiones pendientes

Fuera de alcance: archivos multimedia, chatbot con historial, resúmenes, Google login, correos, grupos, docentes, notificaciones externas, calendario integrado y reglas de aprobación/promoción/asistencia mínima.

Un promedio simple puede incorporarse después, ignorando calificaciones null y sin afirmar que representa la nota oficial. No es necesario para el primer recorrido.

Pendientes antes de las etapas correspondientes:

1. Identidad visual de Acadezer: documentada en DESIGN.md; seguir puliendo durante la implementación sin reemplazar los tokens globales por colores locales.
2. URL real del backend desplegado y CORS de producción.
3. Completar validación funcional autenticada contra el despliegue y corregir los límites de login/IA pendientes en backend, según el informe de seguridad. La política local de sesión ya usa sessionStorage sin persistir el perfil y elimina selectivamente las claves heredadas.

No se requieren cambios en el backend para el recorrido principal descrito. Cualquier diferencia con el servidor ejecutado se registra contra el commit de referencia antes de ajustar contratos.
