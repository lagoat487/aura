# AURA VISION 9.9 — Borrado aleatorio de 2 clubes (integración pendiente)

**Estado:** el algoritmo y las pruebas están incluidos en este repositorio. **No está activado para jugadores reales**.

## Qué hace el comando preparado

- El creador autenticado selecciona **exactamente dos cuentas diferentes** mediante azar criptográficamente uniforme.
- Excluye al propietario, los invitados y los clubes inactivos.
- En ambas cuentas pone las **monedas en 0** y vacía cartas en propiedad, titulares, suplentes, reservas, repetidos y cartas pendientes.
- Registra una copia previa de cada club para recuperación y evita repetir la operación si se reenvía el mismo ID.
- La operación debe ser transaccional: si falla alguna escritura, no se borra ningún club.

Código: [server/random-club-wipe-99.js](../server/random-club-wipe-99.js).
Pruebas: [tests/random-club-wipe-99.test.js](../tests/random-club-wipe-99.test.js).

## Por qué todavía no se puede activar desde el panel

AURA 9.9 conserva Ultimate Team en el almacenamiento local de cada navegador. No hay cuentas ni base de datos central de clubes. El backend conectado al panel únicamente comparte avisos, regalos y efectos temporales, y el código fuente del servidor de administración no está incluido aquí. No se puede elegir ni modificar a dos jugadores reales con estas condiciones.

Además, el formato actual de guardado de UT exige por lo menos 11 futbolistas y un XI completo. Si el servidor borra absolutamente todas las cartas, el cliente deberá mostrar una pantalla especial de club vaciado hasta reconstruirlo; no se deben cargar estos datos vacíos en el validador actual.

## Para conectar el comando al servidor

1. Crear cuentas verificadas, sesiones y clubes **autoritativos guardados en el servidor**, con identificación estable por usuario. El servidor, no el navegador, decide a qué cuenta pertenece cada guardado.
2. Implementar un adaptador a la interfaz de transacciones que lee cuentas y hace respaldo y escritura atómica en la base de datos (Cloudflare D1 o equivalente).
3. Exponer un endpoint privado POST /api/admin/wipe/random con sesión, protección CSRF y comprobación del propietario **del lado del servidor**. El servidor genera un identificador único por operación confirmada y llama a wipeTwo; para revertir usa undoWipe.
4. En el panel de creador, mostrar **vista previa, confirmación explícita y opción de deshacer** antes de invocar la operación.
5. Sincronizar los guardados hacia todos los dispositivos y pestañas de las dos cuentas elegidas. Evitar que un respaldo local antiguo sobrescriba el estado del servidor.
6. Mostrar en el juego la pantalla de club vaciado para usuarios afectados, sin generar automáticamente monedas ni un plantel nuevo.

**No** ejecutar esto en el navegador ni confiar en un objeto JSON del cliente con ownerVerified:true; ese atributo solamente lo puede establecer el middleware de autenticación del servidor.

Pruebas locales: node --test tests/random-club-wipe-99.test.js