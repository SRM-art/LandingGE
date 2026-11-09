# LandingGE — Gestión Esencial

Versión local para revisión del equipo. Landing de la empresa y catálogo de productos y proyectos con consultas por WhatsApp. Estado actualizado el 9 de noviembre de 2026.

## Ejecutar una copia recién descargada

Requisitos: Git, Node.js 24 o superior compatible y npm. Desde la raíz del repositorio:

```sh
cd web
npm ci
npm run dev
```

Abre [el sitio](http://127.0.0.1:4321/) y [el administrador](http://127.0.0.1:4321/admin). El servidor escucha en el equipo local. Mantén la terminal abierta mientras revisas el sitio.

Al iniciar, se copian las imágenes de `web/demo-assets/` a la carpeta de trabajo. La base SQLite y los registros demostrativos se crean automáticamente en el primer acceso. Cada clon genera sus propios datos y cuentas.

La primera entrada al administrador permite configurar el correo y la contraseña del propietario. Elige una contraseña de 15 a 128 caracteres. El propietario puede invitar administradores, desactivarlos, restaurarlos y cerrar sesiones. Cada usuario puede gestionar su contraseña, correo y sesiones propias.

Para probar invitaciones y recuperación, abre [el buzón simulado](http://127.0.0.1:4321/admin/correo-local). Los mensajes permanecen en este equipo. El buzón es accesible sin sesión para permitir las pruebas de recuperación y permite usar los enlaces de las cuentas locales. Se debe retirar antes de cualquier exposición pública.

En Windows, después de `npm ci`, también puedes usar `INICIAR_LOCAL.cmd` desde la raíz.

## Funciones disponibles

- Landing editable y carrusel automático con tres slides base y slides adicionales.
- Catálogo con filtros, ordenamiento y páginas de 20 productos.
- Productos con precio final en COP por presentación completa, equivalencias informativas, imágenes, ficha técnica y SKU interno público. El SKU externo es privado y opcional.
- Proyectos con referencia, ciudad, imágenes y productos utilizados. El recorrido comercial conduce del proyecto al producto y a WhatsApp.
- Administración de contenido, roles propietario/administrador, sesiones revocables y recuperación simulada.
- Ocultación y restauración de registros, bitácora de contenido y exportación privada.

Los productos, proyectos, precios y fotografías iniciales son referenciales. El número de WhatsApp se configura en el panel. Revisa contenido, derechos de uso y datos de contacto antes de publicar.

## Organización y tecnologías

La aplicación usa Astro 7, TypeScript, CSS, Zod y Sharp. El servidor local usa Node.js y SQLite. Frontend y backend conviven en el mismo proyecto y proceso, con responsabilidades separadas por carpetas.

| Ruta | Contenido |
| --- | --- |
| `web/src/pages/` | Páginas públicas, panel y rutas API |
| `web/src/components/`, `layouts/`, `styles/` | Interfaz y estilos |
| `web/src/scripts/` | Interacción en el navegador |
| `web/src/server/` | Datos, validación, autenticación y operaciones |
| `web/migrations/` | Esquema y migraciones de SQLite |
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

## Pendiente antes de producción

1. Validar el adaptador de Astro y la autenticación en Cloudflare Workers/D1, incluyendo consumo de CPU y consistencia de la revocación de sesiones.
2. Conectar almacenamiento R2 y procesamiento de imágenes. La versión actual guarda los archivos en disco local y utiliza Sharp.
3. Sustituir el buzón y el alta visual de prueba por correo transaccional real y alta privada del propietario. Eliminar las rutas de prueba de la versión pública.
4. Configurar dominio canónico, HTTPS, cookies seguras, secretos por entorno, protección de rutas y límites distribuidos de intentos.
5. Completar revisión de contraseñas comprometidas, retención de datos técnicos, alertas, copias remotas y ensayo de restauración.
6. Verificar el contenido real, permisos de los recursos de marca e imágenes y costos vigentes de los servicios.

La autenticación local usa scrypt nativo de Node, cookies y sesiones en SQLite. Better Auth permanece como candidato para evaluación de producción. Cloudflare Access queda como opción para entornos internos de prueba. Esta entrega requiere los ajustes anteriores antes de exponer el panel en Internet.

## Documentación

- [Contexto y recursos](01_CONTEXTO_Y_RECURSOS.md)
- [Definición funcional](02_PLAN_DE_DEFINICION.md)
- [Modelo lógico en 3FN](03_MODELO_DE_DATOS_3FN.md)
- [Desarrollo y despliegue](04_PLAN_DE_DESARROLLO_Y_DESPLIEGUE.md), sección 18 para los cambios de autenticación
- [Versión local](05_VERSION_LOCAL.md)
- [Usuarios y sesiones](06_PLAN_USUARIOS_Y_SESIONES.md)
- [Guía de pruebas de usuarios](07_GUIA_USUARIOS_LOCAL.md)

Los planes conservan antecedentes históricos. Las actualizaciones fechadas y la sección 18 del plan de despliegue tienen precedencia sobre las referencias anteriores a un solo administrador o a Access como acceso del dueño. Algunos documentos describen recursos originales externos al repositorio.
