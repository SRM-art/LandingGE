# LandingGE — Gestión Esencial

Sitio corporativo y catálogo de Gestión Esencial, con proyectos y consultas por WhatsApp. El mismo código permite ejecutar una versión local y compilar una versión para Cloudflare.

| Entorno | Cómo se ejecuta | Datos y correo |
| --- | --- | --- |
| **Local** | `npm run dev`, desde `web/`. Sitio y panel en `127.0.0.1:4321`. | Node.js, SQLite, archivos locales y buzón simulado. |
| **Cloudflare** | `npm run deploy:cloudflare -- --dry-run` valida la compilación. La publicación usa `npm run deploy:cloudflare` después de configurar el entorno. | Workers, D1, R2, Cloudflare Images y Resend. Cada entorno tiene su base de datos y almacenamiento propios. |

## Versión local

Requisitos: Git, Node.js 24 o superior compatible y npm. Desde la raíz del repositorio:

```sh
cd web
npm ci
npm run dev
```

Abre [el sitio](http://127.0.0.1:4321/) y [el administrador](http://127.0.0.1:4321/admin). El servidor escucha en el equipo local. Mantén la terminal abierta mientras revisas el sitio.

Al iniciar, se copian las imágenes de `web/demo-assets/` a la carpeta de trabajo. La base SQLite y los registros demostrativos se crean automáticamente en el primer acceso. Cada clon genera sus propios datos y cuentas.

La primera entrada al administrador permite configurar el correo y la contraseña del propietario. Elige una contraseña de 15 a 128 caracteres. El propietario puede invitar administradores, desactivarlos, restaurarlos y cerrar sesiones. Cada usuario puede gestionar su contraseña, correo y sesiones propias.

Para probar invitaciones y recuperación, abre [el buzón simulado](http://127.0.0.1:4321/admin/correo-local). Los mensajes permanecen en este equipo. El buzón local permite probar invitaciones y recuperación sin iniciar sesión. La configuración Docker de revisión protege ese acceso en el proxy y la versión Cloudflare deshabilita el buzón.

En Windows, después de `npm ci`, también puedes usar `INICIAR_LOCAL.cmd` desde la raíz.

## Funciones disponibles

- Landing editable, navegación fija en escritorio y carrusel de imágenes cada 9 segundos, con tres slides base, slides adicionales, flechas y gestos táctiles.
- Catálogo con navegación lateral por categoría, subcategoría y criterio. En **Administrador → Categorías** puedes editar, mover, ordenar, retirar y restaurar ramas. El editor de productos permite asignar una referencia a cualquiera de los tres niveles. La búsqueda, las ofertas y la paginación de 20 productos funcionan dentro de la rama elegida.
- Productos con precio final en COP por presentación completa, equivalencias informativas, imágenes, descripción y SKU interno público. El SKU externo es privado y opcional.
- Precio de oferta opcional: 0 desactiva el descuento; otro valor representa el precio final de oferta, inferior al normal. Porcentaje calculado automáticamente, medalla, precio anterior tachado y filtro de ofertas.
- Campos de precio del administrador con formato visual `$ 1.234.567`; el formato se retira antes de enviar los valores al servidor.
- Carrusel de hasta 8 productos en inicio: mayores porcentajes de descuento y, para completar, productos sin descuento de menor precio. Avanza un producto cada 6 segundos, con puntos, flechas y desplazamiento táctil.
- Simulador de compra en modal para productos marcados como aptos para piso, vendidos por caja y con cobertura en m². Calcula las cajas completas con un excedente ajustable de 10 % inicial, el total estimado y la consulta por WhatsApp.
- Proyectos con referencia, ciudad, imágenes y productos utilizados. El recorrido comercial conduce del proyecto al producto y a WhatsApp.
- Administración de contenido, roles propietario/administrador, sesiones revocables y recuperación por correo simulado en local y mediante Resend en Cloudflare.
- Ocultación y restauración de registros, bitácora de contenido y exportación privada.

Los productos, proyectos, precios y fotografías iniciales son referenciales. El número de WhatsApp se configura en el panel. Revisa contenido, derechos de uso y datos de contacto antes de publicar.

## Revisión aislada con Docker

Para una revisión temporal compartida, se añadió una configuración Docker independiente del arranque de desarrollo. Usa la compilación actual con usuario sin privilegios, código de solo lectura y una carpeta limitada para datos. La aplicación y el proxy corren dentro del contenedor.

Primero inicializa y configura la versión local descrita arriba: una cuenta recién clonada no incluye el usuario ni la contraseña de la demostración de otro equipo. Después, con Docker Desktop iniciado, ejecuta desde `web/`:

```sh
node scripts/prepare-review-data.mjs
docker compose -f compose.review.yaml up -d --build
```

Abre [la versión aislada](http://127.0.0.1:4322/). El preparador copia SQLite y los medios referenciados, conserva las cuentas y sus hashes, e invalida las sesiones anteriores en la copia. Si `.local/review-data/` ya existe, se conserva sin sobrescribir. Los cambios del administrador de esta versión quedan separados de la base original.

Para detenerla:

```sh
docker compose -f compose.review.yaml stop
```

El proxy escucha en `127.0.0.1:4319`. Un túnel temporal debe apuntar a ese proxy y su URL HTTPS exacta debe guardarse en `.local/review-origin.txt`. La configuración bloquea el buzón de correo simulado y el alta inicial a través del proxy. No conectes el túnel directamente al puerto 4322. No se incluyen el ejecutable de Cloudflare, enlaces públicos activos ni credenciales en este repositorio.

Esta configuración es para revisión y no sustituye los requisitos de producción. Docker debe mantenerse iniciado; apagar o suspender el equipo interrumpe el acceso. Después de modificar el código, vuelve a ejecutar el comando `up -d --build`.

Consulta [la guía de revisión aislada](08_REVISION_AISLADA_DOCKER.md), [el criterio del simulador de pisos](06_SIMULADOR_DE_PISOS.md) y [la procedencia del teléfono provisional](05_CONTACTO_PUBLICO.md).

## Organización y tecnologías

La aplicación usa Astro 7, TypeScript, CSS, Zod y Sharp. El servidor local usa Node.js y SQLite. Frontend y backend conviven en el mismo proyecto y proceso, con responsabilidades separadas por carpetas.

| Ruta | Contenido |
| --- | --- |
| `web/src/pages/` | Páginas públicas, panel y rutas API |
| `web/src/components/`, `layouts/`, `styles/` | Interfaz y estilos |
| `web/src/scripts/` | Interacción en el navegador |
| `web/src/server/` | Datos, validación, autenticación y operaciones |
| `web/migrations/` | Esquema y migraciones de SQLite |
| `web/migrations-cloudflare/` | Esquema de D1 para Cloudflare |
| `web/astro.cloudflare.config.mjs`, `web/wrangler.jsonc` | Compilación y recursos de Cloudflare |
| `web/demo-assets/` | Recursos referenciales para inicializar un clon |
| `web/public/brand/` | Marca utilizada por la interfaz |
| `web/tests/`, `web/scripts/` | Pruebas y herramientas locales |
| `web/.local/` | Datos privados generados en cada equipo, excluidos de Git |

## Comandos

Ejecuta estos comandos desde `web/`.

```sh
npm run check
npm test
npm run build
npm run test:http
npm run test:auth
```

Las pruebas HTTP requieren una compilación previa y usan los puertos 14321 y 14322, con bases y archivos temporales aislados. Para revisar la compilación ejecuta `npm start` después de `npm run build`. Detén previamente el servidor de desarrollo si ocupa el puerto 4321.

Para crear un respaldo local:

```sh
npm run backup
```

El respaldo contiene la base y los medios referenciados, y deja invalidados los accesos y enlaces temporales. Contiene información sensible y debe guardarse en un lugar restringido. El buzón simulado queda excluido. La carpeta `.local/` conserva los cambios entre reinicios y debe respaldarse antes de cualquier traslado o restauración.

## Archivos excluidos del repositorio

Git excluye bases de datos, cuentas, sesiones, buzón simulado, imágenes cargadas por usuarios, respaldos, archivos `.env`, dependencias y compilaciones. Los originales de diseño, hojas de cálculo y archivos temporales del espacio de trabajo quedan fuera del alcance de este repositorio. Los recursos de demostración y la marca necesarios para revisar la interfaz sí se incluyen.

Evita agregar con `git add -f` archivos ignorados. Usa `npm ci` para respetar `package-lock.json`. Trabaja en ramas por cambio y revisa las diferencias antes de integrarlas. Las credenciales y cuentas de infraestructura se configuran por canales privados.

## Versión de despliegue en Cloudflare

Desde `web/`, instala las dependencias con `npm ci` y ejecuta la compilación de verificación sin publicar:

```sh
npm run deploy:cloudflare -- --dry-run
```

El visitante entra por la portada y el administrador accede directamente por `/admin`. Cloudflare usa la misma aplicación para ambas vistas. El panel exige una sesión válida y la barra de acceso rápido existe en la vista local.

Sigue la [guía de despliegue paso a paso](09_DESPLIEGUE_CLOUDFLARE.md) para habilitar la facturación, configurar Worker, D1, R2 y Resend, e importar el catálogo. Primero publica en un entorno de pruebas y verifica el inicio de sesión y la entrega de correos. Luego configura el dominio y habilita la indexación después de revisar el contenido público. La guía también explica cómo preparar y validar localmente el paquete antes de importarlo.

## Documentación

- [Contexto y recursos](01_CONTEXTO_Y_RECURSOS.md)
- [Definición funcional](02_PLAN_DE_DEFINICION.md)
- [Modelo lógico en 3FN](03_MODELO_DE_DATOS_3FN.md)
- [Desarrollo y despliegue](04_PLAN_DE_DESARROLLO_Y_DESPLIEGUE.md), sección 18 para los cambios de autenticación
- [Versión local](05_VERSION_LOCAL.md)
- [Usuarios y sesiones](06_PLAN_USUARIOS_Y_SESIONES.md)
- [Guía de pruebas de usuarios](07_GUIA_USUARIOS_LOCAL.md)

Los planes conservan antecedentes históricos. Las actualizaciones fechadas y la sección 18 del plan de despliegue tienen precedencia sobre las referencias anteriores a un solo administrador o a Access como acceso del dueño. Algunos documentos describen recursos originales externos al repositorio.
