# Acadezer · Roadmap y orden de commits

9 de noviembre de 2026. Referencias: [requisitos](../requirements.md), [arquitectura y contrato](./ESPECIFICACION_Y_ARQUITECTURA.md), [README](../README.md).

## 1. Regla de trabajo

Avanzar por partes con commits de responsabilidad clara. La secuencia acordada es documentación, modelos, servicios, interceptores y guards. Después se adaptan identidad, rutas y pantallas. No mezclar cambios locales de diseño, skills o assets con integración de API.

Antes de cada push, presentar al usuario los commits y el destino y pedir su aprobación explícita. Esperar la respuesta antes de publicar. Una autorización anterior no habilita pushes futuros.

Los modelos y servicios inmobiliarios ya tienen commits en el historial. Estos nuevos commits describirán la migración académica; no reescribirán ni dividirán retroactivamente ese historial.

La [revisión de seguridad](./REVISION_SEGURIDAD.md) registra 47 pruebas de backend y 35 de frontend aprobadas. S-01 a S-03 se corrigieron en sesión, DTO, interceptor y guards. Render respondió a salud, rechazo de acceso anónimo y CORS; falta el recorrido académico autenticado. La base del despliegue sigue siendo Neon. S-04 y S-05 requieren límites de login e IA en backend.

Para publicar esta corrección, se agrupan modelos de sesión, servicios e interceptor: retirar refreshToken requiere cambios coordinados para mantener compilable cada commit. Guards y prueba de navegación van separados. Esto no marca como terminada la migración de modelos o servicios de materias y sus recursos, que sigue pendiente.

## 2. Commit 1: documentación

Mensaje previsto: `docs: define Acadezer scope and frontend migration plan`.

- [x] Reemplazar README inmobiliario por presentación y estado real de Acadezer.
- [x] Crear requirements.md con alcance principal, administración secundaria y exclusiones.
- [x] Actualizar arquitectura con contratos del backend 5f61e85.
- [x] Definir este orden de trabajo y dependencias entre commits.
- [x] Verificar diff y enlaces locales; limitar este commit a documentación.

Salida: producto y contrato documentados. No implica integración implementada ni pruebas de código ejecutadas. El hash del commit se informa al cerrar la tarea, sin escribir un hash circular en el propio archivo.

## 3. Commit 2: modelos

Mensaje sugerido: `feat(models): add Acadezer API contracts`.

- [ ] Tipos académicos de usuario, autenticación, materia, apunte, pendiente, evaluación, asistencia, preguntas y errores.
- [ ] Roles STUDENT/ADMIN, estados de asistencia y fechas YYYY-MM-DD.
- [ ] Distinguir valores null y campos opcionales; calificación 0 válida.
- [ ] No reutilizar contratos inmobiliarios ni introducir refreshToken en modelos académicos.
- [ ] Mantener temporalmente tipos heredados necesarios para consumidores actuales, sin colisiones de exports.
- [ ] Compilar antes del commit; revisar que solo cambien modelos y exports correspondientes.

Salida: contratos disponibles para servicios nuevos, con código existente aún compilable.

## 4. Commit 3: servicios y conexión

Mensaje sugerido: `feat(services): integrate Acadezer authentication and resources`.

- [ ] Confirmar URL local/desplegada de la API y CORS. Actualizar environments en este commit y mencionarlo en el mensaje/cuerpo.
- [ ] Adaptar almacenamiento de sesión: accessToken y usuario; limpiar claves de sesión heredadas selectivamente.
- [ ] Implementar login, registro, /auth/me y logout local, sin refresh.
- [ ] Implementar servicios de materias y sus cuatro recursos hijos, completado y próximos pendientes.
- [ ] Implementar generación de preguntas con apunte guardado y sin retry automático.
- [ ] Tipar errores y respuestas vacías; no crear datos ficticios para reemplazar endpoints ausentes.
- [ ] Adaptar consumidores mínimos de la sesión que sean necesarios para compilar, identificando el alcance en el commit.
- [ ] Mantener las rutas de producto pendientes; verificar llamadas mediante pruebas HTTP relevantes y build.

