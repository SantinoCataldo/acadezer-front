# Acadezer · Frontend

Organizador académico personal para estudiantes. Permite administrar materias, apuntes de texto, pendientes, evaluaciones y asistencias. Desde un apunte guardado, la IA genera cinco preguntas de práctica con respuestas orientativas.

Proyecto de facultad para dos integrantes. El alcance se concentra en un recorrido completo y una integración de IA de texto, sin archivos multimedia ni chatbot.

## Estado del repositorio

El nombre visible y técnico del proyecto es Acadezer. Login, registro en dos pasos, restauración de sesión, preferencias de tema y cierre de sesión están conectados al backend. Después del registro exitoso se inicia sesión y se muestra el onboarding. La ruta pública `/` contiene una landing breve; las sesiones activas van a `/estudio` (“Mi espacio”), que está protegido y ofrece cierre de sesión. Las pantallas para gestionar materias, apuntes, asistencia y evaluaciones siguen pendientes.

## Producto previsto

- Registro, login, restauración y cierre de sesión con el usuario real de la API.
- Materias con apuntes, pendientes, evaluaciones y asistencias.
- Inicio autenticado con próximos pendientes y accesos a materias.
- Calificaciones de 0 a 10, opcionales y con hasta dos decimales.
- Asistencia por fecha: presente, ausente o justificada.
- Cinco preguntas desde el contenido guardado de un apunte; las preguntas no se persisten.
- Administración básica como entrega posterior al recorrido del estudiante, aprovechando los endpoints existentes.

No se incluyen PDF, fotos, audio, video, grupos, docentes, integraciones con calendarios, publicación en redes ni reglas automáticas de aprobación.

## Stack existente

Angular 22+, standalone components, Signals, RxJS, formularios reactivos tipados, Tailwind CSS v4, Bun y Angular CLI. GSAP puede reutilizarse para interacciones puntuales. Las dependencias heredadas se evaluarán más adelante; este commit no instala ni retira paquetes.

## Ejecutar el frontend actual

Requisito: Bun compatible con `packageManager` en package.json (`bun@1.3.14`).

```sh
bun install --frozen-lockfile
bun run start
```

Angular sirve la aplicación en `http://localhost:4200`. Comandos de comprobación:

```sh
bun run build
bun run test
```

Estos comandos no acreditan que todas las pantallas de Acadezer estén integradas. **Ambos archivos de environment ya apuntan a `https://acadezer.onrender.com` por un cambio local del usuario.** La sesión usa el contrato nuevo; los servicios inmobiliarios restantes no deben usarse para probar el dominio académico.

## Backend y contrato

- [Repositorio Acadezer](https://github.com/SantinoCataldo/acadezer).
- El contrato de refresh en cookie HttpOnly es una actualización posterior comunicada por el equipo backend; el commit inspeccionado como base no lo incluía.
- Desarrollo previsto: `http://localhost:8080`; CORS del backend admite `http://localhost:4200` por defecto.
- Render respondió a las comprobaciones de salud, rechazo de acceso anónimo y CORS; falta una consulta académica autenticada para completar la validación funcional. Consultar el README del backend para Java, base de datos y variables de entorno.

El login devuelve `accessToken`, `tokenType`, `expiresIn` y `usuario`; además, el backend entrega el refresh token en una cookie `HttpOnly`, que Angular no puede leer ni guardar. El frontend mantiene el perfil en memoria y el access token en `sessionStorage` (o memoria si storage no está disponible). Si falta o vence el access token, solicita `/auth/refresh` con credenciales y `X-CSRF-Protection: 1`; el backend valida el origen y la cabecera CSRF. El logout envía `/auth/logout` con la misma protección para revocar la sesión y limpiar la cookie. CORS admite únicamente los orígenes configurados en `CORS_ORIGIN`. Las claves de IA permanecen exclusivamente en el backend.

## Documentación

- [Requisitos del producto](./requirements.md).
- [Arquitectura, contratos y validaciones](./docs/ESPECIFICACION_Y_ARQUITECTURA.md).
- [Orden de commits y criterios de salida](./docs/ROADMAP_Y_DIVISION_TAREAS.md).
- [Estado actual y acuerdos con Seba](./docs/ESTADO_Y_ACUERDOS.md).
- [Revisión de seguridad y evidencia de pruebas](./docs/REVISION_SEGURIDAD.md).
- [Manejo de HTTP 429 y contrato de límites](./docs/MANEJO_429.md).

Actualización: 10 de noviembre de 2026. El estado de pantallas implementadas y pendientes se lleva en [estado y acuerdos](./docs/ESTADO_Y_ACUERDOS.md). La evidencia histórica de las pruebas de backend/frontend y las comprobaciones de despliegue está detallada en los documentos de arquitectura y seguridad; las pruebas manuales del flujo actual de registro/login quedan pendientes de verificación del equipo.
