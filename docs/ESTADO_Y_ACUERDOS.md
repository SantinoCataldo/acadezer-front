# Acadezer · Estado del frontend y acuerdos de trabajo

Actualizado el 10 de noviembre de 2026. Este documento registra la implementación actual, los pendientes reales y la división acordada para dos personas. Los requisitos siguen siendo el criterio de aceptación; una pantalla parcial no cuenta como requisito terminado.

## Estado implementado

- La sesión académica usa access token en `sessionStorage` (con fallback en memoria), refresh token en cookie HttpOnly y protección CSRF para renovar y cerrar sesión. Login, registro y logout están conectados al backend.
- Login y registro usan el layout compartido de autenticación y el componente común de campos. El registro tiene dos pasos, detecta conflictos `409` de correo, intenta iniciar sesión después del alta y continúa al onboarding.
- La apariencia ofrece siete colores tonales, modo monocromo y modos claro, oscuro o sistema. Los componentes consumen tokens semánticos para superficies, texto, acento y contraste.
- El onboarding de primera entrada tiene cinco pasos, selección de tema y progreso animado. En los cambios de paso se anima solo el contenido central; marca, contador y controles inferiores permanecen quietos.
- `/` es una landing pública breve con enlaces a registro y login. `/estudio` presenta “Mi espacio”, exige sesión y ofrece cerrar sesión. Login y registro rechazan sesiones existentes mediante `guestGuard`.
- El cierre de sesión y el onboarding están conectados a la navegación. El navbar y el footer siguen siendo base compartida para el trabajo de navegación.

La última compilación Angular completó correctamente. Mostró una advertencia de presupuesto: el bundle inicial supera el límite configurado por aproximadamente 10 kB. Las pruebas del flujo de login/registro y onboarding quedan para verificación manual del equipo; no se declaran aprobadas por el build.

## Pendiente de producto

Todavía no se implementaron las operaciones de materias, apuntes, pendientes, evaluaciones, asistencias ni generación de preguntas desde la interfaz. Por eso `MAT-*`, `APU-*`, `PEN-*`, `EVA-*`, `ASI-*`, `IA-*` y el recorrido completo `NAV-01` siguen pendientes en [requirements.md](../requirements.md). “Mi espacio” es el punto de entrada preparado para ese trabajo; su estado vacío no simula datos del backend.

## División acordada

### Seba: navegación general y shell compartido

Responsabilidad principal:

- Navbar, footer y distribución compartida de páginas.
- Navegación móvil, enlaces y estados de ruta activa.
- Mostrar cada elemento de navegación solo cuando tenga un destino existente y coherente con sesión pública/privada.
- Ajustar reflujo responsive del shell sin alterar el layout específico de autenticación u onboarding.
- Revisar los requisitos `NAV-*` aplicables, anotar qué criterio cumple cada cambio y qué falta, y señalar evidencia de la revisión manual.

No duplicar el logout que ya está en “Mi espacio”, ni crear enlaces muertos a materias/apuntes que todavía no tienen pantalla. Coordinar antes de cambiar `app.routes.ts`, guards, `AuthService`, el layout auth o tokens globales: son superficies compartidas con el trabajo de autenticación y tema.

### Vos: producto, autenticación y verificación manual

- Mantener integración de sesión, pantallas de login/registro, renovación/logout y manejo de errores.
- Mantener tokens, paleta, selector de tema y estados visuales accesibles.
- Mantener onboarding y su destino de primera entrada.
- Coordinar cualquier cambio de shell o rutas que afecte al área autenticada.
- Probar manualmente los flujos de login, registro, renovación/logout y onboarding; registrar qué pasó y cualquier error reproducible.
- Priorizar el alcance funcional pendiente y revisar los commits antes de integrarlos o publicarlos.

### Forma de colaborar

1. Cada integrante crea una rama propia desde el `main` actualizado y trabaja en una responsabilidad acotada.
2. Antes de tocar archivos compartidos, revisar `git status`, conversar el alcance y evitar editar la misma superficie en paralelo.
3. Usar commits pequeños con prefijos convencionales (`feat`, `fix`, `docs`, `style`); stagear archivos explícitos y no incluir cambios ajenos.
4. En cada entrega, informar archivos, requisitos revisados, estado de build y pruebas manuales pendientes. No afirmar que un requisito se cumple solo porque compila.
5. No agregar dependencias, rutas sin pantalla ni datos de ejemplo presentados como reales. Seguir [DESIGN.md](../DESIGN.md), [requirements.md](../requirements.md) y la arquitectura vigente.
6. Integrar a `main` después de revisar el diff y coordinar la publicación; no hacer force push ni reescribir historial.

## Próximo paso sugerido

Seba puede comenzar por el navbar/footer y navegación móvil con enlaces existentes. La implementación CRUD de materias todavía no tiene responsable confirmado; definir quién la toma antes de empezar. No inferir que queda incluida en “navegación general”.
