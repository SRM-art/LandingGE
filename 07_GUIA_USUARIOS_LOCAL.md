# Revisar usuarios y sesiones en local

Actualizado: 7 de noviembre de 2026. No se envían correos ni se contratan servicios.

## 1. Primera entrada

Abre http://127.0.0.1:4321/admin. Si aún no hay propietario se abrirá la configuración inicial. Introduce tu correo y elige una contraseña de 15 a 128 caracteres; las frases con espacios son válidas. Confirma la contraseña y entra. No existe usuario/contraseña predeterminado y esta pantalla deja de estar disponible después del alta.

El correo se usa como nombre de usuario. En local no se comprueba la posesión de un buzón real. No necesitas compartir tu contraseña con el desarrollador.

## 2. Crear y activar administradores

En **Usuarios y sesiones**, introduce un correo diferente y pulsa **Crear invitación**. Abre **Buzón de prueba** y el mensaje de invitación: permite establecer la contraseña de esa cuenta. Luego inicia sesión con sus credenciales.

El administrador puede gestionar todos los contenidos y su propia cuenta. No ve la gestión del equipo ni puede ejecutar sus acciones directamente. El propietario tiene ambas capacidades. Para comparar roles conserva la sesión del dueño en un navegador y abre la del administrador en otro navegador o ventana privada.

La invitación vence en 24 horas. Reenviarla reemplaza la anterior. Activarla no inicia sesión automáticamente.

## 3. Revisar sesiones

El propietario puede abrir **Ver sesiones** junto a cualquier cuenta, incluida la suya. Cada usuario también tiene **Mi cuenta** para sus propios accesos.

- Se muestra navegador/sistema operativo, inicio, última actividad aproximada y vencimiento.
- Varias pestañas normalmente comparten sesión; otro navegador o modo privado crea una diferente.
- **Cerrar sesión** revoca una entrada; **Cerrar todas las sesiones** revoca todas las de la cuenta. Si cierras las tuyas, sales del panel.
- No se necesitan una IP fija ni el mismo wifi para identificar la cuenta. El servidor de esta revisión solo se publica en el propio equipo.
- Duración máxima: 12 horas, con cierre tras 60 minutos sin actividad.
- Cerrar sesiones no cambia la contraseña. Para bloquear nuevos ingresos, desactiva la cuenta o cambia la contraseña si es tuya.

Las operaciones sobre otros usuarios piden autenticación reciente. Si aparece el aviso, abre **Verificar identidad**, confirma tu contraseña y repite la acción dentro de los siguientes 5 minutos.

## 4. Desactivar y restaurar

**Desactivar** cierra sesiones, invalida enlaces y bloquea nuevos accesos. Conserva la cuenta y su historial. **Restaurar** genera una nueva invitación: el usuario establece de nuevo su contraseña y las sesiones anteriores siguen invalidadas. El propietario no puede desactivarse ni cambiar su rol.

## 5. Recuperación y cambios de cuenta

En el acceso, pulsa **Olvidé mi contraseña**, escribe el correo y abre el **Buzón local**. El enlace vence en 20 minutos y solo se usa una vez. Al guardar se cierran todas las sesiones y se vuelve al inicio de sesión.

En **Mi cuenta** puedes cambiar la contraseña conociendo la actual, o solicitar cambiar el correo. Este último cambio no entra en vigor hasta confirmar el enlace del mensaje dirigido al correo nuevo; también cierra las sesiones.

El buzón simulado está en http://127.0.0.1:4321/admin/correo-local. Es una herramienta de prueba que se puede abrir sin sesión para probar recuperación. **Quien use este equipo y pueda abrir el buzón podrá usar los enlaces simulados.** Se guarda separado de la base, en `.local/local-mailbox.json`, y no se incluye en la exportación de contenido ni en la copia de seguridad. No contiene contraseñas. Debe desaparecer del despliegue público.

## 6. Datos, pruebas y límites

- La migración `003_accounts.sql` conserva el catálogo y las imágenes. Se creó una copia de seguridad antes de aplicarla.
- Contraseñas protegidas con scrypt de Node; tokens de sesión y recuperación guardados como hash en SQLite. El buzón conserva los enlaces solo para simular su entrega local.
- Las nuevas operaciones de contenido registran su usuario autor. Los eventos anteriores conservan autor nulo, equivalente a revisión local previa.
- Las copias completas contienen información sensible de cuentas. El respaldo invalida sesiones y enlaces; el buzón queda fuera. No compartir la base de datos como si fuera una exportación pública.
- Se probaron funciones de seguridad, expiración, permisos, revocación, recuperación y una carrera de recuperación/desactivación; también los recorridos HTTP y el catálogo existente.
- Ejecutar `npm run check`, `npm test`, `npm run build`, `npm run test:http` y `npm run test:auth` desde `web`. Los tests crean bases aisladas y no modifican las cuentas del sitio que estás revisando.
- Correo real, biblioteca/adaptador compatible con Workers, límites distribuidos, comprobación completa de contraseñas comprometidas y retención programada se resuelven antes de publicar (plan 04, sección 18).
