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
- Calendario completo generado al crear la temporada. **No reproduce las fechas ni el orden del calendario oficial**.
- Cada avance simula toda la jornada y guarda sus resultados. Clasificación, calendario y balance de tu club salen de los mismos marcadores: 3 puntos por victoria, 1 por empate y 0 por derrota.
- Consulta los diez partidos de cada jornada de LaLiga desde Calendario, o los doce de exhibición. Clasificación muestra todos los participantes.
- Desempates de LaLiga por enfrentamientos directos completos, diferencia de goles general y goles a favor, con miniliga para empates múltiples. Hasta completar los duelos directos se usa diferencia de goles general. No se modelan tarjetas de juego limpio ni un desempate en campo neutral: una igualdad total se ordena por ID de club.
- Cierre de temporada con campeón, archivo del balance anterior y comienzo de otra temporada con tu plantilla y presupuesto.

También incluye mercado de fichajes y ventas, cantera, desarrollo de jugadores y guardado local.

## Compatibilidad de guardados

Se mantiene la clave `aura-fc27-save-v1` de `localStorage`. Las nuevas carreras usan el formato **version 2**, con competición, participantes, calendario y marcadores persistidos.

Un guardado **version 1** conserva su temporada de exhibición, jornadas, resultados, plantilla y presupuesto. Sus tablas rivales siguen siendo estimaciones y se indica en pantalla, porque esos guardados no contienen resultados de otros clubes. Al terminar esa temporada se archiva su balance y se permite comenzar el calendario completo de una competición que admita a tu club. No se inventan marcadores históricos ni se reinicia la temporada al cargarla.

Solo hay una carrera activa por navegador. **Nueva carrera** pide confirmar antes de sustituirla. Borrar los datos del navegador borra el progreso.

## Límites actuales y siguiente prioridad

Los jugadores son ficticios; medias, valores, recompensas y presupuestos son datos de juego, no cifras oficiales. No incluye escudos ni licencias oficiales y no está afiliado a EA SPORTS.

Todavía no hay otras ligas nacionales completas, Copa del Rey, Champions League, Libertadores, Sudamericana, ascensos/descensos, clasificación continental, partidos 3D controlables o multijugador. Las siguientes temporadas mantienen los mismos participantes de referencia.

La siguiente extensión es completar otra liga nacional y sus reglas en el catálogo, y después añadir un estado de eliminatorias y cupos de clasificación. Cambiar únicamente los nombres de la exhibición no implementa esas competiciones. Ver [diseño, fuentes y alcance](docs/competitions.md).

## Estructura y comprobaciones

| Archivo | Responsabilidad |
| --- | --- |
| `clubs.js` | Catálogo de clubes e IDs estables; datos de juego separados de reglas. |
| `competitions.js` | Definiciones, calendarios, resultados, validación y clasificación; usable en navegador y Node. |
| `game.js` | Carrera, simulación, mercado, cantera, interfaz y compatibilidad de guardados. |
| `index.html`, `styles.css` | Carga de scripts en orden, selector de competición y presentación. |
| `tests/` | Propiedades del calendario, tablas, empates, persistencia y regresiones de carrera. |

Para comprobar el proyecto, con **Node 22 o superior**: `npm test` o `node --test`. No requiere `npm install`. GitHub Actions ejecuta estas pruebas en pushes y pull requests.
