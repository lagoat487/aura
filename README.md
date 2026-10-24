# AURA FC27 ⚽

Prototipo original de modo carrera de fútbol, jugable desde el navegador.

## Cómo jugar en GitHub Codespaces

1. Abre tu Codespace. Si estaba abierto antes de la actualización, ejecuta `git pull` en la rama que quieras probar.
2. En la terminal ejecuta `python3 -m http.server 8000`.
3. En **Puertos (PORTS)**, selecciona **Open in Browser / Abrir en navegador** para el puerto **8000**.
4. Elige una competición y un club. La partida se guarda automáticamente en ese navegador.

Si el puerto está ocupado puedes usar `python3 -m http.server 8080`. No hace falta instalar dependencias para jugar; también se puede abrir `index.html` directamente.

## Competiciones implementadas

- **LaLiga**: 20 clubes por nombre, con participantes de referencia de la edición **2026/27**; 38 jornadas, 380 partidos, 19 de local y 19 de visitante por club.
- **Liga internacional de exhibición**: los 24 clubes originales, 46 jornadas y 552 partidos. Es una competición ficticia separada.
- **Catálogo mundial opcional**: al abrir el juego con conexión, `world.js` descarga un CSV externo de plantillas del **12 de septiembre de 2026**. Agrupa competiciones por liga y categoría, y permite elegir cualquiera que tenga al menos dos clubes con once jugadores. **El número exacto de ligas y jugadores cargados aparece en pantalla**; no se promete que estén todas las ligas ni todos los futbolistas del mundo.
- **Plantillas**: cuando el catálogo proporciona jugadores para un club, muestra sus nombres, posiciones y valoraciones de la instantánea y busca un retrato en un servicio externo. Las imágenes pueden faltar; no son escaneos 3D. Los clubes sin correspondencia conservan las plantillas ficticias.
- **Buscador mundial de mercado**: permite encontrar futbolistas externos por nombre o club. El valor, salario y potencial usados para fichajes son cálculos ficticios, no importes oficiales.
- Calendario completo generado al crear la temporada. **No reproduce las fechas ni el orden del calendario oficial**.
- Cada avance simula toda la jornada y guarda sus resultados. Clasificación, calendario y balance de tu club salen de los mismos marcadores: 3 puntos por victoria, 1 por empate y 0 por derrota.
- Consulta los diez partidos de cada jornada de LaLiga desde Calendario, o los doce de exhibición. Clasificación muestra todos los participantes.
- Desempates de LaLiga por enfrentamientos directos completos, diferencia de goles general y goles a favor, con miniliga para empates múltiples. Hasta completar los duelos directos se usa diferencia de goles general. No se modelan tarjetas de juego limpio ni un desempate en campo neutral: una igualdad total se ordena por ID de club.
- Cierre de temporada con campeón, archivo del balance anterior y comienzo de otra temporada con tu plantilla y presupuesto.

También incluye mercado de fichajes y ventas, cantera, desarrollo de jugadores y guardado local.

## Compatibilidad de guardados

Se mantiene la clave `aura-fc27-save-v1` de `localStorage`. Las nuevas carreras usan el formato **version 2**, con competición, participantes, calendario y marcadores persistidos.

Un guardado **version 1** conserva su temporada de exhibición, jornadas, resultados, plantilla y presupuesto. Sus tablas rivales siguen siendo estimaciones y se indica en pantalla, porque esos guardados no contienen resultados de otros clubes. Al terminar esa temporada se archiva su balance y se permite comenzar el calendario completo de una competición que admita a tu club. No se inventan marcadores históricos ni se reinicia la temporada al cargarla.

Las nuevas carreras de ligas externas guardan una **instantánea del catálogo de clubes** junto al calendario, para que su temporada pueda recuperarse sin conexión si los datos remotos dejan de estar disponibles. El guardado incluye sus jugadores y sus fichajes.

Solo hay una carrera activa por navegador. **Nueva carrera** pide confirmar antes de sustituirla. Borrar los datos del navegador borra el progreso. La carga externa no reemplaza automáticamente la plantilla de una partida guardada.

## Límites actuales y siguiente prioridad

Sin conexión, el juego conserva LaLiga y exhibición con jugadores de demostración. Con conexión puede cargar las plantillas externas, pero la cobertura y su disponibilidad dependen del catálogo remoto. Los participantes de cada liga externa representan una **instantánea del proveedor**, no una lista verificada de inscripciones oficiales; sus calendarios se generan para el videojuego. Las reglas de desempate de ligas externas se aproximan con puntos, diferencia de goles y goles a favor, sin reglas regionales específicas.

**No incluye licencias oficiales, escudos, caras 3D, partidos 3D controlables, multijugador, copas, Champions League, Libertadores, Sudamericana, ascensos/descensos ni clasificación continental**. Las siguientes temporadas mantienen los participantes de su liga seleccionada.

La mejora siguiente es implementar copas y clasificación continental, junto a reglas específicas por país. Solo añadir los nombres de clubes no equivale a reproducir sus competiciones oficiales.

La base de valoraciones enlazada es un proyecto tercero: [EA FC ANALYSIS](https://github.com/LakshmiKanth11/EA_FC_ANALYSIS). El enlace al CSV no implica una licencia para redistribuirlo; los rostros se solicitan al CDN de SoFIFA y pueden estar ausentes o sujetos a condiciones de uso. Para una distribución pública/comercial hay que verificar derechos sobre marcas, datos e imágenes. Cambiar únicamente los nombres de la exhibición no implementa esas competiciones. Ver [diseño, fuentes y alcance](docs/competitions.md).

## Estructura y comprobaciones

| Archivo | Responsabilidad |
| --- | --- |
| `clubs.js` | Catálogo de clubes e IDs estables; datos de juego separados de reglas. |
| `competitions.js` | Definiciones, calendarios, resultados, validación y clasificación; usable en navegador y Node. |
| `game.js` | Carrera, simulación, mercado, cantera, interfaz y compatibilidad de guardados. |
| `world.js` | Importación opcional de ligas/plantillas de terceros, búsqueda y perfiles de jugadores. |
| `index.html`, `styles.css` | Carga de scripts en orden, selector de competición y presentación. |
| `tests/` | Propiedades del calendario, tablas, empates, persistencia y regresiones de carrera. |

Para comprobar el proyecto, con **Node 22 o superior**: `npm test` o `node --test`. No requiere `npm install`. GitHub Actions ejecuta estas pruebas en pushes y pull requests. Las pruebas no requieren descargar datos ni imágenes en tiempo de ejecución. Ver [catálogo mundial y sus límites](docs/world-catalog.md).
