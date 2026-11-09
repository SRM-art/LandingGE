# Gestión Esencial — primera versión local

> Actualización (7 de noviembre de 2026): acceso por correo/contraseña implementado en local, con propietario, administradores, sesiones e invitaciones/recuperación simuladas. [06_PLAN_USUARIOS_Y_SESIONES.md](06_PLAN_USUARIOS_Y_SESIONES.md) y la sección 18 del plan 04 describen las decisiones y lo pendiente de producción.

Estado al **25 de octubre de 2026**: aplicación funcional para revisión, sin despliegue ni contratación de servicios.

Para revisar el módulo incorporado el **7 de noviembre de 2026**, sigue [07_GUIA_USUARIOS_LOCAL.md](07_GUIA_USUARIOS_LOCAL.md). Validación ampliada: 12 pruebas automatizadas, 78 comprobaciones HTTP del sitio y 66 de cuentas/seguridad/copias, todas sobre bases aisladas. La revisión visual comprobó alta del propietario, invitación, activación y pantallas de usuarios/sesiones. El cierre global se verificó por HTTP; su diálogo nativo interrumpió la herramienta de navegador durante la revisión visual.

## Abrir el sitio

- Sitio: http://127.0.0.1:4321/
- Administrador: http://127.0.0.1:4321/admin
- Revisión de móvil, tableta y escritorio: http://127.0.0.1:4321/admin/vista-previa

Abre el administrador. La primera vez se mostrará **Configurar propietario**: introduce un correo y una contraseña de 15 a 128 caracteres (puede ser una frase). No hay contraseña predeterminada. Una vez configurado, los siguientes accesos requieren esas credenciales. La aplicación escucha únicamente en `127.0.0.1`; esta configuración no sirve para exponer el panel a Internet.

El servidor debe permanecer encendido. Para volver a abrirlo después, haz doble clic en **INICIAR_LOCAL.cmd**, en esta carpeta, y deja abierta su ventana. Requiere Node.js 24 y las dependencias ya instaladas. Si el puerto está ocupado porque el sitio sigue abierto, usa la instancia existente. No abras varias instancias sobre la misma carpeta.

## Qué está disponible

| Área | Funcionalidad |
| --- | --- |
| Inicio | Carrusel automático cada 6 segundos, sin botones de movimiento, con tres diapositivas base permanentes y diapositivas adicionales editables, productos destacados, servicios, proyectos, presentación corporativa y contacto. |
| Catálogo | Búsqueda por nombre o SKU interno; filtros por categoría, presentación, color, acabado, uso, área y formato; paginación de 24 registros. El precio se filtra y ordena al seleccionar categoría y presentación. |
| Producto | Galería, referencia interna discreta, precio final COP por caja/unidad, contenido por presentación, equivalente informativo por m²/kg/metro lineal, descripción y ficha técnica. |
| Proyectos | Referencia propia, nombre, ciudad, sector, descripción, galería y productos utilizados. Filtros de ciudad y sector. |
| Conversión | Proyecto → producto → WhatsApp. En el producto, las obras asociadas aparecen como texto, sin enlaces de regreso. |
| Administrador | Crear, editar, publicar, dejar en borrador, ocultar y restaurar productos y proyectos. Subir imágenes, ordenar galerías y escribir sus descripciones. |
| Contenidos | Editar carrusel, tres servicios, presentación de la empresa, imagen corporativa, WhatsApp, teléfono, correo, dirección y horarios. |
| Recuperación | Ocultación lógica, restauración a borrador, bitácora de operaciones, exportación JSON y copia local de base e imágenes originales. |

Se cargaron **10 productos y 4 proyectos demostrativos** para revisar los recorridos. Los precios, las especificaciones y las relaciones son ilustrativos. Los recursos visuales se extrajeron de los materiales existentes; los originales no se modificaron. El inventario de imágenes está en `web/scripts/assets-manifest.json`.

La identidad utiliza el azul oscuro `#011F5F`, el azul `#1F4F78`, fondos blancos, tipografía Gill Sans MT disponible en el equipo y alternativas de sistema. No se redistribuyó el archivo de fuente sin una licencia web documentada.

## Recorrido sugerido de revisión

