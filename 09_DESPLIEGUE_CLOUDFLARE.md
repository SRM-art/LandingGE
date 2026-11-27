# Guía de despliegue de Gestión Esencial

Esta guía lleva el proyecto desde la carpeta local hasta una prueba en Cloudflare y luego a `gestionesencialsas.com`. El punto de partida es una compilación probada en el emulador. Para ejecutar el despliegue necesitas acceso a Google Workspace, a la cuenta Cloudflare de la empresa, al registrador del dominio y a Resend.

## 0. Revisar el presupuesto y configurar el pago

El presupuesto base de la web es **USD 5 al mes por cuenta de Cloudflare**, antes de impuestos, conversión de moneda y eventuales excedentes. Usa la misma cuenta de Cloudflare para pruebas y producción. Doce meses equivalen a **USD 60** en cargos base mensuales. Como referencia, a una tasa ilustrativa de COP 4.000 por dólar serían **COP 20.000 al mes** o **COP 240.000 en 12 meses**. El importe real en COP depende del medio de pago. El cálculo deja por fuera la renovación del dominio y Google Workspace. [Precios de Workers](https://developers.cloudflare.com/workers/platform/pricing/) · [Ciclo de facturación de Cloudflare](https://developers.cloudflare.com/billing/understand/how-billing-works/)

| Servicio | Estimación inicial y qué revisar |
| --- | --- |
| **Workers Paid** | **USD 5 al mes** de base por cuenta. Ejecuta la web y el panel. El cálculo local de Argon2id superó el límite de CPU de Workers Free, por eso se presupuesta el plan Paid para validar el acceso en Cloudflare. Las solicitudes dinámicas y el tiempo de CPU pueden generar cargos si superan lo incluido. [Tarifas](https://developers.cloudflare.com/workers/platform/pricing/) |
| **D1** | **USD 0 adicionales estimados** dentro de lo incluido con Workers Paid. Controla filas leídas, filas escritas y almacenamiento. El plan incluye las primeras 25.000 millones de filas leídas, 50 millones de filas escritas al mes y 5 GB almacenados. [Tarifas](https://developers.cloudflare.com/d1/platform/pricing/) |
| **R2 Standard** | **USD 0 estimados** con 10 GB-mes, 1 millón de operaciones de clase A y 10 millones de clase B incluidas al mes. Cuenta el uso conjunto de los buckets de pruebas y producción. Cada foto subida desde el panel guarda el original y tres variantes. [Tarifas](https://developers.cloudflare.com/r2/pricing/) |
| **Cloudflare Images** | **USD 0 estimados** con Images Free, que incluye hasta 5.000 transformaciones únicas mensuales. Cada foto nueva cargada desde el panel genera tres variantes WebP (480, 960 y 1.600 px). Si se cargan 150 productos con dos fotos cada uno, son 300 fotos y alrededor de 900 transformaciones por una carga completa en un entorno. Cuenta también las cargas en pruebas y las fotos de proyectos y portada. El sitio sirve las variantes ya guardadas en R2 al navegar. Si se alcanza la cuota gratis, las nuevas transformaciones pueden fallar. [Tarifas](https://developers.cloudflare.com/images/pricing/) |
| **HTTPS y acceso a pruebas** | **USD 0 previstos**. Universal SSL del dominio se emite y renueva gratis. Para proteger la web de pruebas con Cloudflare Access, selecciona Zero Trust Free para el grupo de revisión. [Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/) · [Planes de Zero Trust](https://www.cloudflare.com/plans/zero-trust-services/) |
| **Resend** | **USD 0 previstos** con el plan gratuito, hasta 100 envíos al día y 3.000 al mes. El remitente técnico funciona sin una licencia de Google Workspace. [Tarifas](https://resend.com/pricing) |

### Registrar el medio de pago en Cloudflare

1. Entra al [panel de Cloudflare](https://dash.cloudflare.com/), selecciona la cuenta de la empresa y abre **Manage Account → Billing → Subscriptions**. Abre **Payment methods → Add Payment Method**.
2. Selecciona tarjeta o PayPal según las opciones que muestre la cuenta. Introduce los datos de pago y facturación de la empresa, completa la validación del banco si se solicita y pulsa **Confirm**. Comprueba que aparece como método principal. [Perfil de facturación de Cloudflare](https://developers.cloudflare.com/billing/get-started/create-billing-profile/)
3. En el panel, abre **Workers plans** y selecciona **Workers Paid** para esa cuenta. Revisa el importe, la recurrencia mensual y los impuestos en la pantalla de confirmación. Luego verifica que el plan figura en **Billing → Subscriptions**. Al preparar R2 en la sección 4, si el panel solicita activar la suscripción de R2, verifica que los buckets usen **Standard** y confirma con el mismo perfil de pago. [Pantalla de Workers plans](https://developers.cloudflare.com/browser-run/pricing/) · [Configuración de R2](https://developers.cloudflare.com/r2/get-started/)
4. Después de desplegar, revisa **Billing → Billable Usage** para los consumos variables e **Invoices and documents** para consultar la factura. En **Billable Usage → Create budget alert** puedes enviar un aviso al correo propietario, por ejemplo al acumular USD 2 de uso facturable. El aviso excluye el cargo fijo de Workers y permite que el servicio siga funcionando. [Uso facturable](https://developers.cloudflare.com/billing/manage/billable-usage/) · [Alertas de presupuesto](https://developers.cloudflare.com/billing/manage/budget-alerts/)

### Revisar el pago de los servicios existentes

- **Google Workspace.** Antes de crear el segundo buzón, revisa en **Consola de administración → Facturación → Suscripciones → Google Workspace** las licencias disponibles, el plan y el próximo importe estimado. Si hace falta cambiar el medio de pago y la suscripción se factura directamente con Google, abre **Facturación → Cuentas de pagos → Ver métodos de pago → Añadir método de pago**. Guarda la tarjeta y selecciónala como **Principal** para los cobros automáticos. Si factura un distribuidor, gestiona con él la licencia y el pago. [Consultar la suscripción](https://knowledge.workspace.google.com/admin/billing/which-edition-and-payment-plan-do-i-have) · [Configurar el pago automático](https://knowledge.workspace.google.com/admin/billing/auto-pay-with-a-credit-card)
- **Dominio.** La renovación se sigue pagando al registrador actual. Cambiar los nameservers a Cloudflare en la sección 6 conserva el registro existente. Consulta el precio de renovación y el medio de pago en el panel del registrador antes de su vencimiento.

## 1. Preparar los dos correos en Google Workspace

Usa dos buzones en el **Workspace que ya usa la empresa**. Conserva `administracion@gestionesencialsas.com` para el propietario del panel y crea un segundo buzón para la persona designada. La guía usa `web.admin@gestionesencialsas.com` como ejemplo. Si eliges una dirección con el nombre de la persona, úsala también al invitarla al panel.

| Dirección | Función |
| --- | --- |
| `administracion@gestionesencialsas.com` | Buzón existente y único propietario del panel. Puede gestionar el contenido, invitar y desactivar administradores, iniciar su reactivación, consultar las sesiones de las cuentas y revocarlas. La cuenta del propietario está protegida contra desactivación desde el panel. |
| `web.admin@gestionesencialsas.com` | Buzón de la persona designada para gestionar el catálogo, los proyectos y los contenidos del sitio a diario. Recibe su propia invitación y sus enlaces de recuperación. La gestión de usuarios queda reservada al propietario. |

El segundo buzón tendrá su propio inicio de sesión y bandeja de entrada. Las dos personas entrarán al panel web con su correo y una contraseña propia del sitio. La consola de Google Workspace requiere sus propios permisos para crear el buzón. [Usuarios de Google Workspace](https://knowledge.workspace.google.com/admin/users/add-an-account-for-a-new-user)

1. Abre la [Consola de administración de Google](https://admin.google.com/) e inicia sesión con una cuenta con permisos para gestionar usuarios del dominio.
2. Abre **Menú → Facturación → Suscripciones → Google Workspace**. Comprueba si queda una licencia y revisa el impacto en el cobro antes de crear el buzón. En un plan flexible, agregar un usuario puede aumentar el cobro mensual. En un plan anual, puede hacer falta ampliar el número de licencias.
3. Abre **Menú → Directorio → Usuarios** y pulsa **Añadir nuevo usuario**. Si el botón no aparece, comprueba que estés en la organización correcta y que tu cuenta pueda gestionar usuarios.
4. Escribe el **nombre y apellido** de la persona responsable. En **Correo electrónico principal**, escribe `web.admin` y selecciona `gestionesencialsas.com` en el selector de dominio. En **Correo secundario**, introduce una dirección que la persona pueda consultar para recibir las instrucciones de acceso.
5. En las opciones de contraseña, elige una contraseña temporal generada. Pulsa **Añadir nuevo usuario**. Si aparece **Vista previa y enviar**, confirma que el destinatario sea el correo secundario correcto, envíale las instrucciones y pulsa **Listo**.
6. La persona responsable debe abrir el mensaje de bienvenida, seguir el enlace, establecer su contraseña y entrar en [Gmail](https://mail.google.com/) con la nueva dirección. Envía un mensaje de prueba desde un buzón externo y responde desde el nuevo Gmail.
7. Con cada cuenta, abre [Cuenta de Google → Seguridad](https://myaccount.google.com/security). En **Cómo inicias sesión en Google**, entra en **Verificación en dos pasos** y sigue el asistente. Guarda el método de recuperación en un lugar privado. Para la edición diaria del sitio basta un usuario estándar de Workspace y el acceso al panel que se concede en la sección 5. [Verificación en dos pasos de Google](https://support.google.com/accounts/answer/185839)
8. Si además se le encarga el despliegue, entra en [Cloudflare](https://dash.cloudflare.com/) con la cuenta de la empresa. En **Manage Account → Members → Invite members**, introduce el mismo correo, concede los permisos para los recursos que administrará y envía la invitación. La persona debe aceptarla y comprobar que puede seleccionar la cuenta de la empresa. [Miembros de Cloudflare](https://developers.cloudflare.com/fundamentals/manage-members/manage/)

## 2. Preparar el proyecto en Windows

Abre **PowerShell** en la raíz del repositorio, donde están `README.md` y la carpeta `web`. Ejecuta los comandos de esta guía desde **`web`**, salvo los pasos que indican abrir un panel en el navegador:

```powershell
Set-Location -LiteralPath '.\web'
Get-Location
node --version
npm.cmd --version
npm.cmd ci
npm.cmd run check
npm.cmd test
npm.cmd run deploy:cloudflare -- --dry-run
```

Comprueba que estás en la carpeta que contiene `package.json` y `wrangler.jsonc`. El proyecto usa Node.js 24 y `--dry-run` deja una compilación local sin publicar.

El paquete sale de la base local `web/.local/catalog.sqlite`. Si es una copia nueva, abre primero `npm.cmd run dev`, visita la [portada local](http://127.0.0.1:4321/) y comprueba que aparecen los contenidos. Revisa en el panel el catálogo que quieres subir. Si vas a publicar, confirma las referencias, los precios, WhatsApp y los derechos de uso de las fotos.

```powershell
npm.cmd run package:cloudflare
$paquete = Read-Host 'Pega la ruta completa del paquete que imprimió el comando'
$paquete = (Resolve-Path -LiteralPath $paquete).Path
Get-ChildItem -LiteralPath $paquete
node scripts/test-cloudflare.mjs "$paquete"
```

Debes ver `catalog.sql`, `manifest.json` y la carpeta `media`. Conserva el paquete en privado. Incluye el catálogo, los proyectos y el contenido actual, además de los SKU internos y de proveedor. Las cuentas, contraseñas, sesiones, enlaces y el buzón de prueba quedan excluidos. Si cierras PowerShell, vuelve a ejecutar `Set-Location` y reasigna `$paquete` al abrirlo.

## 3. Configurar Resend y el DNS de envío

`web@avisos.gestionesencialsas.com` es la dirección que Resend pone como remitente de las invitaciones y los enlaces de recuperación. Basta con verificar el subdominio y configurar la clave de envío. El esquema sigue teniendo dos buzones y dos cuentas de Google Workspace.

1. Abre [Resend](https://resend.com/) con una cuenta bajo control de la empresa. Ve a **Domains → Add Domain**, escribe `avisos.gestionesencialsas.com` y confirma **Add Domain**.
2. En la ficha del subdominio, copia cada registro del bloque de envío según lo muestre Resend. Conserva **tipo, nombre, valor y prioridad** cuando corresponda. Google Workspace sigue gestionando el correo del dominio principal.
3. Confirma quién administra hoy el DNS. En PowerShell ejecuta `Resolve-DnsName gestionesencialsas.com -Type NS`. Si la zona está en Squarespace, entra en su **Domains dashboard → gestionesencialsas.com → DNS → DNS Settings → Add Record**. Si está activa en Cloudflare, abre **gestionesencialsas.com → DNS → Records → Add record**. Agrega los registros del subdominio uno por uno, usando el nombre relativo que solicite el formulario. Verifica que el sufijo del dominio figure una sola vez. En Cloudflare, si se solicita un CNAME de correo, usa **DNS only**.
4. Vuelve a **Resend → Domains → avisos.gestionesencialsas.com** y pulsa **Verify DNS Records**. Comprueba que el estado figure como **Verified** antes de probar la recuperación del panel.
5. En **API Keys → Create API Key**, crea una clave llamada `gestion-esencial-staging`. Selecciona **Sending access** y limita la clave al subdominio verificado si el formulario ofrece ese selector. Guarda la clave en un gestor de contraseñas en cuanto aparezca. Repite con el nombre `gestion-esencial-produccion` al preparar el entorno final. El remitente del proyecto es `web@avisos.gestionesencialsas.com`. [Dominios en Resend](https://resend.com/docs/dashboard/domains/introduction) · [Claves de API en Resend](https://resend.com/docs/dashboard/api-keys/introduction) · [DNS en Squarespace](https://support.squarespace.com/hc/en-us/articles/360002101888-Edit-your-domain-s-DNS-records)

## 4. Desplegar y cargar el entorno de pruebas

1. En el [panel de Cloudflare](https://dash.cloudflare.com/), selecciona la cuenta de la empresa. En **Workers & Pages**, busca **Your subdomain** y consulta o registra el subdominio `workers.dev`. Apunta su nombre para el paso 3.
2. En PowerShell, desde `web`, ejecuta estos comandos. `wrangler login` abre una autorización en el navegador. Continúa solo si `whoami` muestra la cuenta de la empresa y el usuario esperado.

   ```powershell
   npx.cmd wrangler login
   npx.cmd wrangler whoami
   npx.cmd wrangler d1 create gestion-esencial-staging
   npx.cmd wrangler r2 bucket create gestion-esencial-staging-media
   Copy-Item -LiteralPath '.\wrangler.jsonc' -Destination '.\.local\wrangler.base.jsonc'
   ```

   Copia el `database_id` de la D1 de pruebas. Si R2 solicita activar el servicio o agregar facturación, confírmalo con quien administra la cuenta. El bucket queda privado. Deja desactivados el enlace público `r2.dev` y cualquier dominio público del bucket. [Configuración de workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) · [Migraciones D1](https://developers.cloudflare.com/d1/reference/migrations/)

3. Abre `web/wrangler.jsonc` en el editor y cambia **solo** los campos de esta tabla. Escribe el UUID real y reemplaza `SUBDOMINIO` con el nombre de Workers que viste en el panel. El origen va sin barra final.

   | Campo | Valor de pruebas |
   | --- | --- |
   | `name` | `gestion-esencial-staging` |
   | `workers_dev` | `true` |
   | `preview_urls` | `false` |
   | `vars.PUBLIC_ORIGIN` | `https://gestion-esencial-staging.SUBDOMINIO.workers.dev` |
   | `vars.ALLOW_INDEXING` | `"0"` |
   | `d1_databases[0].database_name` | `gestion-esencial-staging` |
   | `d1_databases[0].database_id` | UUID devuelto por el comando D1 |
   | `r2_buckets[0].bucket_name` | `gestion-esencial-staging-media` |

   Conserva los nombres de los bindings `DB`, `MEDIA` e `IMAGES` y deja la configuración de rutas personalizadas para producción.

4. Aplica el esquema y publica el Worker de pruebas. La portada puede fallar hasta que se cargue el catálogo en el siguiente paso:

   ```powershell
   npx.cmd wrangler d1 migrations apply DB --remote --config wrangler.jsonc
   npm.cmd run deploy:cloudflare
   ```

5. En Cloudflare, ve a **Workers & Pages → gestion-esencial-staging → Domains**. Si el panel usa el diseño anterior, busca **Settings → Domains & Routes**. En la fila de `workers.dev`, habilita **Cloudflare Access** y usa **Manage Cloudflare Access** para configurar una política **Allow → Include → Emails** con las direcciones autorizadas. Si necesitas PIN por correo, habilita **One-time PIN** como método de acceso. Prueba en una ventana privada que se pide autorización antes de importar datos privados. [Protección de Workers con Access](https://developers.cloudflare.com/changelog/post/2025-12-03-reusable-access-policies/) · [Políticas de Access](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/)
6. Carga las fotos y el catálogo en **la D1 nueva**. El SQL se importa una sola vez por base. Si un comando falla, revisa el mensaje antes de seguir.

   ```powershell
   node scripts/upload-cloudflare-media.mjs "$paquete" gestion-esencial-staging-media --remote
   $catalogo = Join-Path $paquete 'catalog.sql'
   npx.cmd wrangler d1 execute DB --remote --config wrangler.jsonc --file "$catalogo"
   ```

## 5. Activar al propietario, invitar al administrador y probar el sitio

### Configurar al propietario

El correo `administracion@gestionesencialsas.com` ya está definido en `vars.GE_OWNER_EMAIL` de `web/wrangler.jsonc`. Conserva ese valor en pruebas y producción. Con `wrangler.jsonc` apuntando al Worker correcto, ejecuta cada comando por separado. Introduce los valores secretos cuando Wrangler los pida.

```powershell
npx.cmd wrangler secret put RESEND_API_KEY --config wrangler.jsonc
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npx.cmd wrangler secret put GE_SETUP_TOKEN --config wrangler.jsonc
```

1. Usa la clave Resend del entorno para `RESEND_API_KEY` y el código aleatorio recién generado para `GE_SETUP_TOKEN`.
2. Abre el origen del entorno seguido de **`/admin/configurar`**. Introduce `administracion@gestionesencialsas.com`, el código de configuración y una contraseña propia del panel. Pulsa **Crear cuenta e ingresar**.
3. Confirma que se abre el panel. Luego elimina el código de activación del Worker. La cuenta permanece activa.

   ```powershell
   npx.cmd wrangler secret delete GE_SETUP_TOKEN --config wrangler.jsonc
   ```

### Dar acceso a la persona designada

1. Desde la sesión del propietario abre **Usuarios** (`/admin/usuarios`). En **Usuarios y accesos**, usa **Verificar identidad** y confirma la contraseña del panel si han pasado más de cinco minutos desde el ingreso o la última verificación.
2. En **Invitar a un administrador**, escribe `web.admin@gestionesencialsas.com` o la dirección elegida para el segundo buzón. Pulsa **Crear invitación**.
3. La persona designada abre la invitación en su Gmail, sigue el enlace y establece su propia contraseña del sitio. Después puede entrar por **`/admin/login`** con ese correo. Si el entorno de pruebas usa Cloudflare Access, incluye ambas direcciones en la política de acceso del entorno.
4. En una ventana privada comprueba que el administrador puede gestionar el contenido y que `/admin/usuarios` está reservado al propietario. Desde la cuenta propietaria, abre **Ver sesiones** para revisar las sesiones de cualquiera de las dos cuentas o revocarlas.
5. En el entorno de pruebas, usa **Desactivar** en la fila del administrador y comprueba que se cierran sus sesiones. Pulsa **Restaurar** para enviar una nueva invitación. La cuenta queda pendiente hasta que la persona siga el nuevo enlace y establezca su contraseña.

### Comprobar el entorno de pruebas

1. Con la cuenta de uso, crea un producto, sube una foto, publícalo y luego ocúltalo. Comprueba que deja de verse. Desde **`/admin/login` → Recuperar acceso**, solicita un enlace para la cuenta de uso, comprueba su entrega en Gmail y completa el cambio. En **Resend → Emails**, revisa el estado si el correo no llega. Comprueba también el catálogo, la búsqueda, los proyectos y el botón de WhatsApp.
2. En Cloudflare, revisa **Workers & Pages → Worker de pruebas → Observability** y confirma el rendimiento real del inicio de sesión con el plan configurado en la sección 0.

## 6. Conectar el dominio y publicar producción

### Preparar la zona DNS

1. En el registrador, abre el dominio y guarda una copia de los **nameservers** actuales y una lista de los registros DNS con **tipo, nombre, valor, prioridad y TTL**. En particular, guarda los MX de Google, SPF, DKIM, DMARC, verificaciones, registros de Resend y los registros actuales de la web.
2. En Cloudflare, entra en la cuenta de la empresa y sigue **Domains → Add a domain**. Introduce `gestionesencialsas.com`. Revisa los registros detectados en **DNS → Records** y agrega los que falten antes de cambiar los nameservers. Conserva los registros de la portada anterior durante este paso. Si hay un DS de DNSSEC anterior activo, sigue la instrucción del registrador para retirarlo o deshabilitarlo durante el cambio y vuelve a habilitar DNSSEC con la configuración de Cloudflare una vez activa la zona.
3. En **Cloudflare → gestionesencialsas.com → Overview**, copia los dos nameservers asignados. Si el registrador sigue siendo Squarespace, entra en **Domains dashboard → gestionesencialsas.com → DNS → Domain Nameservers → Use Custom Nameservers**. Reautentícate si se solicita, pega ambos y pulsa **Save**.
4. Espera a que **Overview** muestre **Active**. Desde PowerShell confirma la delegación y los MX. Desde Gmail vuelve a probar envío y recepción con otro proveedor antes de cambiar el destino de la web.

   ```powershell
   Resolve-DnsName gestionesencialsas.com -Type NS
   Resolve-DnsName gestionesencialsas.com -Type MX
   ```

   [Alta de un dominio en Cloudflare](https://developers.cloudflare.com/fundamentals/manage-domains/add-site/) · [Cambio de nameservers en Squarespace](https://support.squarespace.com/hc/en-us/articles/4404183898125-Review-change-or-reset-your-domain-s-nameservers)

### Publicar en la raíz del dominio

1. Crea en la misma cuenta empresarial recursos distintos de los de pruebas:

   ```powershell
   npx.cmd wrangler d1 create gestion-esencial
   npx.cmd wrangler r2 bucket create gestion-esencial-media
   ```

2. En `web/wrangler.jsonc`, cambia `name` a `gestion-esencial`, `workers_dev` y `preview_urls` a `false`, y `vars.PUBLIC_ORIGIN` a `https://gestionesencialsas.com`. Mantén `vars.ALLOW_INDEXING` en `"0"` mientras validas. Pon `gestion-esencial` y el **UUID de producción** en `d1_databases[0]`, y `gestion-esencial-media` en `r2_buckets[0].bucket_name`. Agrega esta propiedad de primer nivel, con la coma correspondiente entre propiedades:

   ```json
   "routes": [{ "pattern": "gestionesencialsas.com", "custom_domain": true }]
   ```

3. En **Cloudflare → DNS → Records**, identifica el registro **web** anterior del dominio raíz. Guarda su configuración. Si Cloudflare detecta un CNAME incompatible al crear el dominio personalizado, retira únicamente ese CNAME web anterior durante el cambio de la web. Conserva los registros de correo.
4. Aplica el esquema, carga los datos definitivos y despliega. Verifica primero que `$paquete` apunta a la copia aprobada:

   ```powershell
   npx.cmd wrangler d1 migrations apply DB --remote --config wrangler.jsonc
   node scripts/upload-cloudflare-media.mjs "$paquete" gestion-esencial-media --remote
   $catalogo = Join-Path $paquete 'catalog.sql'
   npx.cmd wrangler d1 execute DB --remote --config wrangler.jsonc --file "$catalogo"
   npm.cmd run deploy:cloudflare
   ```

5. En **Workers & Pages → gestion-esencial → Domains**, confirma que figura `gestionesencialsas.com`. Si gestionas la ruta desde el panel, el recorrido alternativo es **Settings → Domains & Routes → Add → Custom Domain**. La ruta declarada en `wrangler.jsonc` mantiene la configuración en los siguientes despliegues.
6. Sigue la sección 5 en el dominio final con los **secretos de producción**. Crea al propietario `administracion@gestionesencialsas.com` e invita a la misma persona con el segundo buzón. Las cuentas del panel y las sesiones se crean por entorno, reutilizando las dos direcciones existentes. Si el sitio devuelve un error o no abre por HTTPS, revisa **Workers & Pages → gestion-esencial → Observability** y la sección **SSL/TLS → Edge Certificates** de la zona. Si debes volver a la portada anterior, retira primero la ruta de producción del Worker y repón el registro web que guardaste.
7. Verifica en una ventana privada la portada y el catálogo. Comprueba el ingreso de ambos roles y prueba las invitaciones, la recuperación y el cambio de correo enviados por Resend. El token llega en el fragmento `#token=…` y el formulario lo retira de la barra de direcciones al abrir. En Cloudflare, confirma que **SSL/TLS → Edge Certificates → Always Use HTTPS** esté activo y que ambos buckets R2 sigan privados. [HTTPS en Cloudflare](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
8. Una vez aprobada la web, cambia `vars.ALLOW_INDEXING` a `"1"` en `web/wrangler.jsonc` y ejecuta de nuevo `npm.cmd run deploy:cloudflare`. Esto habilita el rastreo público y el sitemap del dominio final. Conserva `"0"` en el entorno de pruebas. [Dominios personalizados de Workers](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

### Redirigir `www` al dominio principal

1. En **gestionesencialsas.com → DNS → Records**, localiza `www`. Para usarlo solo como redirección, guarda el registro web antiguo y sustitúyelo por un registro **A**, con **Name** `www`, **IPv4 address** `192.0.2.1` y **Proxy status** en **Proxied**. Si ya existe un registro proxied preparado para este fin, reutilízalo.
2. Ve a **Rules → Overview → Create rule → Redirect Rule**. Nombra la regla `www al dominio principal` y selecciona **Wildcard pattern**.
3. En **Request URL** escribe `http*://www.gestionesencialsas.com/*`. En **Target URL** escribe literalmente `https://gestionesencialsas.com/${2}`. Selecciona **301**, marca **Preserve query string** y pulsa **Deploy**. El primer asterisco corresponde al protocolo y el segundo a la ruta.
4. Abre [el catálogo con www](https://www.gestionesencialsas.com/catalogo) y comprueba que cambia a [el catálogo del dominio principal](https://gestionesencialsas.com/catalogo). [Crear una regla de redirección](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-dashboard/) · [DNS para redirecciones](https://developers.cloudflare.com/fundamentals/manage-domains/redirect-domain/)

## 7. Actualizar Google después de publicar

### Perfil de Empresa en Google, si existe

1. Entra en [Perfil de Empresa](https://business.google.com/) con el Google que figure como propietario. Selecciona **Gestión Esencial** y comprueba el nombre y la ubicación de la ficha.
2. Si la persona designada también gestionará la ficha de Google, abre **⋮ → Ajustes del Perfil de Empresa → Personas y acceso → Añadir**. Escribe el segundo correo, selecciona **Administrador** y pulsa **Invitar**. La persona debe aceptar el enlace desde su Gmail. La edición del sitio se habilita desde el panel web en la sección 5.
3. Desde la ficha correcta en Google, abre **Editar perfil → Información de la empresa → Contacto → Sitio web**. Escribe `https://gestionesencialsas.com` y pulsa **Guardar**. Si no encuentras una ficha bajo control de la empresa, busca primero el nombre y la ubicación para confirmar si ya existe antes de crear otra. [Gestionar propietarios y administradores del Perfil de Empresa](https://support.google.com/business/answer/3403100)

### Search Console, para gestionar la presencia en búsqueda

1. Entra en [Google Search Console](https://search.google.com/search-console/) con `administracion@gestionesencialsas.com`. En el selector de propiedades, pulsa **Añadir propiedad → Dominio**.
2. Escribe `gestionesencialsas.com`, sin `https://` ni rutas, pulsa **Continuar** y copia el valor TXT de verificación.
3. En **Cloudflare → gestionesencialsas.com → DNS → Records → Add record**, selecciona **TXT**, usa `@` para la raíz y pega el valor de Google. Guarda el registro y vuelve a Search Console para pulsar **Verificar**.
4. Con `ALLOW_INDEXING=1` publicado, usa **Inspección de URLs** con `https://gestionesencialsas.com/`. Comprueba que Google puede acceder y pulsa **Solicitar indexación** si la página responde correctamente. [Añadir una propiedad](https://support.google.com/webmasters/answer/34592) · [Inspección de URLs](https://support.google.com/webmasters/answer/9012289)
5. Abre `/robots.txt` y `/sitemap.xml` en el dominio final. Comprueba que el sitemap contiene únicamente las páginas públicas y fichas publicadas. En Search Console, abre **Sitemaps**, escribe `sitemap.xml` y envíalo. [Enviar un sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

## 8. Respaldar los datos de producción

1. Desde `web`, con `wrangler.jsonc` apuntando a producción, exporta D1 a una ubicación restringida fuera de Git. Registra la fecha y el marcador de Time Travel para poder coordinar el punto de recuperación con el respaldo de objetos. La exportación completa incluye datos de autenticación. [Comandos de D1](https://developers.cloudflare.com/workers/wrangler/commands/d1/) · [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)

   ```powershell
   npx.cmd wrangler d1 export DB --remote --config wrangler.jsonc --output '.\.local\d1-produccion.sql'
   npx.cmd wrangler d1 time-travel info DB --config wrangler.jsonc
   ```

2. Copia los objetos de `gestion-esencial-media` a un destino privado e independiente, con Rclone y credenciales de R2 limitadas a lectura del bucket de origen. Conserva los nombres de los objetos y registra la fecha de la copia. [Rclone para R2](https://developers.cloudflare.com/r2/examples/rclone/)
3. Ensaya la recuperación con una base y un bucket separados. Comprueba catálogo, acceso administrativo y una muestra de fotos. Si se necesita recuperar producción, conserva primero una copia del estado actual. Evalúa qué sesiones y enlaces de acceso habría que revocar, porque una restauración devuelve los registros de autenticación al punto recuperado.
