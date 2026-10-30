# Matchday 4.2 — actualización de partidos

## Porteros: salidas, reflejos y segundos balones

El portero ajusta su posición entre el balón y el centro de la portería. Dentro del área puede salir a cortar un regate cercano; el intento depende de su media y de la del delantero, y tiene recuperación para evitar intentos infinitos cada fotograma. Se aplica a ambos equipos y a las dos mitades. Ganar ese duelo cuenta como salida, no como parada de un disparo.

La lectura de los tiros se hace sobre la trayectoria hacia la posición real del portero. La detección recorre el tramo del balón hasta la línea de gol para que un tiro rápido alcanzable no se marque antes de resolver la parada. No devuelve balones que ya lo superaron, ni concede paradas fuera del área o a tiros por encima de su alcance. Las manos tienen alcance lateral, no atraen el balón varios metros desde delante.

Los remates centrales controlables se blocan; los potentes o que exigen estirada se desvían hacia un lado y lejos de la propia portería. El rebote sigue vivo y el rival puede rematarlo. La media influye en alcance y blocaje; la dificultad modifica de forma moderada el alcance del portero rival. Tras atrapar un balón, el reloj de recuperación se descuenta una sola vez antes del pase de salida. Los tiros dirigidos pueden buscar más las esquinas y la IA también intenta colocarlos. Las porterías conservan sus dimensiones.

Las animaciones distinguen blocaje, estirada alta, manopla y salida baja. La inclinación lateral sigue la línea de gol en WebGL y en el modo compatible. El resumen del partido muestra paradas y desvíos del portero. No se modifican cartas, monedas, progresos ni el guardado existente.

La regresión original se reproduce en `tests/goalkeepers.test.js`. Se comprueban duelos, porterías vacías, disparos rápidos a diferentes pasos físicos, salidas fuera del área, cambios de campo, dificultad, medias, pausa, rebotes y estadísticas. `node scripts/keeper-benchmark.cjs` ejecuta 120 intentos por cada uno de cinco escenarios controlados. Para comparar una revisión anterior puede pasarse la ruta a su `match-engine.js` como primer argumento.

En el escenario concreto de conducir por el primer palo y rematar desde cerca, la revisión `880205770b2844a9113a85cfd81d5783601c9a49` concedía 120 goles en 120 intentos; la corrección concede 19 y corta 101 ataques. Los 120 remates a portería vacía siguen siendo gol. Es un ensayo sintético con trayectorias repetidas, no una tasa prevista para partidos de personas ni una estadística del fútbol real.

## Correcciones previas

Corrección de teclado en PC: Espacio conserva la activación nativa de los botones enfocados durante el partido, las repeticiones y el resultado final. Con el foco en el campo mantiene el atajo de entrada.

Corrección de botones móviles: perder la captura táctil libera sprint y descarta la carga del tiro. Una liberación posterior no dispara esa carga; soltar normalmente sigue disparando una sola vez.

Corrección del joystick móvil: perder la captura del puntero libera la dirección. Pausar o iniciar una repetición también centra el control y descarta el puntero anterior; los toques durante pausa o repetición no acumulan movimiento para la reanudación.

Corrección de controles táctiles: cancelar el gesto de tiro (`pointercancel`) descarta la carga y oculta la barra de potencia. Solo una liberación normal (`pointerup`) dispara. La cancelación del sprint sigue liberándolo; una liberación tardía no recupera una carga descartada. Se reproduce y verifica en las pruebas del controlador del partido.

Esta revisión se centra en el partido 11 contra 11 y su preparación. Los mismos cambios se aplican a los encuentros jugados de carrera, Champions, UT, Draft, selecciones y partido rápido porque comparten `AuraArena`. No cambia plantillas, monedas, fichajes, clasificaciones, reglas de los modos ni el progreso por sesión.

## Presentación y gráficos

- Cámara de TV más cercana, con seguimiento y encuadre suavizados. Se pueden elegir TV, Tele cercana, Panorámica y Táctica antes del partido o recorrerlas con C y el botón de cámara.
- Un módulo de presentación compartido mantiene los encuadres y poses consistentes entre WebGL y el renderizador compatible. Adapta la distancia a la proporción de pantalla.
- Césped con bandas de corte, grano sutil, variaciones de iluminación y desgaste en el renderizador WebGL. El modo compatible también recibe textura e iluminación sobre el campo.
- Futbolistas con proporciones revisadas, articulaciones de rodilla y codo, camisetas, dorsales y diferencias de aspecto deterministas por identidad. Los cambios de jugadores actualizan también el modelo y el dorsal.
- Animaciones de carrera, golpeo, entrada, estirada y celebración. Son modelos estilizados generados localmente, no escaneos faciales ni modelos de EA.
- Uniformes alternativos con contraste cuando coinciden los colores, incluidos dos equipos de blanco. El marcador y el radar usan los colores elegidos para el partido.
- Marcador compacto, tarjeta con retrato disponible del jugador controlado, identificación del rival y radar centrado. Diseño para pantallas de escritorio, móviles y orientación horizontal.
- Ambiente de público y sonidos de golpeo/silbato sintetizados localmente. El control de sonido silencia también el ambiente.

## Jugabilidad y repeticiones

Los futbolistas aceleran, frenan y cambian de dirección de forma gradual. El balón alterna la distancia de los toques durante la conducción. Los porteros conservan la anticipación física del disparo y muestran estiradas/atajadas; el gesto no concede una parada por sí solo. Los postes y el larguero desvían impactos cercanos, en lugar de convertirlos directamente en gol o saque.

Los goles pueden mostrar una repetición de 3,2 segundos con las últimas muestras de la jugada, interpoladas a cámara lenta y con una cámara cercana. Durante ella el partido real queda detenido: no avanza su reloj ni se calculan goles o premios adicionales. Se puede pausar o saltar con el botón «Volver al directo» o Espacio. Después se conserva el gol y se reanuda el saque. No es una grabación de vídeo ni un editor de repeticiones.

La revisión sigue siendo el motor web de AURA. No incorpora Unreal Engine ni los modelos 3D de EA; toma como dirección visual una transmisión de fútbol y mantiene controles propios.

## Rendimiento y comprobación

El renderizador WebGL comparte geometría y materiales de los modelos. Las sombras dinámicas se reservan a calidad alta. El modo compatible limita el dibujo a 30 fps, conserva los pasos físicos del partido y reutiliza el fondo sin reasignar su imagen en cada fotograma; reduce ordenaciones y proyecciones repetidas del público. La resolución depende de la calidad seleccionada y de la densidad de pantalla.

Las pruebas cubren movimiento y frenado, pausa, postes, cámaras, interpolación sin modificar resultados, cambios de identidad, repeticiones automáticas y omitidas, cierre y registro único del resultado. Se comprueba geometría finita en WebGL para las tres calidades y todos los encuadres, y dibujo compatible para escritorio, móvil vertical y horizontal. La revisión visual en el navegador de esta sesión utiliza el modo compatible: el entorno no ofrece WebGL, por lo que la escena WebGL se valida mediante pruebas de construcción y proyección, sin afirmar una medición visual en GPU real.