1. Revisa el inicio, cambia las diapositivas y entra al catálogo.
2. Busca `GE-001`, abre su ficha y comprueba el precio por caja y el equivalente por m².
3. Pulsa **Me interesa este producto**. Mientras no haya un teléfono configurado, verás el mensaje preparado con nombre y referencia interna.
4. Abre un proyecto y entra a uno de sus productos.
5. En el administrador, edita un producto o crea uno nuevo como borrador. Añade imágenes y completa el contenido por presentación.
6. Publica el producto. Para pisos por caja, hacen falta precio positivo, imagen y cobertura en m².
7. Ocúltalo desde la lista. Dejará de aparecer públicamente; su URL devolverá 404. Restaura desde **Ocultos**: volverá como borrador conservando los datos y las asociaciones.
8. Cambia un texto del carrusel o un servicio en **Inicio y contacto**, guarda y recarga el inicio.
9. Usa **Revisar diseño** para ver las páginas en un marco de 390, 768 o 1280 px.

**Configurar WhatsApp:** en Inicio y contacto, introduce código de país y número, solo dígitos. Después de guardar, el botón abrirá `wa.me` con el mensaje preparado; no envía el mensaje automáticamente. Se dejó vacío porque aún no se ha facilitado el número real.

## Cómo se conserva la información

La base está en `web/.local/catalog.sqlite`. Las imágenes permanecen dentro de `web/.local/seed-assets` y `web/.local/uploads`. Las variantes optimizadas se generan en `web/.local/variants`.

No borres `.local`: contiene el trabajo del administrador. Reiniciar el servidor o recompilar no reinicia los datos. La carga demostrativa solo ocurre si la base todavía no se ha inicializado.

El SKU externo se guarda en una tabla privada y no se incorpora al HTML público, a la búsqueda ni al mensaje de WhatsApp. Solo aparece en administración y en la exportación privada.

Ocultar no elimina filas, fotografías ni relaciones. Una imagen compartida puede seguir accesible si otro producto, proyecto o sección publicada aún la utiliza. Cuando deja de tener usos públicos, su endpoint devuelve 404 a visitantes. Los medios no se publican como una carpeta estática.

La bitácora registra operaciones. **No hay historial completo restaurable de cada edición**: modificar una descripción sustituye su valor actual. Las copias permiten recuperar un estado anterior del conjunto.

## Copias y recuperación

Haz doble clic en **CREAR_COPIA_LOCAL.cmd**, o ejecuta `npm run backup` dentro de `web`.

La copia se crea en `web/.local/backups/<fecha>/` e incluye:

- Una instantánea consistente de SQLite, incluso si el servidor está encendido.
- Los originales referenciados por esa instantánea, incluidos los de registros ocultos.
- Un manifiesto de fecha y cantidad de imágenes. Las sesiones se invalidan en la copia.

Las variantes no se copian porque pueden regenerarse. La exportación JSON del panel es útil para inspección o migración; **no contiene los archivos de imagen y no sustituye esta copia**.

Para probar una recuperación sin sobrescribir la información actual:

1. Detén el servidor con Ctrl+C en su ventana.
2. Abre PowerShell en `web`.
3. Define `$env:GE_DATA_DIR` con la ruta absoluta de la carpeta de copia.
4. Ejecuta `npm start` y comprueba registros e imágenes. Los cambios que hagas en esa sesión se guardarán en la copia seleccionada.
5. Para volver a la base habitual, detén el servidor, ejecuta `Remove-Item Env:GE_DATA_DIR` y después `npm start`.

No reemplaces ni borres la base original para realizar una prueba de restauración. Copia los respaldos a otro medio privado si necesitas protección frente a daño o pérdida del equipo; una copia en el mismo disco no cubre esos casos.

## Implementación local y diferencias frente al despliegue previsto

La aplicación está en `web/`: Astro 7, TypeScript, CSS propio y JavaScript ligero, validación Zod, adaptador Node, SQLite y Sharp para preparar imágenes WebP. Las dependencias están fijadas en `package-lock.json`.

La primera revisión utiliza SQL parametrizado y una migración relacional compatible conceptualmente con el modelo 3FN. El adaptador local de datos y archivos **todavía no es D1/R2**, y las consultas no se han trasladado a Drizzle. Se usa el ejecutor de pruebas de Node para las reglas y peticiones HTTP para la integración; se revisaron los recorridos visuales mediante navegador. No se añadió React porque los formularios actuales no lo requieren.

