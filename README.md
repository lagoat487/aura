# AURA FC27 ⚽

Primer prototipo de videojuego original de **modo carrera de fútbol**, jugable desde el navegador.

## Cómo jugar en GitHub Codespaces

1. Abre tu Codespace y espera a que aparezcan `index.html`, `styles.css` y `game.js`. Si el Codespace estaba abierto antes de la subida, abre Terminal y ejecuta `git pull`.
2. En la terminal ejecuta:
   ```bash
   python3 -m http.server 8000
   ```
3. Abre la pestaña **Puertos (PORTS)** de Codespaces.
4. En el puerto **8000**, selecciona **Open in Browser / Abrir en navegador**.
5. ¡A jugar! La partida se guarda automáticamente en el navegador.

> Si ya está ocupado el puerto 8000, puedes usar otro, por ejemplo `python3 -m http.server 8080`.

## Funciones implementadas

- Inicio visual inspirado en juegos deportivos (diseño original).
- Crear una carrera con 12 clubes **ficticios**.
- Liga de demostración de 22 jornadas, clasificación y calendario.
- Simulación de partidos con marcadores, goleadores y recompensas.
- Plantillas con medias, potencial, posiciones y edades.
- Comprar y vender jugadores, con presupuesto actualizado.
- Entrenar promesas para subir su media.
- Guardado y reanudación automática mediante `localStorage`.
- Interfaz adaptable a computadora y móvil.

## Límites actuales

- **No** hay partidos 3D controlables, gráficos fotorrealistas, licencias oficiales, competiciones completas ni juego multijugador.
- Las clasificaciones de clubes rivales son estimaciones de demostración, no un calendario de resultados coherente entre todos los clubes.
- Solo hay una carrera guardada por navegador. Borrar los datos del navegador borra el progreso.
- Los nombres de los equipos y jugadores son ficticios. No está afiliado a EA SPORTS ni a sus marcas.

## Próximas mejoras

1. Calendario de liga completo y resultados consistentes.
2. Formaciones y tácticas editables.
3. Contratos y negociación de fichajes.
4. Copas y torneos de eliminación.
5. Guardados múltiples, exportación e importación.
6. Prototipo 3D real con balón, campo y controles.
7. Controles DualSense cuando el navegador sea compatible.

## Estructura

- `index.html`: página del juego.
- `styles.css`: apariencia responsive.
- `game.js`: simulación, mercado, cantera, renderizado y guardado.

No requiere npm ni instalar dependencias. Puedes abrir `index.html` directamente, pero un servidor local es preferible.
