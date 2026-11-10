# Acadezer — Sistema visual

Guía para mantener coherentes las pantallas de la aplicación, empezando por acceso, registro y controles de apariencia. Prioriza claridad para estudiar, contraste y una respuesta táctil consistente.

## Identidad

Acadezer organiza materias, apuntes, asistencia, notas y práctica. La interfaz combina superficies tranquilas con un acento elegido por cada persona. Los elementos de marca usan el símbolo de libro y el nombre `acadezer.`; evitar recursos visuales propios de inmobiliarias o pedidos comerciales.

## Color y tema

La interfaz consume tokens semánticos (`--theme-canvas`, `--theme-surface`, `--theme-foreground`, `--theme-muted`, `--theme-accent`, `--theme-accent-soft`, `--theme-on-accent` y `--theme-border`). No asignar colores fijos a títulos, botones o campos cuando exista el token correspondiente.

- Hay siete tonos de acento y una opción monocroma, dispuestos en dos filas de cuatro.
- El modo puede ser claro, oscuro o seguir el sistema. La selección se conserva entre visitas.
- En monocromo claro: fondo `#FBF9FC`, superficie principal `#F5F3F6`.
- En monocromo oscuro: fondo `#000000`, superficie principal `#101012`.
- El texto mantiene contraste legible en los dos modos. El acento identifica el foco, la selección y la acción principal.
- Los botones principales, controles activos y marcadores usan el primario tonal generado por Material 3. El texto sobre esos acentos elige blanco o casi negro por contraste; superficies y estados secundarios conservan los tonos coordinados de la paleta. El rojo activo es `#DB3443` para permitir texto blanco con buen contraste.
- Los swatches empiezan circulares; el seleccionado se transforma en un cuadrado redondeado con una marca de selección. Esta forma acompaña el estado hasta que se elige otro color.
- El texto seleccionado usa el acento activo como fondo y `--theme-on-accent` como texto, para conservar contraste al cambiar paleta o modo.

## Tipografía e iconos

Usar Inter para toda la interfaz y Material Symbols Rounded / Outlined para iconos. Mantener títulos contenidos, contraste alto y texto en español rioplatense. Los iconos funcionales deben tener una etiqueta accesible; no usar un icono como pista de una acción inexistente.

## Componentes

- Campos con borde de estilo Material, etiqueta persistente que flota al enfocar o completar, ayuda y error junto al campo. El fondo de la etiqueta debe coincidir con la superficie que la contiene.
- Botones y controles táctiles con un área mínima de 44 × 44 px. Las acciones principales usan el acento y el texto correspondiente (`--theme-on-accent`). Los estados deshabilitados no responden al hover ni a la presión.
- Los enlaces que visualmente funcionan como botones comparten esa misma respuesta de hover y presión.
- Evitar bordes y sombras decorativos alrededor del panel completo de autenticación. Usar separación, superficie y radio para construir jerarquía.
- El selector de tema permanece compacto al cerrarse y abre su panel anclado al botón. Tiene entrada y salida coherentes.
- Formularios conservan los valores cuando hay errores y presentan el estado de carga en la acción que los envía.
- Tras crear una cuenta, el frontend intenta iniciar sesión con las credenciales recién enviadas y abre el onboarding; al terminar, la persona llega a “Mi espacio”. Si falla el inicio automático, confirma que la cuenta ya existe y ofrece ir al login.
- La ruta raíz `/` es la landing pública. El espacio privado se presenta como “Mi espacio” y usa `/estudio`; requiere sesión. El acceso y el registro redirigen allí cuando ya hay una sesión activa.

## Composición de acceso y registro

- En ventanas amplias, el panel de presentación queda a la izquierda y el formulario a la derecha. El formulario se mantiene legible en el centro de su columna. Se omiten las etiquetas pequeñas decorativas sobre los títulos.
- Por debajo de 768 px, el contenido se apila y reduce el peso del panel visual para priorizar el formulario.
- El panel de presentación explica el flujo con tres etapas: Materias, Apuntes y Preguntas. La etapa activa avanza en un loop breve con una descripción; no agrega flechas que aparenten navegación.
- “Volver al inicio” va en la esquina superior izquierda del área del formulario, con una flecha hacia la izquierda.
- Al pasar de login a registro, las rutas cambian sin una transición que cubra toda la página. Cada vista puede animar su panel de entrada.

## Onboarding

- El recorrido de primera entrada tiene cinco pasos breves: bienvenida, materias, apuntes, preguntas y elección de tema.
- Cada paso explica una parte real del flujo de Acadezer con una vista previa propia; no usar bloques genéricos repetidos.
- Fondo, superficies, texto, progreso y acciones consumen los tokens del tema elegido. La paleta ofrece los mismos siete acentos y la opción monocroma que el selector global.
- El avance y el cierre animan solo el contenido central, elemento por elemento de arriba hacia abajo con desplazamiento y blur sutiles. Marca, contador y controles inferiores permanecen quietos; las barras superiores llenan o descargan su progreso. La vista previa del flujo puede animarse en loop; `prefers-reduced-motion` la deja estática.
- En móvil el contenido se apila, la paleta queda en dos filas de cuatro y las acciones mantienen un área táctil cómoda.

## Movimiento e interacción

Todos los botones siguen la misma respuesta física:

- Con mouse, hover contrae el control apenas a `scale(0.99)`.
- Mientras se presiona con mouse o tacto, crece apenas a `scale(1.01)` y vuelve a su estado al soltar.
- La respuesta usa `cubic-bezier(0.22, 1, 0.36, 1)` y dura alrededor de 160 ms. Los controles deshabilitados no escalan.
- El botón flotante del tema tiene una respuesta un poco más visible: `scale(0.96)` al hover y `scale(1.03)` al presionarlo.
- Los swatches mantienen además su morph de círculo a cuadrado redondeado. El hover y la presión siguen la respuesta común de los botones.

La presentación de acceso entra una vez con un desplazamiento breve. El loop de las etapas se detiene para quien prefiere movimiento reducido.

Respetar `prefers-reduced-motion`: quitar desplazamientos, escalas y loops; dejar el contenido final visible. No animar el fondo ni toda la página durante la navegación. Un elemento visual no debe sugerir interacción si no tiene acción.

## Revisión al implementar

Comprobar contraste en los dos modos, selección de todas las paletas, teclado y foco visible, estados de carga/error, presión de botones en táctil, y el reflujo alrededor de 375 px, 768 px y ventanas medianas. Verificar que la selección de texto sigue el tema y que el panel de etapas no desplaza el formulario.