La conexión con Cloudflare, el adaptador de autenticación de producción, correo real, pruebas de CPU de Workers, respaldos remotos, dominio y certificados pertenecen a la fase de despliegue del plan 04. Esta versión no demuestra todavía que el alojamiento gratuito cumpla los límites de CPU.

Las rutas de producto de esta implementación son `/catalogo/[slug]`; sustituyen para esta revisión la ruta `/productos/[slug]` descrita en el plan. No existen URLs públicas previas que haya que redirigir.

## Límites de esta revisión

- El acceso ahora exige contraseña. El alta inicial visual, el buzón simulado y el adaptador Node son exclusivamente locales; se sustituyen y verifican antes de publicar.
- Se mantienen `noindex` y cabeceras de no almacenamiento para esta revisión. Sitemap, SEO de producción, caché controlada y su invalidación se completarán al desplegar.
- Las listas de ciudades, sectores, categorías y características están precargadas. Esta versión permite seleccionarlas, pero todavía no ofrece un CRUD de esos catálogos auxiliares.
- Los textos principales del carrusel, servicios, empresa y contacto son editables. Algunos rótulos de navegación y títulos estructurales permanecen en el diseño, no en un editor libre.
- El carrusel conserva tres diapositivas base permanentes y permite crear, editar, ocultar y restaurar diapositivas adicionales. Las nuevas usan el mismo diseño y un botón fijo hacia el catálogo. El bloque de servicios conserva tres entradas.
- El idioma y la moneda son español colombiano y COP. No hay inventario, pagos, carrito ni calculadora de cantidades para comprar.
- La vista móvil del panel permite revisar la adaptación visual; no sustituye pruebas en teléfonos físicos.
- Las fotografías y nombres de demostración deben reemplazarse o validarse antes de un lanzamiento real.

## Validación realizada

- `npm run check`: 0 errores, 0 advertencias y 0 sugerencias.
- `npm run build`: compilación correcta.
- `npm test`: 4 pruebas de reglas, privacidad, relaciones, restauración, conflictos de edición y transacciones.
- `npm run test:http`: 78 comprobaciones sobre una base aislada, incluidas rutas públicas, subida y privacidad de imágenes, CRUD, contenido, sesión, origen de solicitudes y SKU externo.
- Revisión en navegador del inicio, ficha, consulta WhatsApp, acceso al panel, edición y guardado de producto; revisión del inicio a 390 px.
- Copia local generada con la base y los originales referenciados.

## Comandos de desarrollo

Desde `web`:

```text
npm ci              Instalar exactamente las dependencias del archivo de bloqueo
npm run dev         Trabajar con recarga automática en 127.0.0.1:4321
npm run check       Revisar TypeScript y componentes Astro
npm test            Probar las reglas de datos en una base temporal
npm run build       Compilar la versión de revisión
npm run test:http   Probar la compilación en un puerto separado y datos aislados
npm start           Ejecutar la compilación local en 127.0.0.1:4321
npm run backup      Crear copia de base y originales
```

Para revisar cambios de código con `npm start`, recompila y reinicia. Para cambios guardados desde el administrador basta con recargar la página pública.


### Ajuste del carrusel — 25 de octubre de 2026

El avance automático de 6 segundos continúa cuando el cursor está sobre la imagen. Se pausa cuando un enlace del carrusel tiene el foco de teclado o cuando la pestaña está oculta. En Inicio y contacto se gestionan las tres bases; la sección Diapositivas adicionales permite agregar imagen y textos, editar, quitar mediante ocultación y restaurar como borrador. El botón de las adicionales siempre lleva al catálogo. Se generó una copia antes de aplicar la migración 002 y se comprobaron las operaciones sobre datos aislados.


### Límites de textos del carrusel

Texto superior: 32 caracteres. Título principal: 60. Descripción: 150. Texto del botón en diapositivas base: 28. Los formularios muestran contadores y bloquean el exceso; el servidor valida los mismos límites. Se normalizan saltos y espacios al guardar. La presentación limita las líneas visibles y permite dividir palabras largas para proteger la composición. Los tres contenidos existentes se mantienen dentro de estos límites.

