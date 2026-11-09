# AURA 9.9 · Jugabilidad ProVision

Adaptación al navegador de la lógica del ZIP `ProVisionFootball-main.zip` proporcionado por el usuario. AURA conserva los siete modos, enlace principal, jugadores y formatos de guardado. Sigue utilizando Three.js y su renderizado compatible; no ejecuta Unreal Engine ni incluye un ejecutable de Windows.

## Cambios jugables

- Aceleración limitada, frenado, giro y energía de sprint compartidos entre once contra once y Calle/Volta.
- Velocidades de carrera, pase y tiro convertidas de los centímetros del original a metros. Los suplentes conservan sus atributos; se usa la valoración si no hay ritmo, pase o tiro independientes.
- Conducción gradual del balón y mayor separación al correr. Gravedad y rebotes ajustados, conservando la detección continua de porteros, postes y goles de AURA.
- Perseguidor y cobertura distintos por equipo, revisados cada cuarto de segundo. Segunda presión y salida del portero mientras se mantiene pulsado el control.
- Barrida con desplazamiento físico, incluso antes de llegar al balón. Los saques preparan las posiciones caminando.
- Tiros con carga y suelta por teclado y mando. Perder el balón, pausar o desconectar el mando descarta la carga pendiente.

Referencias del ZIP: `PVFFootballPlayer.cpp`, `PVFBall.cpp`, `PVFTeamBrain.cpp` y `docs/CONTROLS.md`. La integración adapta esas reglas a la simulación de AURA y no reproduce el sistema físico Chaos de Unreal.

## Controles

Elegir **ProVision · contextuales** o **AURA · clásicos** al preparar el partido. La selección se recuerda conservando la duración, dificultad y cámara guardadas anteriormente.

| Control ProVision | Ataque | Defensa |
| --- | --- | --- |
| WASD / flechas | Mover | Mover |
| Shift / RT / R2 | Sprint | Sprint |
| Espacio / A / ✕ | Pase | Mantener para presionar |
| K / B / ○ | Mantener y soltar para tirar | Mantener para sacar al portero |
| J / X / □ | Pase elevado | Barrida |
| L / Y / △ | Al hueco | Cambio de jugador |
| Tab / E / View | Cambio de jugador | Cambio de jugador |
| Q / RB / R1 | — | Segundo defensor |
| U / LB / L1 | — | Barrida |

El perfil clásico mantiene J para tirar y K para pasar. Los botones táctiles conservan sus acciones explícitas y añaden presión, portero y segundo defensor en once contra once. Calle/Volta añade tiro cargado por teclado y mando; su tiro táctil sigue siendo inmediato y no hay porteros en 3 contra 3.

## Modos

| Modo | Integración |
| --- | --- |
| Carrera mánager | Motor compartido, táctica, suplentes y calendario |
| Partido rápido y Rivalidad | Motor compartido y dos jugadores locales |
| Draft XI | Motor compartido con el once elegido y avance de eliminatorias |
| Carrera de jugador | Motor compartido y bloqueo del protagonista |
| Copas y selecciones | Motor compartido y registro en la eliminatoria |
| Ultimate Team | Motor compartido, once del club y recompensas existentes |
| Calle / Volta | Movimiento, energía y velocidades compartidos; conserva cancha 2D, paredes y circuitos |

Los minijuegos de precisión y la tanda de penaltis del menú siguen siendo actividades independientes. Los guardados de los modos no se migran ni se reinician para activar la adaptación.

## Verificación

Pruebas automáticas de potencia, energía, inercia, continuidad de control, roles, salida del portero, barridas, migración de preferencias y carga de scripts. Pruebas del controlador real con teclado, táctil y ambos mandos, incluyendo desconexión durante la carga. Se ejecuta también la batería existente de modos, guardados, recompensas, saques y sustituciones.

Partido comprobado en el navegador con el renderizado compatible. El navegador de pruebas no permite crear un contexto WebGL: la verificación visual no cubre el renderizado acelerado ni un iPhone físico.
