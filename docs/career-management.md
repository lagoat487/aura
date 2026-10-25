# Gestión de plantilla y negociaciones de AURA

Esta actualización implementa reglas y una interfaz propias. La referencia de experiencia es la [presentación oficial del modo Carrera de FC27](https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-career-mode-deep-dive): consulta, negociación por llamada, tensión y presentación de fichajes. No utiliza código, menús ni gráficos de EA.

## Hoja de equipo

`state.squad` contiene formación, once de once IDs únicos y capitán. Las formaciones son 4-3-3, 4-2-3-1, 4-4-2, 3-5-2 y 4-1-2-1-2. Cambiar de formación recoloca los once elegidos; **Mejor once** puede introducir suplentes. Vender a un titular repara la plaza con el mejor recambio disponible para esa posición. Los cambios manuales no se deshacen al navegar por los menús.

La valoración que usa la simulación del club dirigido es la media del once con penalización por posición y pequeños ajustes por moral y energía. Los rivales conservan el cálculo anterior de sus once jugadores mejor valorados. No hay simulación de lesiones ni sustituciones durante el partido.

Cada jugador dirigido tiene un rol, final de contrato, moral, energía, apariciones y jornadas consecutivas en el banquillo. Son parámetros originales de juego; los contratos no proceden de fuentes oficiales. Solo los once elegidos suman apariciones. Los titulares pierden tres puntos netos de energía por jornada; los suplentes recuperan siete. Un jugador importante o crucial pierde moral a partir de la tercera suplencia consecutiva. La moral y la energía están acotadas.

## Operaciones

| Operación | Etapas |
| --- | --- |
| Fichaje | Consulta → acuerdo con el club → contrato con el agente → revisión → firma |
| Venta | Precio de salida → respuesta o contraoferta del comprador → confirmación |
| Renovación | Contrato con el agente → revisión → firma |

Los estados terminales son fichado, vendido, renovado, fallido y retirado. No puede haber dos operaciones activas sobre el mismo ID. Una llamada cerrada con la X o **Pausar y cerrar** se conserva en la central. **Retirarse** cancela sin cargos. Una ruptura exige esperar dos jornadas para negociar otra vez por ese ID.

Los clubes evalúan precio y porcentaje de futura venta. El agente evalúa sueldo, prima, comisión, duración, rol y cláusula. Las contraofertas se pueden aceptar o modificar. Las ofertas alejadas aumentan la tensión; al llegar a 100, o después de cinco propuestas sin acuerdo en una etapa, la conversación termina. Los importes negativos, fraccionarios, no finitos o fuera del rango permitido se rechazan sin consumir un turno.

Los importes y demandas son estimaciones de AURA. El sueldo y las primas son importes enteros en euros; los sueldos se muestran por semana. El porcentaje de futura venta acepta enteros de 0 a 25. Una cláusula de salida existente permite acordar un traspaso pagando su importe aunque el club pida más.

## Presupuesto y propiedad

Los acuerdos previos no reservan ni descuentan fondos. La firma vuelve a validar presupuesto, masa salarial, propiedad y plazas. Un fichaje necesita espacio en la plantilla de 28; las ventas dejan al menos once jugadores. Un club vendedor ya simulado debe conservar once.

En fichajes se paga traspaso más prima y comisión. En renovaciones solo prima y comisión, sustituyendo el salario previo al comprobar el tope semanal. Una venta abona el importe acordado menos la obligación de futura venta heredada, si existe. Si el comprador forma parte de las plantillas de la carrera, el jugador cambia a su plantilla; en otro caso se conserva su destino en un registro de salidas de la sesión. Firmar dos veces la misma operación no duplica cobros.

La masa salarial es un **tope de contratación**, no un sistema contable: los sueldos semanales no se descuentan automáticamente al avanzar una jornada. No se incluyen plazos de pago, cesiones, canjes, bonus de rendimiento ni simulación de vencimientos de contrato o agentes libres. Los contratos aceptados sí quedan asociados a la ficha y los roles influyen en la moral.

## Competencia rival

Al avanzar una jornada, una operación de compra abierta por un jugador con GRL de 80 o más puede recibir una oferta rival. El rival aumenta las exigencias del agente y puede llevarse al jugador en otra jornada. El jugador cambia de club si sucede y no se descuenta dinero al usuario. No se modelan las cuentas de los clubes rivales.

## Persistencia y datos

Todo vive en memoria durante la sesión. No se escribe ni se lee `localStorage`. Recargar siempre abre **Iniciar nueva carrera**, como en la versión anterior. Los catálogos de jugadores y sus límites siguen siendo los de la base existente; esta actualización no verifica afiliaciones ni unifica todas las variantes de nombres entre proveedores. Los retratos, cuando existen, conservan el proveedor externo; si faltan se muestran iniciales.

## Verificación

`npm test` usa únicamente Node y cubre calendarios, regresiones de carrera, once y formaciones, contraofertas, firma única, presupuestos modificados, propiedad obsoleta, roles, renovaciones, porcentajes de futura venta, cláusulas, retirada y competencia rival. La revisión visual y funcional del navegador recorre alineación, sustitución, cambio de formación, renovación, venta y fichaje con condiciones editadas.
