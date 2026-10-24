# AURA — Catálogo mundial opcional

## Datos de origen y alcance

El prototipo enlaza, sin almacenar la base dentro del repositorio, un CSV del proyecto externo
[EA FC ANALYSIS](https://github.com/LakshmiKanth11/EA_FC_ANALYSIS), descrito por su
autor como una instantánea del **12 de septiembre de 2026** de jugadores y medias.
Es una fuente de terceros; no garantiza equipos, traspasos, licencias o valoraciones
actualizados durante toda la temporada 2026/27. No debe etiquetarse como una
integración oficial con EA SPORTS.

El lector selecciona los siguientes campos: identificador, nombre, edad aproximada
por fecha de nacimiento, posición, club, liga, categoría, GRL y nacionalidad.
Agrupa clubes por **liga y categoría**; ofrece una competición siempre que tenga
al menos dos clubes con once jugadores del CSV. Los clubes con menos de once
jugadores no se presentan como participantes completos de esa liga.

El archivo CSV es remoto y puede dejar de existir o bloquearse. Si falla,
siguen disponibles la LaLiga y la liga de exhibición incluidas en el código.
La interfaz muestra el número real de ligas, clubes y jugadores aceptados después
de procesar el catálogo, **no una cifra total prometida**.

## Partidas, jugadores y fotos

Al crear una carrera se almacenan únicamente las plantillas de la competición
elegida, no miles de equipos. La instantánea de sus clubes se guarda con el
calendario; una partida iniciada con catálogo externo puede reabrirse offline
sin modificar su tabla, jugadores o fichajes. Al cargar una partida existente,
la actualización **no sustituye** los jugadores previamente almacenados.

La app transforma posiciones y GRL de la fuente al modelo AURA. El potencial,
precio y sueldo se calculan como parámetros de videojuego; no son las cifras
oficiales de clubes o jugadores. La formación es orientativa.

El retrato usa un enlace derivado del ID del jugador hacia un CDN ajeno
(SoFIFA, miniatura de la edición 26), y solo aparece si ese servicio permite
la carga. Si no hay imagen, se muestra un icono de respaldo. **No hay caras
escaneadas 3D**, ni garantía de imagen para todos los jugadores. No se copian
fotografías ni escudos a este repositorio; antes de usar el proyecto de modo
comercial se deben verificar y obtener los permisos correspondientes.

## Límites del motor

Las ligas del CSV usan calendario equilibrado de ida y vuelta generado por AURA:
no copian el calendario oficial. Usan clasificación 3/1/0, desempate por
diferencia de goles y goles a favor. Aún no se implementan reglas específicas
por liga ni ascensos, descensos, copas nacionales o internacionales. Los
jugadores pueden ser fichados desde el buscador mundial por nombre o club,
incluso si ese club no participa en la competición actual.

## Pruebas

`npm test` ejecuta pruebas sin acceso a la red. Además de los casos existentes,
se prueban el importador CSV con campos entrecomillados y saltos de línea,
clubes y jugadores reales, generación de ligas, búsqueda de futbolistas y
recuperación de una competición externa offline.
