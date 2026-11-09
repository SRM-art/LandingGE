# Gestión Esencial: usuarios, recuperación y control de sesiones

Fecha: **7 de noviembre de 2026**. Estado: **alcance aceptado; implementación local disponible; producción pendiente**.

El usuario confirmó las precisiones sobre hashes/metadatos, conteo de sesiones y diferencia entre cerrar sesiones y bloquear ingreso. Autorizó simular en local los flujos que requieren servicios externos. Consultar la sección 18 del plan 04 y la guía 05 para la implementación actual y sus límites frente a producción.

Este documento sustituye las decisiones anteriores de administrador único y Cloudflare Access como acceso al panel. Conserva el catálogo, proyectos, contenidos, estilos y arquitectura de una sola aplicación. Los tiempos y límites señalados como propuesta son valores iniciales ajustables.

## 1. Diagnóstico y decisión

El código actual permite entrar sin contraseña exclusivamente en la revisión local. `web/src/server/auth.ts` crea sesiones sin usuario; `web/src/middleware.ts` restringe la aplicación a localhost. No hay cuentas ni recuperación. El plan 04 contemplaba Access por correo, no una lista de IP del usuario final.

La nueva solución será **correo + contraseña, roles y sesiones verificadas en servidor**, accesible desde cualquier conexión. No se vinculará el acceso a una IP fija. Cambiar de wifi a datos móviles no cerrará por sí solo la sesión.

La cuenta inicial será del dueño, con rol **propietario/superadministrador**. Tendrá las funciones de contenido de los administradores y la gestión de usuarios. No se entregará una contraseña universal ni habrá una cuenta compartida de soporte.

## 2. Permisos y reglas de negocio

| Acción | Administrador | Propietario |
|---|---|---|
| Gestionar productos, proyectos, imágenes, carrusel y landing | Sí | Sí |
| Cambiar su contraseña y recuperar acceso | Sí | Sí |
| Consultar y cerrar sus propias sesiones | Sí | Sí |
| Consultar usuarios y sesiones ajenas | No | Sí |
| Invitar, desactivar y restaurar administradores | No | Sí |
| Cerrar todas las sesiones de otra cuenta | No | Sí |
| Gestionar su propia seguridad | Sí | Sí |
| Leer contraseñas o iniciar sesión suplantando otra cuenta | No | No |

- Propuesta inicial: **un propietario** y varios administradores. Las altas del panel siempre crean administradores; el rol enviado por el navegador no se acepta como autoridad.
- No habrá registro público ni cuentas de clientes. Los endpoints de registro de cualquier biblioteca también deberán quedar deshabilitados.
- “Eliminar” será **desactivar**: se conserva la cuenta y su autoría, pero se invalidan sesiones, invitaciones y enlaces de recuperación. No podrá recuperar acceso mientras esté desactivada.
- Restaurar una cuenta no resucita sesiones ni enlaces previos; exige un nuevo acceso y, cuando proceda, una nueva invitación.
- El propietario no puede desactivarse, eliminarse ni degradarse desde el panel. No se permitirá dejar al sistema sin propietario activo.
- Transferir la propiedad será una operación excepcional, documentada y con verificación del nuevo correo y autenticación reciente del dueño. No se incorpora una interfaz de promoción libre en esta primera versión.
- Cada persona deberá usar su propia cuenta para que el historial tenga una autoría útil.
- La revocación impide peticiones posteriores; no retira información ya vista ni deshace operaciones que se hayan confirmado antes de revocar.

## 3. Alta inicial e invitaciones

1. Crear el propietario mediante una operación de instalación privada e idempotente, ligada al correo real del dueño; nunca mediante una página pública donde gane el primero que llegue.
2. Enviar una invitación de activación con token aleatorio, de un solo uso. Propuesta: vigencia de 24 horas.
3. El dueño abre el enlace, verifica la posesión del correo y establece su contraseña. No se envía la contraseña por email ni se incluye en código o documentación.
4. Deshabilitar la posibilidad de repetir el alta inicial una vez creada la cuenta. Los despliegues y semillas de datos no deben recrearla ni cambiar sus credenciales.
5. Para crear otros usuarios, el propietario introduce únicamente el correo. La cuenta queda pendiente hasta completar el mismo flujo de activación.
6. Reenviar invitación invalida la anterior; se aplica control de frecuencia. Si falla el envío, la cuenta sigue pendiente y el panel permite reintentar.

