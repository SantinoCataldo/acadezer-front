# Acadezer · Manejo de límites HTTP 429

Contrato comunicado por el equipo backend el 9 de noviembre de 2026. La implementación de límites está local en el backend y **todavía no está desplegada**. No se verificó su código nuevo ni se forzaron límites contra Render. Las respuestas exitosas y los DTO no cambian.

## Contrato

Aplica a POST /auth, POST /auth/register y POST /api/apuntes/{id}/preguntas:

- Leer Retry-After como segundos enteros positivos; si falta o es inválido, esperar al menos 1 segundo.
- Mostrar el message del cuerpo ErrorResponse y deshabilitar la acción mientras espera o tiene una petición en curso.
- Un 429 no borra JWT ni cierra sesión. Se conserva el manejo de 401 y 403.
- No reintentar automáticamente; terminado el tiempo, el usuario decide si vuelve a intentar.
- El backend expone Retry-After mediante CORS. La espera de concurrencia de 1 segundo no garantiza que luego haya disponibilidad: otra respuesta 429 reinicia el bloqueo.

## Implementación Angular

`src/app/core/services/request-action.ts` exporta `createRequestAction()`. Se crea dentro del contexto de inyección del componente o servicio propietario y expone:

| Miembro | Uso |
| --- | --- |
| pending() | Hay una petición en curso. |
| remainingSeconds() | Segundos restantes del bloqueo. |
| errorMessage() | Mensaje del backend o mensaje genérico si el cuerpo no lo trae. |
| disabled() | Bloquear botón durante petición o cooldown. |
| run(() => observable) | Ejecutar una petición por suscripción; bloquear duplicados sin enviarlos. |

El helper no suscribe, no reintenta y no modifica sesión. El consumidor maneja next/error normalmente. Una ejecución bloqueada completa sin emitir ni hacer HTTP. El propietario libera temporizadores y cancela solicitudes pendientes al destruirse.

AuthService.login() y register() ya usan este control. Sus estados están disponibles en `loginAction` y `registerAction`; no volver a envolver esas llamadas con otro controlador de acción.

Las pantallas aún no existen. Al construirlas, enlazar el botón a `auth.loginAction.disabled()` o `auth.registerAction.disabled()`, mostrar su errorMessage como texto y mostrar remainingSeconds cuando sea positivo. No usar innerHTML para mostrar mensajes del servidor.

Para preguntas, usar un controlador en el contenedor de práctica y ejecutar dentro de run la llamada del futuro servicio de apuntes. Compartir ese controlador entre las acciones de los apuntes visibles del mismo usuario: la cuota se comparte entre apuntes. Evitar crear uno por clic o por botón para eludir la espera. El backend seguirá siendo la autoridad sobre cuotas y concurrencia. No se agregó un servicio de IA o una pantalla ficticia para esta adaptación.

La cuenta regresiva se basa en una fecha límite, no en restar uno por tick; al reanudar una pestaña retrasada se calcula el tiempo real restante. La disponibilidad final solo la determina el servidor.

## Límites predeterminados del backend, pendientes de publicación

| Acción | Límite comunicado |
| --- | --- |
| Login | 10 intentos por cuenta y 100 por IP cada 15 minutos |
| Registro | 5 intentos por cuenta y 30 por IP cada hora |
| IA | 20 intentos admitidos por usuario cada hora, compartidos entre apuntes |
| IA simultánea | 1 solicitud por usuario y 2 por instancia |

Según el contrato comunicado:

- Apunte ajeno/inexistente: 404 antes del límite; sin autenticación: 401.
- Un 429 no llama al proveedor. Rechazos por concurrencia no consumen cuota.
- Llamadas admitidas con error/timeout sí cuentan. IA sin configurar o texto insuficiente local no consumen cuota.
- Las cuentas no se deshabilitan. Los contadores están en memoria, se reinician con el proceso y son independientes por instancia.

Estos valores son configuración del servidor, no constantes de Angular. El frontend obedece la cabecera que reciba.

## Validación

`bun run test --watch=false`: 55 pruebas aprobadas, incluyendo 20 casos nuevos de 429 y dobles envíos. Cubren mensajes, cabeceras inválidas, espera sin retry, 429 repetido por concurrencia, cancelación, limpieza al destruir, JWT conservado y controles separados de login/registro. Las peticiones son simuladas; no usan Neon ni IA real.

Pendiente de integración: conectar los estados a botones reales y, después del despliegue autorizado del backend, verificar que Retry-After sea legible desde el origen real del frontend. No provocar abuso de login o gastos de IA en producción como prueba.
