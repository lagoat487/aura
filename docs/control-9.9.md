# AURA 9.9 · Toques y regate

Esta revisión mantiene la versión 9.9, los siete modos y sus guardados. Cambia las mecánicas del partido, además de los botones.

- **Conducción por toques:** el balón rueda entre contactos del pie. Al esprintar se adelanta; un giro brusco puede dejarlo fuera de alcance. La posesión no lo arrastra desde varios metros de distancia.
- **Control corto:** mantener Z o CONTROL reduce la carrera y estabiliza el balón cerca del pie. L2 realiza esta acción en el perfil ProVision. Prima sobre el sprint si se mantienen ambos.
- **Regate direccional:** R o REGATE, acompañado de una dirección, produce una salida lateral con trayectoria continua. No se limita a un aumento de velocidad.
- **Respuesta al movimiento:** aceleración y frenado más rápidos al conducir, con mayor inercia durante un sprint.
- **Defensa sobre el balón:** un defensor puede cortar un toque adelantado. Acercarse al cuerpo del rival no permite recuperar un balón que está fuera de su alcance.
- **Pases según la distancia:** los envíos cortos y largos reciben distinta fuerza. Una orden de pase durante los últimos 220 ms de recuperación o justo antes de recibir puede ejecutarse una vez al quedar disponible. Pausa, interrupciones y pérdida de posesión descartan la orden.

Carrera, jugador, UT, Draft, Copas y amistosos comparten el motor actualizado. Calle/Volta incorpora los toques, el control corto, la respuesta al movimiento y el regate lateral en su cancha 3 contra 3.

## Validación

582 pruebas aprobadas: simulación, guardados, recompensas, modos y controles. Las nuevas pruebas comprueban separación del balón, pérdida de control, alcance defensivo, regates a ambos lados, frenado, fuerza del pase, órdenes anticipadas, teclado, táctil y L2 de ambos jugadores locales.

En una prueba reproducible de cuatro segundos, el toque de sprint alcanza aproximadamente 1,96 m de separación y el control corto se mantiene alrededor de 0,5 m, sin perder posesión en carrera recta. El frenado desde 8,5 m/s, tras soltar sprint, se completa en unos 0,25 s. Son escenarios de simulación, no medidas de latencia de un dispositivo.

La revisión utiliza archivos nuevos para que la entrada principal cargue estas mecánicas sin reutilizar los scripts anteriores. Se comprueba el partido en navegador con el renderizado compatible; el entorno de prueba no dispone de un contexto WebGL.
