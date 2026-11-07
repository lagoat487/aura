# AURA VISION 9.3 — cámara de estadio

La imagen inicial de AURA es una referencia artística. Esta revisión añade una vista diagonal de estadio durante el partido real; no reproduce el fotorealismo ni las caras escaneadas del concepto.

## Uso

En Preparar partido, **🏟 Imagen inicial** selecciona calidad Alto, noche despejada y cámara **Estadio · Imagen inicial**. **✦ AURA VISION · Máximo** selecciona Ultra con la misma cámara. **⚽ A ras de campo** conserva la vista cercana de la versión anterior. C recorre las seis cámaras. En Estadio y Campo, teclado, controles táctiles y mandos mueven y apuntan según la pantalla. Los ajustes guardados anteriormente siguen siendo válidos; el equipo UT y los datos de sus eventos no se modifican.

## Renderizado

- Cámara de banda a 19,8 metros en horizontal, diagonal hacia la portería y con espacio por delante del balón; se aleja en vertical para conservar un encuadre jugable.
- Los personajes WebGL reciben sombras sobre su propia malla. El mapa de sombras se concentra en la zona del balón y se desplaza en pasos de texel para reducir el temblor. Los materiales conservan tejido con relieve y añaden variaciones locales en el modelo compartido, sin aumentar sus llamadas de dibujo.
- Césped con tonos oliva, manchas suaves y variaciones de desgaste deterministas. El modo compatible usa el mismo tratamiento sobre su textura.
- Red compatible más densa en Alto y Ultra, laterales completos, postes con grosor según perspectiva y deformación breve al marcar.
- Marcador y radar ajustados a la vista de estadio; se mantiene la tarjeta del jugador y su indicador sobre el campo.
- Las dos entradas cargan módulos y estilos por rutas nuevas para impedir mezclas con archivos antiguos en la caché de GitHack.

## Alcance de la verificación

La suite completa pasa **517 pruebas** y el empaquetado verifica **771 archivos de ejecución**. Se revisó el partido compatible en navegador, también en un marco móvil de 390 × 844 píxeles, incluido el pase táctil y la separación del radar respecto de los botones. La verificación incluye encuadres en ambas mitades y junto a las cuatro esquinas del campo, pantallas verticales y horizontales, controles de teclado, táctiles y dos mandos, materiales finitos y normalizados de los 22 futbolistas y las cuatro calidades del renderizador. La compilación visual de shaders y el rendimiento en el iPhone físico requieren GPU; el navegador de este entorno no permite crear un contexto WebGL. El modo compatible sí permite inspeccionar el partido en el navegador.