El correo se valida y normaliza consistentemente para buscar y garantizar unicidad. No se eliminan puntos ni sufijos con `+`, ni se aplican reglas particulares de Gmail a otros proveedores. Una cuenta desactivada conserva su correo reservado: se restaura la misma identidad, no se crea otra con historial separado.

## 4. Qué se almacena

Los únicos datos de perfil solicitados serán **correo y contraseña**. No se pedirán nombres, teléfonos, documentos ni fotos. La contraseña se guarda como **hash con sal**, nunca como texto legible ni cifrado reversible. El sistema no podrá mostrarla ni recuperarla; solo reemplazarla. [Almacenamiento de contraseñas, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Para cumplir la gestión solicitada también hacen falta identificadores, rol, fechas, estado, sesiones y eventos de seguridad. Es información operativa, no campos adicionales que deba rellenar el usuario.

Modelo lógico propuesto en 3FN; el esquema físico se ajustará a la biblioteca elegida sin duplicar credenciales ni sesiones:

| Entidad | Campos principales y restricciones |
|---|---|
| `ROL` | `codigo PK`, `descripcion`. Valores controlados: PROPIETARIO, ADMINISTRADOR. |
| `USUARIO` | `id PK`, `correo UQ`, `rol_codigo FK`, `correo_verificado_at?`, `desactivado_at?`, `version_seguridad`, `created_at`, `updated_at`. |
| `CREDENCIAL` | `usuario_id PK/FK`, `password_hash`, `password_changed_at`. Puede no existir aún en una invitación pendiente; el hash codifica algoritmo, sal y parámetros. |
| `SESION` | `id PK`, `usuario_id FK`, `token_hash UQ`, `version_seguridad_emitida`, `created_at`, `last_seen_at`, `expires_at`, `idle_expires_at`, `reauthenticated_at?`, `revoked_at?`, `cliente_resumido?`. |
| `TOKEN_CUENTA` | `id PK`, `usuario_id FK`, `proposito`, `token_hash UQ`, `version_seguridad_emitida`, `created_at`, `expires_at`, `used_at?`, `revoked_at?`, `correo_destino?` para cambio de correo. |
| `EVENTO_SEGURIDAD` | `id PK`, `actor_usuario_id FK?`, `objetivo_usuario_id FK?`, `accion`, `ocurrido_at`, `resultado`, `detalle_seguro`. Actor nulo para operaciones sin identidad autenticada. |

No se copiará el rol o correo actual en las sesiones; se consulta el usuario. El número de sesiones y la etiqueta activa/expirada se calculan, no se mantienen manualmente. `version_seguridad_emitida` representa el estado al emitir la credencial temporal, no una copia del estado actual. No se duplicarán navegador y sistema operativo como columnas si se guardan dentro de `cliente_resumido`.

Extender la bitácora de contenido con `actor_usuario_id`. Los eventos antiguos quedarán identificados como revisión local previa, sin atribuirlos falsamente al dueño. Las exportaciones ordinarias de catálogo no incluirán credenciales ni tokens.

## 5. Sesiones y “dispositivos”

La pantalla mostrará **sesiones**, con una etiqueta orientativa como “Chrome · Windows”, inicio, última actividad aproximada, vencimiento y marca “Esta sesión”. El propietario verá el listado y conteo por cuenta, incluida la suya. Cada administrador verá únicamente las propias.

No se puede garantizar un conteo exacto de dispositivos físicos: dos navegadores o un modo incógnito pueden crear sesiones distintas en un mismo equipo; varias pestañas normalmente comparten una sesión. Tampoco “sesión válida” significa que la persona esté conectada en ese instante. No se usará huella digital invasiva ni geolocalización.

Propuesta operativa:

- Sesión de máximo **12 horas**, con expiración tras **60 minutos sin actividad**. Sin “recordarme” en la primera versión. La actividad real renueva solo la inactividad, nunca el límite absoluto; un sondeo automático no debe mantener la sesión viva.
- Última actividad actualizada como máximo una vez por minuto para moderar escrituras; el panel indicará que es aproximada.
- Botones “Cerrar esta sesión” y “Cerrar todas las sesiones”. La segunda acción incluye la sesión actual si pertenece a la cuenta objetivo; se advierte antes de ejecutarla y se vuelve al acceso cuando corresponda.
- Las sesiones opacas se conservan en servidor. Cookie `HttpOnly`, `Secure` en HTTPS, `SameSite` apropiado y alcance restringido al host. No se guardarán tokens de acceso en `localStorage`.
- Comprobar sesión, usuario activo, rol, expiraciones y versión de seguridad en cada petición privada. No confiar únicamente en el menú visible ni en un JWT largo sin revocación.
- Cerrar todas las sesiones incrementa atómicamente la versión de seguridad e invalida las anteriores. Cambiar/restablecer contraseña o desactivar la cuenta también invalida tokens pendientes.
- Desactivar cachés de sesión que retrasen la revocación. En D1, usar una ruta de lectura con consistencia suficiente para decisiones de seguridad; no autorizar con réplicas potencialmente atrasadas.
- Cubrir carreras: un inicio o recuperación comenzado antes de una desactivación/revocación no debe producir una sesión válida después por completar tarde. Revalidar versión y estado al emitir/confirmar; las escrituras sensibles deben comprobar autorización al confirmar.
- Cerrar sesiones no impide volver a entrar con una contraseña conocida. Si se sospecha acceso ajeno, también se cambia la contraseña o se desactiva la cuenta.

La política de duración es una propuesta del proyecto. La protección de identificadores y cookies se apoya en [gestión de sesiones de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## 6. Recuperar contraseña y cambiar correo

Flujo de recuperación para administradores y propietario:

1. Introducir el correo y recibir siempre una respuesta genérica, exista o no una cuenta habilitada. Moderar diferencias de tiempo y frecuencia para no facilitar enumeración.
2. Si corresponde, enviar un enlace con token aleatorio de uso único, almacenado como hash. Propuesta de vigencia: **20 minutos**. Solo el enlace más reciente será válido.
3. Permitir establecer la contraseña nueva y confirmarla. Consumir el token una sola vez de manera atómica con el cambio; dos peticiones simultáneas no pueden reutilizarlo.
4. Invalidar todas las sesiones y demás enlaces pendientes, notificar el cambio por correo y solicitar un inicio de sesión normal. No se muestra ni se envía la contraseña.

El enlace se construye desde el dominio canónico configurado, no desde un encabezado Host arbitrario. Las páginas de recuperación no tendrán analítica, rastreo de clics ni recursos de terceros que filtren el token; usar `Referrer-Policy: no-referrer`. Abrir el enlace con GET no lo consume, para tolerar escáneres de correo. [Recuperación segura, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

Cambiar contraseña estando dentro exige la actual. Cambiar correo exige autenticación reciente, comprobación de unicidad y confirmación del nuevo correo; se mantiene el anterior hasta completar la validación, se notifica al anterior y se cierran sesiones al finalizar. El propietario no podrá modificar silenciosamente el correo o contraseña de otra persona; puede desactivar la cuenta e invitar una nueva cuando corresponda.

Si el propietario pierde también su buzón, la recuperación automática por correo no resuelve el problema. Documentar recuperación excepcional por el titular de la infraestructura, verificación de propiedad y operación privada auditada; sin puertas traseras públicas. Recomendar MFA en el buzón del dueño. Un segundo factor dentro del panel es una mejora recomendable para el propietario, fuera del alcance mínimo correo/contraseña y pendiente de decisión.

## 7. Controles de seguridad

- Propuesta: contraseñas de **15 a 128 caracteres**, permitiendo espacios, pegado y gestores; sin recortes silenciosos, reglas arbitrarias de símbolos o vencimientos periódicos. Rechazar contraseñas comunes/comprometidas sin enviar contraseñas completas a terceros. Reautenticación reciente (propuesta: últimos 5 minutos) para altas, desactivaciones, revocación de sesiones ajenas y cambios de identidad. [Autenticación, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
- Función de hash mantenida y adecuada para contraseñas, preferencia Argon2id; alternativa scrypt si el runtime lo exige y supera parámetros y pruebas de seguridad. No usar SHA-256 simple para contraseñas; sí puede usarse para tokens aleatorios de alta entropía. No reducir el coste del hash para encajar en alojamiento gratuito.
- Límites de intentos compartidos entre instancias, combinando cuenta, origen y umbral global. No depender solo de memoria del proceso. La IP sirve como señal temporal contra abuso, nunca como lista de acceso ni identidad. Evitar bloqueos permanentes que un atacante pueda provocar al dueño.
- Propuesta inicial a ajustar con pruebas: 5 fallos por cuenta en 15 minutos antes de aplicar demora progresiva; 3 solicitudes de recuperación/invitación por destinatario en una hora. Controles adicionales por origen y globales para ataques distribuidos y gasto de correo; los avisos de error no revelan qué cuenta existe.
- Validación de origen y protección CSRF en mutaciones, métodos explícitos, permisos en servidor, consultas parametrizadas, HTTPS y respuestas privadas sin caché. Inventariar y proteger también medios privados, exportaciones y rutas de autenticación fuera de `/admin`.
- Nunca registrar contraseñas, tokens, cookies completas, enlaces de recuperación ni claves del proveedor. Secretos separados por entorno y fuera del repositorio.
- Revocar/expirar sesiones no elimina el historial de contenido. Propuesta de retención: metadatos de sesiones cerradas y eventos de seguridad durante 90 días; purga posterior de tokens y datos transitorios. Esta política no elimina productos, proyectos, usuarios ni su autoría. Se documentará como excepción técnica explícita a la conservación de datos de negocio.
- No almacenar IP cruda en el perfil o historial de dispositivos. Contadores antiabuso con identificadores derivados, caducidad corta y acceso restringido; revisar también los registros que guarden los proveedores.

## 8. Tecnología y servicios

Se mantienen Astro, TypeScript, SQLite local, D1 en producción, Workers, R2, procesamiento de imágenes, DNS y HTTPS. **Cloudflare Access deja de ser requisito de acceso al panel del dueño**; podrá conservarse exclusivamente para entornos internos de prueba si aporta valor.

Primera candidata: **Better Auth**, integrada en el servidor Astro y con adaptador de datos compatible. Tiene documentación de [Astro](https://better-auth.com/docs/integrations/astro), [Drizzle](https://better-auth.com/docs/adapters/drizzle), [correo/contraseña](https://better-auth.com/docs/authentication/email-password), [sesiones](https://better-auth.com/docs/concepts/session-management) y [administración](https://better-auth.com/docs/plugins/admin). Usar una biblioteca mantenida evita construir desde cero toda la autenticación.

**La selección es condicional a una prueba técnica**, no una dependencia ya instalada. Verificar versión vigente, compatibilidad real Node/Workers/D1 y operaciones atómicas, hash de contraseña, tokens almacenados como hash, revocación inmediata, roles y configuración para impedir registro, suplantación y borrado definitivo. La biblioteca tiene su propio esquema y valores predeterminados; no asumir que satisface este plan sin adaptación. Los nombres/fotos opcionales del esquema no deben convertirse en datos obligatorios para el usuario ni duplicar su correo. Si exige cambios inseguros o excesivos, evaluar otra biblioteca/proveedor mantenido y documentar coste y tratamiento de datos antes de elegirlo. No crear dos sistemas de identidad en paralelo.

Agregar **correo transaccional**, candidato Resend, para invitaciones, recuperación y avisos. Ofrece nivel gratuito, cuyo límite publicado consultado es de 100 envíos diarios; verificar cuotas mensuales y condiciones al contratar. No supone entrega garantizada ni gratuidad ilimitada. [Precios de Resend](https://resend.com/pricing).

Se necesita un dominio propio verificado, preferiblemente subdominio de envío, registros SPF/DKIM y política DMARC. Mantener los registros del correo empresarial existente. Deshabilitar seguimiento de aperturas/clics para mensajes de seguridad. Usar API HTTPS con clave de mínimo alcance. [Dominios verificados de Resend](https://resend.com/docs/dashboard/domains/introduction).

Configurar reintentos limitados e idempotentes sin registrar el enlace secreto. Una caída del correo no debe bloquear accesos con contraseña válidos, pero sí impide completar nuevas activaciones/recuperaciones hasta restablecer el envío. En local usar un buzón de pruebas o proveedor simulado solo local; nunca exponer enlaces de recuperación en una API de producción.

**Impacto económico:** verificar contraseñas cuesta bastante más CPU que validar el JWT de Access previsto antes. La viabilidad de Workers Free debe volver a medirse con hash, alta, login y recuperación reales; no se mantiene la antigua suposición de coste. Evaluar Workers Paid si hace falta y actualizar el presupuesto con tarifas vigentes antes de contratar. [Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/). No se añaden VPS ni servicios adicionales por anticipación.

## 9. Pantallas y rutas previstas

Mantener tipografías, colores, espaciados y componentes del panel actual.

- `/admin/login`: correo, contraseña, mostrar/ocultar contraseña y enlace de recuperación.
- `/admin/recuperar` y `/admin/restablecer`: solicitud y nueva contraseña.
- `/admin/activar`: completar invitación.
- `/admin/usuarios`: solo propietario; correo, rol, estado, sesiones vigentes y acciones permitidas.
- `/admin/usuarios/[id]/sesiones`: sesiones de la cuenta y cierres, con autorización por propietario.
- `/admin/mi-cuenta`: contraseña, cambio verificado de correo y sesiones propias; disponible para ambos roles.

Los endpoints definitivos dependerán de la biblioteca. Elaborar una lista explícita de rutas anónimas permitidas (login, activación, recuperación y sus handlers); todo lo demás privado exige sesión. Un endpoint anónimo de recuperación nunca puede servir datos privados por compartir prefijo. Formularios accesibles, etiquetas claras, avisos de expiración y confirmaciones concretas antes de cerrar sesiones o desactivar.

## 10. Implementación por etapas

| Etapa | Trabajo | Criterio de salida |
|---|---|---|
| 1. Prueba de compatibilidad | Biblioteca, esquema, hashing y revocación en Node y Workers/D1; medir CPU, memoria, latencia y escrituras. | Arquitectura y coste viables, sin debilitar seguridad. |
| 2. Migraciones | Copia de seguridad; usuarios, credenciales, sesiones, tokens y autoría. Preservar contenido y medios. | Migración repetible y restauración ensayada en copia aislada. |
| 3. Acceso y roles | Alta privada del propietario, invitaciones, login/logout, middleware y permisos de endpoints. | Se elimina acceso sin contraseña; registro público y escalada de rol fallan. |
| 4. Usuarios y sesiones | Listados, conteos, cierre individual/global, desactivación/restauración y reautenticación. | Pruebas con varios navegadores y carreras de revocación superadas. |
| 5. Recuperación y correo | Envíos, límites, expiración, cambio de contraseña/correo y avisos. | Flujo completo y manejo de fallos del proveedor comprobados. |
| 6. Revisión local | Pantallas con diseño actual, regresión del catálogo y panel, guía para el dueño. | Usuario puede revisar los flujos reales sin desplegar. |
| 7. Preparación de producción | Dominio/remitente, secretos, HTTPS, protección de previews, presupuestos y pruebas en entorno remoto. | Aprobación de publicación sobre una versión verificada y acceso del dueño comprobado. |

Actualizar `web/src/server/auth.ts`, `web/src/middleware.ts`, rutas de acceso y handlers, tipos de `locals`, esquema/migraciones, bitácora, navegación del panel, pruebas HTTP y scripts de copia/restauración. El comprobador local de Host deja de ser el mecanismo de acceso cuando se configure producción; se mantiene validación del dominio canónico y de orígenes.

Las copias de seguridad completas contienen datos sensibles: restringirlas y protegerlas. La exportación normal de contenido sigue excluyendo autenticación. Al restaurar una copia operativa, invalidar sesiones y tokens pendientes para no resucitar accesos revocados; no reactivar usuarios por accidente. Nunca volver a una versión de producción que permita el antiguo acceso local sin contraseña.

## 11. Pruebas de aceptación

1. Propietario y administrador pueden gestionar contenido; un anónimo no accede a pantallas, APIs, exportaciones o medios privados.
2. Un administrador no lista usuarios, no accede a sesiones ajenas ni eleva permisos cambiando IDs, roles o llamadas directas.
3. Una invitación funciona una vez; rechaza vencimiento, reenvío anterior, desactivación y reutilización simultánea. No existe auto-registro.
4. Chrome y otro navegador generan sesiones separadas; pestañas con la misma cookie comparten sesión. El conteo excluye expiradas/revocadas.
5. El propietario cierra sesiones de otra cuenta y de sí mismo; la siguiente petición privada falla aunque se conserve la cookie anterior.
6. Una cuenta desactivada no entra ni recupera contraseña; restaurarla no revive sesiones/tokens. El propietario no se puede eliminar ni degradar.
7. Recuperación/cambio de contraseña invalida todos los accesos previos. Probar tokens manipulados, expirados, usados y carreras con desactivación/cambio de correo.
8. Cambiar de IP no invalida una sesión legítima; ataques por cuenta y origen reciben límites sin bloquear permanentemente al dueño.
9. Peticiones de otro origen, sesiones fijadas/robadas y tokens en logs o URLs de referencia tienen pruebas y controles específicos.
10. Fallos y límites de correo permiten reintentar sin duplicar cuentas, filtrar existencia ni consumir invitaciones al abrirlas un escáner.
11. Migración y restauración mantienen catálogo, imágenes y autoría; los respaldos restaurados no habilitan sesiones antiguas.
12. En Workers, medir login y recuperación además de lecturas normales. Verificar consistencia de revocación y permisos en todos los dominios expuestos.

## 12. Datos pendientes y decisiones propuestas

Para comenzar implementación local no hacen falta credenciales reales del dueño ni servicios contratados. Se usarán usuarios y correo de prueba.

Antes de publicar se necesita el correo del propietario, dominio/remitente, cuenta del proveedor de correo propiedad de la empresa y su configuración mediante secretos, no contraseñas compartidas en el chat.

Quedan propuestos para revisión: un único propietario; mismas funciones de contenido para todos los administradores; sesiones de 12 horas/60 minutos de inactividad; invitación de 24 horas; recuperación de 20 minutos; retención técnica de 90 días; y MFA del panel como ampliación recomendable. El número esperado de administradores servirá para ajustar cuotas, pero no bloquea la primera versión.

Actualización de implementación: el acceso local ahora requiere cuenta y contraseña. Se implementaron roles, sesiones, invitaciones, recuperación, cambio de correo/contraseña y desactivación/restauración. El envío se simula en un buzón local; el propietario se configura una sola vez desde este equipo. Se usa un adaptador Node/SQLite con scrypt nativo. Better Auth sigue como candidato de producción, no como dependencia instalada. La prueba real en Workers, proveedor de correo, revisión ampliada de contraseñas comprometidas y retención programada permanecen en el despliegue. No se contrataron servicios ni se publicó la web.
