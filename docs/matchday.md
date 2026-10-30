# Matchday 4.2 — actualización de partidos

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
