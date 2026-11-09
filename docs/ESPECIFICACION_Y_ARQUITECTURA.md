# Acadezer · Arquitectura y contrato frontend

Versión 3.0 · 9 de noviembre de 2026. Reemplaza la especificación inmobiliaria. Alcance funcional: [requirements.md](../requirements.md). Implementación por etapas: [roadmap](./ROADMAP_Y_DIVISION_TAREAS.md).

## 1. Estado y fuentes

Frontend base: main, commit dd4cd83. Tiene infraestructura Angular y código de InmoMarketing que aún no se adapta. El router solo declara Home y comodín. Los cambios locales de diseño y layout no forman parte del commit documental.

Backend revisado estáticamente: [Acadezer 5f61e8533471af1959efcffd4ccb806f61267df2](https://github.com/SantinoCataldo/acadezer/tree/5f61e8533471af1959efcffd4ccb806f61267df2). Se leyeron controladores, DTO, servicios, seguridad y pruebas relevantes; no se ejecutaron pruebas ni se verificó despliegue. Los contratos siguientes describen ese código, no una certificación del servidor en producción.

Los documentos diferencian siempre comportamiento previsto, código existente y validación ejecutada. El backend de referencia entrega el dominio académico; este repositorio conserva temporalmente nombres, endpoints y dependencias del dominio anterior.

## 2. Dominio y límites

```text
Usuario
  └── Materias
        ├── Apuntes
        ├── Pendientes
        ├── Evaluaciones
        └── Asistencias
```

Cada recurso se consulta con la identidad autenticada, no con un usuarioId arbitrario enviado por Angular. ADMIN no puede leer ni modificar contenido académico ajeno. Borrar una materia elimina su contenido asociado en una transacción: el frontend debe comunicarlo antes de confirmar.

Las preguntas se generan a partir del apunte persistido y no se guardan en base de datos. El texto editado localmente necesita guardarse antes de generar. No hay historial de conversación ni evaluación automática del estudiante.

## 3. Estructura y responsabilidades

Para mantener pequeños los commits iniciales, reutilizar las ubicaciones actuales de infraestructura:

```text
src/app/
├── core/
│   ├── models/          # contratos compartidos de Acadezer
│   ├── services/        # sesión, transporte HTTP y estado transversal
│   ├── interceptors/    # autorización y errores de transporte
│   └── guards/          # navegación según sesión y rol
├── components/
│   ├── layout/          # adaptar el layout existente en su propia etapa
│   └── ui/              # piezas sin conocimiento del negocio
├── features/
│   ├── auth/
│   ├── subjects/
│   ├── notes/
│   ├── tasks/
│   ├── exams/
│   ├── attendance/
│   └── admin/
└── pages/home/          # página heredada hasta construir inicio académico
```

Las carpetas de features son objetivo, no directorios para crear vacíos en el commit de modelos. Cada una agrupa páginas y componentes que realmente necesite. Los modelos específicos de pantalla viven con su funcionalidad y combinan DTO sin inventar campos recibidos. Evaluar mover acceso a datos a features cuando haya consumidores reales; no bloquear la migración con una reorganización masiva.

Usar Signals para estado de interfaz y computed para derivaciones; RxJS para HttpClient y flujos asíncronos. Los servicios de recursos devuelven observables tipados; los componentes no conocen detalles de Bearer o URLs base. Formularios reactivos tipados y consultas/rutas lazy. No crear capas que solo reenvíen métodos ni incorporar un store global adicional sin necesidad.

## 4. Modelos de transporte

Mantener campos JSON del backend en español y roles literales exactos.

| Modelo de respuesta | Campos |
| --- | --- |
| UserResponse | id, nombre, email, role: STUDENT o ADMIN, enabled: boolean |
| AuthResponse | accessToken, tokenType, expiresIn en segundos, usuario: UserResponse |
| SubjectResponse | id, nombre, descripcion nullable |
| NoteResponse | id, titulo, contenido, materiaId |
| TaskResponse | id, titulo, descripcion nullable, fechaLimite nullable, completado, materiaId |
| ExamResponse | id, nombre, fecha, calificacion nullable, materiaId |
| AttendanceResponse | id, fecha, estado: PRESENTE/AUSENTE/JUSTIFICADA, materiaId |
| PracticeQuestionsResponse | preguntas: lista de cinco objetos con pregunta y respuesta |
| ErrorResponse | status, message, path, timestamp |

Fechas LocalDate como strings YYYY-MM-DD. Calificación como number o null. No reemplazar valores null por 0; optional y nullable tienen significados distintos. No reutilizar UserResponse ni roles del dominio inmobiliario por coincidencia de nombre.

Las validaciones de request se detallan en [requisitos](../requirements.md). Los request de recursos hijos no reciben materiaId en el body: lo recibe la ruta de creación. TaskRequest no recibe completado; se modifica mediante su PATCH específico.

## 5. Autenticación y ciclo de sesión

| Método y ruta | Entrada y salida |
| --- | --- |
| POST /auth/register | nombre, email, password → 201 con UserResponse; no token |
| POST /auth | email, password → 200 con AuthResponse |
| GET /auth/me | Bearer obligatorio → UserResponse vigente |
| GET /health | Público → estado del proceso; no comprueba IA ni base de datos continuamente |

No existe /auth/refresh ni refreshToken en Acadezer. Eliminar el flujo heredado durante el commit de servicios/interceptores, sin trasladar su cola de renovación.

El login obtiene el perfil del campo usuario; no reconstruirlo a partir de claims supuestos. Al recuperar una sesión local, consultar /auth/me y distinguir comprobación pendiente, sesión válida y sesión ausente. Un error transitorio de red no es prueba de credenciales inválidas. Al vencer el token o recibir 401 de una ruta protegida, limpiar sesión y redirigir al login una sola vez. Un 401 de login muestra error de credenciales; un 403 no inicia renovación.

Logout es local. La API no revoca el JWT mediante un endpoint de logout. La política definitiva de almacenamiento del access token debe documentarse al implementarlo; localStorage no es almacenamiento inmune a XSS. Limpiar selectivamente las claves heredadas de sesión, sin borrar preferencias o almacenamiento ajeno.

El interceptor debe adjuntar Bearer solo a rutas protegidas del origen configurado, incluido GET /auth/me. Excluir POST /auth, POST /auth/register y GET /health. No usar una regla que excluya indiscriminadamente todo /auth/**.

## 6. Endpoints académicos

| Recurso | Listar/crear | Consultar/actualizar/eliminar |
| --- | --- | --- |
| Materias | GET/POST /api/materias | GET/PUT/DELETE /api/materias/{id} |
| Apuntes | GET/POST /api/materias/{materiaId}/apuntes | GET/PUT/DELETE /api/apuntes/{id} |
| Pendientes | GET/POST /api/materias/{materiaId}/pendientes | GET/PUT/DELETE /api/pendientes/{id} |
| Evaluaciones | GET/POST /api/materias/{materiaId}/evaluaciones | GET/PUT/DELETE /api/evaluaciones/{id} |
| Asistencias | GET/POST /api/materias/{materiaId}/asistencias | GET/PUT/DELETE /api/asistencias/{id} |

Creaciones: 201 con DTO; actualizaciones: DTO; eliminaciones: 204 sin cuerpo. Las listas no están paginadas en el contrato inspeccionado. Un recurso ajeno se maneja como no disponible sin revelar contenido privado.

- PATCH /api/pendientes/{id}/completado con cuerpo `{ "completado": true }` o false.
- GET /api/pendientes/proximos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD devuelve pendientes no completados en el rango; hasta no puede ser anterior a desde.
- Una asistencia duplicada por materia/fecha es conflicto de negocio. Ofrecer corregir el registro existente.

No enviar IDs de otro recurso al editar para intentar cambiar su propietario. No construir consultas globales para cada hijo si la API requiere una materia concreta.

## 7. IA de práctica

POST /api/apuntes/{id}/preguntas, sin contenido nuevo en el body, devuelve:

```json
{
  "preguntas": [
    { "pregunta": "Pregunta de ejemplo", "respuesta": "Respuesta orientativa" }
  ]
}
```

El ejemplo muestra la estructura de un elemento; la respuesta válida real contiene cinco. El backend verifica propiedad antes de llamar al proveedor y valida estructura y cantidad. La configuración inspeccionada usa un proveedor compatible con Chat Completions, Groq por defecto; no implica una sesión de ChatGPT del usuario.

- 422: material insuficiente; el cliente del backend rechaza textos menores a 80 caracteres tras strip y también contempla insuficiencia detectada por el modelo.
- 503: IA sin configurar o solicitud interrumpida.
- 504: timeout.
- 502: conexión/proveedor fallido o respuesta inválida/incompleta.

No reintentar automáticamente. Deshabilitar generación duplicada mientras está pendiente y permitir un nuevo intento explícito. Mostrar carga indeterminada; no fabricar porcentajes. Conservar el apunte si falla y aclarar que las preguntas son temporales, con respuestas orientativas. El control de 80 caracteres por sí solo no garantiza material suficiente.

Claves y modelo se configuran en backend; Angular solo llama a Acadezer. No guardar credenciales en environment, prompts ni logs del frontend.

## 8. Administración secundaria

- GET /api/admin/users: listado seguro de usuarios.
- PATCH /api/admin/users/{id}/enabled con enabled booleano.
- GET /api/admin/stats: estadísticas globales agregadas.

El registro público siempre crea STUDENT; ADMIN se asigna fuera del frontend. No implementar CRUD administrativo de InmoMarketing, selector público de rol ni acceso a apuntes de terceros. Ocultar rutas y acciones sin permisos y manejar 403 del servidor.

## 9. Pantallas y motion

Objetivo: login, registro, inicio académico, detalle de materia con cuatro secciones y editor de apunte con práctica. No necesita una pantalla diferente para cada operación CRUD: formularios cortos pueden presentarse en diálogos accesibles. Administración va después.

Mantener componentes visuales independientes del dominio. La migración no necesita recrear todos los ejemplos FLIP. Recuperar y evaluar las piezas históricas antes de integrarlas; no asumir que están en main. Sonido opcional y movimiento reducido deben acompañar las interacciones, sin bloquear el recorrido funcional.

La identidad anterior, incluyendo DESIGN.md y assets, no se renombra o elimina en este commit. Definir dirección de Acadezer antes de adaptar el layout y los textos públicos.

## 10. Migración y validación

Orden acordado: documentación → modelos → servicios/conexión → interceptores → guards → identidad/rutas/pantallas. El código inmobiliario permanece hasta adaptar sus consumidores, sin eliminar archivos usados por otras capas en un commit intermedio.

Cada commit de código debe compilar. Los modelos académicos pueden añadirse primero sin retirar aún los tipos heredados que necesitan los servicios actuales. Registrar qué es transitorio y retirar lo heredado en un commit de limpieza cuando no tenga consumidores. No usar casts, mocks de producción o métodos vacíos para ocultar incompatibilidades.

Verificaciones futuras: login/registro reales, /auth/me protegido, expiración sin refresh, Bearer ausente en terceros, aislamiento entre usuarios, nota 0 frente a null, fechas sin desfase, asistencia duplicada, borrado de materia, y errores de IA sin perder el apunte. Pruebas automatizadas con transporte/proveedor simulado, sin llamadas facturables.

La URL de Acadezer y CORS de despliegue deben verificarse antes de conectar el frontend. Los environment actuales todavía apuntan a InmoMarketing y se cambiarán en su etapa, no en documentación.
