# Acadezer · Frontend

Organizador académico personal para estudiantes. Permite administrar materias, apuntes de texto, pendientes, evaluaciones y asistencias. Desde un apunte guardado, la IA genera cinco preguntas de práctica con respuestas orientativas.

Proyecto de facultad para dos integrantes. El alcance se concentra en un recorrido completo y una integración de IA de texto, sin archivos multimedia ni chatbot.

## Estado del repositorio

Este frontend está en transición desde InmoMarketing. **La documentación ya describe Acadezer; el código todavía conserva el dominio inmobiliario.** Los modelos, servicios, interceptores, guards, identidad y conexión con la nueva API se adaptarán en commits separados.

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

Estos comandos no acreditan que Acadezer esté integrado. **Ambos archivos de environment todavía apuntan al backend inmobiliario.** La URL de Acadezer se configurará en el commit de servicios/conexión; no usar las operaciones heredadas para probar el dominio académico.

## Backend y contrato

- [Repositorio Acadezer](https://github.com/SantinoCataldo/acadezer).
- [Contrato inspeccionado: commit 5f61e8533471af1959efcffd4ccb806f61267df2](https://github.com/SantinoCataldo/acadezer/tree/5f61e8533471af1959efcffd4ccb806f61267df2).
- Desarrollo previsto: `http://localhost:8080`; CORS del backend admite `http://localhost:4200` por defecto.
- La URL desplegada no se verificó. Consultar el README del backend para Java, base de datos y variables de entorno.

El login devuelve `accessToken`, `tokenType`, `expiresIn` y `usuario`. **Acadezer no tiene refresh token.** Al vencer el token se debe volver a iniciar sesión. `GET /auth/me` requiere Bearer y permite recuperar el usuario vigente. Las claves de IA permanecen exclusivamente en el backend.

## Documentación

- [Requisitos del producto](./requirements.md).
- [Arquitectura, contratos y validaciones](./docs/ESPECIFICACION_Y_ARQUITECTURA.md).
- [Orden de commits y criterios de salida](./docs/ROADMAP_Y_DIVISION_TAREAS.md).

Actualización documental: 9 de noviembre de 2026. Se revisó código del backend; no se ejecutaron sus pruebas ni se validó un despliegue durante esta revisión.
