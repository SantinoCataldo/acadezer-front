# Acadezer · Revisión y correcciones de seguridad

Actualizado el 9 de noviembre de 2026. Resultados de revisión y correcciones, organizados por responsabilidad en el historial de Git.

## Resultado y alcance

Backend revisado: [5f61e8533471af1959efcffd4ccb806f61267df2](https://github.com/SantinoCataldo/acadezer/tree/5f61e8533471af1959efcffd4ccb806f61267df2). Frontend: base 942aa65 más correcciones locales. Se revisaron autorización, sesión, aislamiento y pruebas relevantes. No es una auditoría completa de infraestructura, dependencias o historial de secretos.

La integración mencionada por el usuario es Render, no Resend. El despliegue usa Neon. No se cambió esa configuración, no se creó ni borró información de la base compartida y no se llamó al proveedor de IA.

S-01, S-02 y S-03 están corregidos con pruebas. El equipo backend informó la implementación local de S-04/S-05 y su contrato 429: falta revisar esa versión y comprobar su despliegue autorizado. Ver [manejo de 429](./MANEJO_429.md). Las pantallas y rutas académicas siguen pendientes: los guards implementados deberán conectarse al agregarlas.

## 1. Render y evidencia sobre persistencia

Después de los timeouts de la revisión inicial, el nuevo intento obtuvo:

| Comprobación | Resultado |
| --- | --- |
| GET /health | 200, cuerpo con status UP |
| GET /auth/me sin token | 401, error sin datos privados |
| GET /api/materias sin token | 401, error sin datos privados |
| GET /api/admin/users sin token | 401, error sin datos privados |
| OPTIONS /api/materias desde http://localhost:4200 | 200; allow-origin exacto y Authorization permitido |
| OPTIONS desde https://untrusted.example | 403, Invalid CORS request |
| POST /auth, un único intento con cuenta ficticia inexistente | 401, Credenciales inválidas |

Las respuestas HTTPS incluyen HSTS, nosniff, denegación de frames y cabeceras de no-cache. No se hicieron pruebas de fuerza bruta ni llamadas costosas.

El login de la implementación revisada consulta UserRepository antes de devolver credenciales inválidas; esa respuesta es evidencia compatible con persistencia operativa a través de la API. No acredita por sí sola que la instancia use un proveedor concreto de base ni sustituye un login correcto y una consulta académica autenticada. /health solo verifica el proceso. La configuración privada de Neon, sus permisos y backups no se inspeccionaron.

Pendiente para completar la validación funcional de despliegue: con una cuenta de prueba autorizada, comprobar login, /auth/me y lectura académica. No se solicitaron contraseñas ni se crearon cuentas de revisión en producción.

## 2. Evidencia automatizada

### Backend: 47 casos aprobados

En la copia temporal del código revisado se ejecutó `mvnw.cmd -o -q -Dspring.profiles.active=test test` con código de salida 0.

| Suite | Casos | Fallos/errores |
| --- | ---: | ---: |
| AcademicApiTests | 18 | 0 |
| AdminApiTests | 8 | 0 |
| JwtServiceTests | 3 | 0 |
| PracticeAiClientTests | 16 | 0 |
| PracticeQuestionServiceTests | 2 | 0 |

El perfil test existente usa H2 aislada y proveedor IA simulado; no se modificó el proyecto para sustituir Neon. El primer intento restringido falló por bloqueo de loopback; el reintento con permisos pasó. La suite crea/borra tablas de prueba y no debe ejecutarse sobre la base compartida.

Se comprueba aislamiento entre propietarios y también frente a ADMIN; bloqueo de cuentas; JWT vencido, falsificado o de tipo distinto; registro sin elevación de rol; validaciones; consulta de propiedad antes de IA y errores del proveedor.

### Frontend: 55 casos aprobados

Comandos: `bun run test --watch=false` y `bun run build`.

- 25 casos de autenticación/interceptor: token limitado al origen, /auth/me, claves heredadas, perfil local falsificado, sesión vencida o inválida, fallos transitorios, logout durante solicitudes pendientes, 401 concurrentes y respuestas atrasadas de otra sesión.
- 8 casos de guards: restauración pendiente, sesión ausente, fallo transitorio, roles válidos/incorrectos y rutas de invitados.
- 2 casos de aplicación; se corrigió el test generado obsoleto de «Hello, inmo» para comprobar la navegación lazy real a Home, sin cambiar la interfaz.
- 20 casos adicionales de 429 y doble envío; la utilidad y login/registro respetan Retry-After sin modificar sesión ni reintentar. El consumidor de preguntas podrá usar el mismo controlador cuando se cree su pantalla.

Antes de corregir, las pruebas reprodujeron el envío del token a terceros y la aceptación de un perfil local falsificado. Ahora pasan. Todo HTTP de estas pruebas es simulado; no usa cuentas de Neon ni IA real.

## 3. Hallazgos de frontend corregidos localmente

### S-01 · Bearer limitado al origen y rutas de Acadezer

El interceptor compara URL/origen exactos y solo autoriza /api y sus recursos, además de /auth/me. No envía credenciales a login, registro, health, hosts que solo comparten prefijo o terceros. Un 403 no inicia logout ni renovación. Un 401 de una sesión vieja no destruye una sesión nueva.

### S-02 · Sesión validada y perfil no persistido

Login acepta el usuario real de Acadezer y valida la estructura de respuesta. Al recuperar token, se consulta /auth/me antes de dar por autenticado al usuario. Los guards esperan esa comprobación; una indisponibilidad transitoria cancela el acceso protegido sin eliminar el token o confundirla con credenciales inválidas.

El token se guarda en sessionStorage para sobrevivir recargas de la pestaña, con fallback en memoria si el navegador bloquea storage. El perfil permanece en memoria y se ignoran/eliminan las claves antiguas inmo_access_token, inmo_refresh_token e inmo_user_profile. Se conservan preferencias ajenas como el tema. Al cerrar la pestaña termina esta persistencia; no se promete sesión entre reinicios del navegador.

SessionStorage sigue siendo accesible a JavaScript: no es protección frente a XSS. Mantener escape de contenido y no renderizar apuntes mediante HTML sin sanitizar cuando se creen esas pantallas. El backend siempre decide los permisos; decodificar exp en Angular solo sirve para gestionar la expiración local.

### S-03 · Renovación protegida por cookie HttpOnly

El refresh token no se expone a JavaScript ni se guarda en localStorage/sessionStorage: viaja en cookie HttpOnly. El frontend envía credenciales y `X-CSRF-Protection: 1` en `/auth/refresh` y `/auth/logout`; el backend verifica origen y CSRF. Una renovación compartida evita solicitudes duplicadas. Los errores 403 y transitorios no borran un access token vigente; un 401 de refresh termina la sesión. El logout invalida respuestas pendientes para que no restauren la sesión después de salir.

Los DTO de sesión y roles ya usan STUDENT/ADMIN y enabled. Se adaptó el servicio administrativo a users, enabled y stats para no dejar endpoints inmobiliarios bajo los nuevos tipos. Los demás modelos/servicios de negocio y la interfaz se migrarán por separado.

## 4. Cambios que corresponden al backend

### S-04 · Limitar intentos de autenticación

No se encontró throttling de login/registro en el código revisado; no se ha acreditado protección equivalente en otra capa.

Implementar límites configurables por cuenta y origen, con tratamiento especial de registro y login. Al superar el límite, responder 429 y Retry-After. Normalizar email igual que AuthService y no confiar en cabeceras de IP suministradas por el cliente fuera de proxies explícitamente confiables. Mantener respuestas genéricas de credenciales y no registrar contraseñas/tokens.

Pruebas esperadas: límite alcanzado, recuperación tras la ventana, separación entre usuarios/orígenes y ausencia de regresión en el login válido. No bloquear permanentemente cuentas de terceros por intentos anónimos.

Referencia: [OWASP, login throttling](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling).

### S-05 · Cuota y concurrencia de IA por usuario

El endpoint valida propietario y el cliente tiene timeout/límite de salida, pero no se encontró cuota por estudiante ni límite de generaciones concurrentes.

Aplicar el control en servidor, después de validar identidad/propiedad y antes de llamar al proveedor: cuota configurable por usuario y límite de concurrencia, con liberación del permiso también al fallar o agotar timeout. Responder 429 al alcanzar el límite, sin llamar al proveedor. Mantener respuestas controladas y no reintentar automáticamente. Si se despliega más de una instancia, el mecanismo no debe asumir un único proceso. Configurar un límite global de gasto en el proveedor cuando esté disponible.

Pruebas esperadas sin proveedor real: solicitudes concurrentes del mismo usuario, usuarios independientes, cuota agotada y permiso liberado después de un error. El bloqueo de doble clic en Angular no reemplaza estos controles.

Referencia: [OWASP API4, consumo de recursos](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/).

## 5. Estado para continuar

Los cambios corrigen la base de seguridad de la sesión antes de conectar pantallas. Los modelos de sesión, sus servicios y el interceptor se agrupan porque la renovación con cookie HttpOnly requiere coordinación entre esas capas; el refresh token no forma parte de los modelos Angular. Guards y prueba de navegación se separan. Consultar el historial para identificar las entregas. Los 38 requisitos siguen siendo 30 funcionales y 8 no funcionales. El manejo de 429 tiene nuevas modificaciones locales aún sin commit ni push.

Pendientes: completar modelos/servicios académicos, conectar guards a rutas, implementar pantallas y verificar publicación de S-04/S-05 antes de uso público amplio. Su implementación local fue comunicada por el equipo backend; no se da por desplegada. La configuración de Neon permanece intacta.