Dependencia: el interceptor legado consume refreshToken(), que deja de existir en el contrato académico. Para conservar commits compilables, se permite un ajuste mínimo de compatibilidad a ese consumidor dentro de esta entrega, documentado en el cuerpo del commit. No mantener un método refresh falso. La implementación completa y sus pruebas quedan en el commit de interceptores.

Si el alcance resulta demasiado grande, dividir sesión y recursos en commits consecutivos dentro de esta etapa, sin mezclar pantallas. La separación por responsabilidad importa más que un número fijo de commits.

## 5. Commit 4: interceptores

Mensaje sugerido: `fix(http): align authorization and errors with Acadezer`.

- [ ] Bearer solo al origen configurado y rutas protegidas, incluido GET /auth/me.
- [ ] Excluir POST /auth, POST /auth/register y GET /health.
- [ ] Retirar definitivamente cola, semáforos y reintentos de refresh heredados.
- [ ] Manejar 401 y expiración sin bucles ni múltiples redirecciones; 403 no renueva sesión.
- [ ] Distinguir demora de red y error de credenciales; no afirmar cold start solo por un temporizador.
- [ ] Concurrencia del aviso de demora y limpieza de estado en finalización/cancelación.
- [ ] Pruebas de alcance Bearer, /auth/me, 401 de login frente a ruta privada y ausencia de retries de IA; build.

Salida: transporte compatible con la sesión de Acadezer, sin comportamiento inmobiliario residual de autenticación.

## 6. Commit 5: guards

Mensaje sugerido: `feat(guards): protect Acadezer routes by session and role`.

- [ ] Adaptar authGuard y roleGuard a sesión académica y STUDENT/ADMIN.
- [ ] Incorporar guestGuard para login/registro.
- [ ] Esperar restauración de sesión cuando corresponda; no decidir por un perfil local sin validar.
- [ ] Usar redirecciones del router sin ciclos; no asumir dashboard o login existentes antes de agregar rutas.
- [ ] Verificar sesión ausente, válida, expirada, restauración pendiente y rol incorrecto; build.

Salida: guards disponibles para las rutas académicas futuras; el backend mantiene autorización efectiva.

## 7. Entregas posteriores

1. **Identidad y navegación:** resolver diseño de Acadezer; adaptar nombre técnico/público, layout y rutas. Preservar trabajo local existente hasta revisarlo.
2. **Primer recorrido:** registro → login → crear materia → guardar apunte → generar cinco preguntas y revelar respuestas.
3. **Organización:** pendientes por materia e inicio con próximos pendientes.
4. **Seguimiento:** evaluaciones y asistencias; validaciones y conflictos visibles.
5. **Administración secundaria:** usuarios, bloqueo/habilitación y estadísticas existentes.
6. **Limpieza:** retirar modelos/servicios/pipes/dependencias inmobiliarios sin consumidores. Registrar cada eliminación y verificar build.
7. **Pulido:** responsive, teclado, estados y motion de los recorridos reales; no ampliar el laboratorio antes de terminarlos.

## 8. Coordinación entre dos integrantes

Propuesta, sin asignación de nombres: una persona puede concentrarse en integración y sesión; la otra, en pantallas de materias y contenido una vez fijados los DTO. Ambos revisan contratos, integran y preparan la defensa. También pueden dividir por funcionalidades según la consigna de la materia.

No agregar como requisito del frontend trabajo extra de backend que no necesite el recorrido principal. No fijar plazos sin estimación del equipo. No ejecutar en paralelo cambios incompatibles sobre router, sesión o exports compartidos.

## 9. Cierre de cada commit

- Revisar diff y seleccionar rutas explícitas; evitar git add . con trabajo local mezclado.
- Documentación: comprobar coherencia, enlaces y git diff --check; no requiere ejecutar IA ni base de datos.
- Código: build y pruebas relevantes al comportamiento modificado; señalar lo que no pudo verificarse.
- Mantener el commit compilable; si una dependencia exige un ajuste en otra capa, explicarlo o dividir mejor el cambio.
- No publicar, desplegar ni reescribir historial como parte de un commit local.

Estado al preparar el primer commit: solo cambia documentación. Las siguientes etapas permanecen pendientes.
