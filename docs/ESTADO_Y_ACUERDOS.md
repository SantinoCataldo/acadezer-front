# Acadezer · Estado del frontend y acuerdos de trabajo

Actualizado el 12 de noviembre de 2026. Este documento registra la implementación actual, los cambios integrados en `main`, los pendientes reales y la división acordada para el equipo. Los requisitos siguen siendo el criterio de aceptación; una pantalla parcial no cuenta como requisito terminado.

## Cambios recientes integrados en `main` (12 de noviembre de 2026)

Se integraron en `main` los siguientes avances clave desarrollados por el equipo:

1. **Componentes UI Reutilizables:**
   - **`DatePickerComponent` (`src/app/components/ui/date-picker/`):** selector de fecha accesible con grilla de calendario interactiva, navegación de meses y años, teclado y tokens de diseño Acadezer.

2. **Gestión de Materias (`src/app/features/subjects/`):**
   - Modales de creación y edición de materias con días de cursada estilizados (`.schedule-day-pill`), feedback visual en tema claro y oscuro, y estado vacío visible (`.schedule-empty-card`).
   - Modal de confirmación para eliminar materia con diseño adaptado a la paleta semántica.
   - Detalle de materia (`subject-detail`) con tarjeta compacta de tareas pendientes (`SubjectRecentTasks`) limitada a las 3 tareas más próximas con micro-interacción hover en flechas.

3. **Módulo de Tareas y Pendientes (`src/app/features/tareas/`):**
   - Rediseño completo del tablero de gestión de tareas (`tareas-list`): tabs de filtrado (todas, pendientes, completadas), badges de prioridad y fecha, animaciones GSAP en cambios de estado, y modal de creación/edición (`tarea-form`).

4. **Evaluaciones (`src/app/features/evaluaciones/`):**
   - Incorporación de modelos y `EvaluacionService` para la gestión completa de evaluaciones (calificaciones, fechas, tipos y ponderaciones).

5. **Apuntes y Práctica con IA (`src/app/features/subjects/components/note-practice-dialog/` y `note-editor/`):**
   - Editor de apuntes enriquecido (`RichTextEditor`) con conteo de palabras y caracteres.
   - Generación de flashcards y preguntas de autoevaluación con IA (`NotePracticeDialog`).
   - **Transición fluida de altura (GSAP):** animación suave al cambiar de pregunta o alternar "Mostrar respuesta" / "Ocultar", evitando saltos bruscos de tamaño.
   - Persistencia temporal en `sessionStorage` para no perder las preguntas al cerrar accidentalmente el diálogo.
   - Alertas contextuales estilizadas sin bordes duros y respetando paletas de tema claro y oscuro.

6. **Sistema de Temas y Estilos Globales (`src/styles.css`):**
   - Refinamiento de contraste y jerarquía de superficies para el tema monocromo y escala de grises.
   - Reglas específicas para componentes interactivos en tema claro evitando pérdidas de visibilidad en hovers.

---

## Estado implementado

- **Sesión y Autenticación:** La sesión académica usa access token en `sessionStorage` (con fallback en memoria), refresh token en cookie HttpOnly y protección CSRF para renovar y cerrar sesión. Login, registro, recuperación y logout están conectados al backend.
- **Apariencia y Accesibilidad:** Siete colores tonales, modo monocromo y modos claro, oscuro o sistema. Los componentes consumen tokens semánticos para superficies, texto, acento y contraste.
- **Onboarding:** Flujo de primera entrada con cinco pasos, selección de tema y progreso animado.
- **Materias (`MAT-*`):** Listado de materias, creación, edición, borrado y vista de detalle con accesos directos a apuntes y tareas.
- **Apuntes (`APU-*`):** Editor de apuntes de materia con guardado, control de cambios y advertencia antes de salir.
- **Práctica con IA (`IA-*`):** Generación de 5 preguntas de autoevaluación basadas en el apunte guardado, revelado de respuestas y animación responsiva.
- **Tareas y Pendientes (`PEN-*`):** Tablero interactivo con filtros, prioridades, fechas de vencimiento y sincronización con materias.
- **Evaluaciones (`EVA-*`):** Capa de modelos y servicios lista para consumo.

---

## Pendiente de producto

- **Asistencias (`ASI-*`):** Pantallas y servicios de registro de asistencias por fecha y materia.
- **Evaluaciones UI (`EVA-*`):** Conectar pantallas y vistas de evaluaciones con el servicio `EvaluacionService`.
- **Administración (`ADM-*`):** Panel secundario de administración de usuarios y estadísticas del sistema.
- **Recorrido Guiado Completo (`NAV-01`):** Verificación e integración continua del flujo académico de punta a punta.

---

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
