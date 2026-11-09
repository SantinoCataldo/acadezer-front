# Acadezer · Frontend

Organizador académico personal para estudiantes. Permite administrar materias, apuntes de texto, pendientes, evaluaciones y asistencias. Desde un apunte guardado, la IA genera cinco preguntas de práctica con respuestas orientativas.

Proyecto de facultad para dos integrantes. El alcance se concentra en un recorrido completo y una integración de IA de texto, sin archivos multimedia ni chatbot.

## Estado del repositorio

Este frontend está en transición desde InmoMarketing. **La sesión, sus modelos, el interceptor, los guards y el servicio administrativo tienen adaptación a Acadezer.** Los demás recursos académicos, identidad, rutas y pantallas siguen pendientes. La migración se organiza en commits separados; consultar el historial para identificar cada entrega.

El nombre técnico `inmo` permanece en package.json y angular.json por ahora. El router actual solo contiene Home y un comodín. No se considera implementada una pantalla por estar descrita en estos documentos.

## Producto previsto

- Registro, login y restauración de sesión con el usuario real de la API.
- Materias con apuntes, pendientes, evaluaciones y asistencias.
- Inicio con próximos pendientes y accesos a materias.
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
- [Contrato inspeccionado: commit 5f61e8533471af1959efcffd4ccb806f61267df2](https://github.com/SantinoCataldo/acadezer/tree/5f61e8533471af1959efcffd4ccb806f61267df2).
- Desarrollo previsto: `http://localhost:8080`; CORS del backend admite `http://localhost:4200` por defecto.
- Render respondió a las comprobaciones de salud, rechazo de acceso anónimo y CORS; falta una consulta académica autenticada para completar la validación funcional. Consultar el README del backend para Java, base de datos y variables de entorno.

El login devuelve `accessToken`, `tokenType`, `expiresIn` y `usuario`. **Acadezer no tiene refresh token.** El frontend mantiene el perfil en memoria y el token en sessionStorage (o memoria si storage no está disponible); una recarga valida al usuario con `/auth/me`. Al vencer el token se vuelve a iniciar sesión. Las claves de IA permanecen exclusivamente en el backend.

## Documentación

- [Requisitos del producto](./requirements.md).
- [Arquitectura, contratos y validaciones](./docs/ESPECIFICACION_Y_ARQUITECTURA.md).
- [Orden de commits y criterios de salida](./docs/ROADMAP_Y_DIVISION_TAREAS.md).
- [Revisión de seguridad y evidencia de pruebas](./docs/REVISION_SEGURIDAD.md).
- [Manejo de HTTP 429 y contrato de límites](./docs/MANEJO_429.md).

Actualización: 9 de noviembre de 2026. Pasaron 47 pruebas aisladas del backend revisado y 55 del frontend. Las comprobaciones anónimas de Render pasaron. El nuevo contrato de límites fue comunicado por backend, pero su implementación y despliegue aún no se verificaron; ver el documento de HTTP 429.
