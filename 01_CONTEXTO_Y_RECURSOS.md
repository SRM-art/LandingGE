# Gestión Esencial: contexto, recursos y diseño

Fecha de revisión: 15 de octubre de 2026.

Requisitos actualizados: 17 de octubre de 2026. Alcance aceptado y plan técnico preparado: 24 de octubre de 2026. El inventario describe los originales; las decisiones de producto se recogen abajo y en `02_PLAN_DE_DEFINICION.md`. El modelo lógico está en `03_MODELO_DE_DATOS_3FN.md` y la arquitectura/fases/costos en `04_PLAN_DE_DESARROLLO_Y_DESPLIEGUE.md`.

## 1. Propósito y estado del proyecto

La carpeta contiene la identidad visual y una propuesta gráfica de sitio web para **Gestión Esencial S.A.S.**. Según los textos de la propuesta, la empresa asesora, distribuye e instala pisos y superficies para espacios residenciales, comerciales y corporativos. El listado de proyectos también contempla el sector institucional.

Se encontraron **22 archivos originales**, aproximadamente **579,4 MB**: 2 PDF, 4 documentos Illustrator, 8 PNG, 5 archivos de fuentes y 3 informes de empaquetado. No se encontró código de una aplicación, base de datos, configuración de despliegue ni instrucciones `AGENTS.md` dentro de la carpeta revisada.

La propuesta visual contiene elementos de comercio electrónico. El objetivo confirmado es convertirla en una **web corporativa con landing, catálogo público y proyectos**, con un espacio privado para administrar la información. La conversión comercial será el contacto por WhatsApp.

Este documento registra lo observado y los requisitos expresados. El alcance funcional se encuentra en `02_PLAN_DE_DEFINICION.md`. El 24 de octubre se elaboró `04_PLAN_DE_DESARROLLO_Y_DESPLIEGUE.md`, con Astro/TypeScript, Cloudflare Workers, D1, R2 y Access como arquitectura recomendada. No se ha implementado ni contratado infraestructura.

## 2. Inventario completo y utilidad de cada recurso

Las rutas de las tablas parten de `Gestión Esencial/`. Se conserva la escritura original de los archivos, incluidos los nombres que dicen «Escencial»; la marca visible es «Gestión Esencial».

### 2.1 Documentos principales

| Archivo | Contenido comprobado | Utilidad para el proyecto |
| --- | --- | --- |
| `Página web Gestión escencial.pdf` | 6 páginas de 1920 × 1080 unidades PDF, con composiciones de escritorio: inicio, catálogo, producto, especificaciones, nosotros y proyectos. | Referencia principal para reproducir composición, jerarquía, navegación, imágenes y componentes. No es una web funcional. |
| `Gestión Escencial Manual de marca.pdf` | 21 páginas: concepto, construcción, versiones, protección, usos, colores, tipografía, iconos, plantillas, redes y aplicaciones de marca. | Fuente principal para preservar identidad y resolver decisiones visuales. |
| `gestion esencial logos.ai` | 8 mesas/páginas accesibles mediante su representación PDF: logo completo en aplicaciones y colores, más el símbolo G en distintas versiones. | Maestro editable para obtener versiones vectoriales y exportaciones específicas. Algunas mesas incluyen fotografías o fondos de aplicación; no deben exportarse indiscriminadamente como logo transparente. |

### 2.2 PNG del logo completo

Los ocho PNG de marca miden **4001 × 2250 px**, tienen canal alfa y márgenes transparentes amplios. Las descripciones siguientes se verificaron visualmente.

| Archivo | Qué es | Uso previsto |
| --- | --- | --- |
| `gestion esencial logo original png.png` | Logo completo bicolor: G en azul medio y resto en azul oscuro. | Versión principal para encabezado sobre fondo claro. |
| `gestion esencial logo azul png.png` | Logo completo en azul oscuro. | Aplicaciones monocromáticas sobre fondo claro. |
| `gestion esencial logo blanco png.png` | Logo completo en blanco. | Fondos oscuros o fotografía con contraste suficiente. |
| `gestion esencial logo negro png.png` | Logo completo en negro. | Aplicaciones monocromáticas neutras. |

### 2.3 PNG del símbolo G

Aunque estos archivos se llaman «logotipo», visualmente contienen solo el símbolo **G**, no el nombre completo.

| Archivo | Qué es | Uso previsto |
| --- | --- | --- |
| `gestion esencial logotipo 1.png` | G en azul medio. | Recurso de identidad y posible base para iconos de marca. |
| `gestion esencial logotipo 2.png` | G en azul oscuro. | Posible base para favicon y aplicaciones compactas. |
| `gestion esencial logotipo blanco.png` | G blanca. | Aplicaciones sobre fondos oscuros. |
| `gestion esencial logotipo negro.png` | G negra. | Aplicaciones monocromáticas. |

Para producción harán falta exportaciones con encuadre adecuado, respetando el área de protección. No conviene servir estos lienzos completos como iconos pequeños. El uso del símbolo a tamaños de favicon deberá revisarse visualmente.

### 2.4 Paquete editable de la web

Directorio: `gestion esencial pagina web editable_Carpeta/`.

| Archivo | Contenido y utilidad |
| --- | --- |
| `gestion esencial pagina web editable.ai` | Editable de la propuesta web, con 6 mesas/páginas de 1920 × 1080. Su estructura y contenido textual corresponden a las seis vistas del PDF. Fuente para obtener medidas, elementos vectoriales y fotografías incorporadas, sujeto a revisión de exportación. |
| `gestion esencial pagina web editable Informe.txt` | Informe de Illustrator: RGB, Adobe RGB (1998), mesa de 67,7333 × 38,1 cm y referencias a Gill Sans MT regular e italic. Registra que en el momento de empaquetar no había fuentes ni enlaces faltantes; no garantiza que todas las fuentes estén hoy incluidas en la carpeta. |
| `Fonts/gill-sans-mt-italic.ttf` | Fuente Gill Sans MT italic para reproducir el archivo editable. Su disponibilidad no acredita por sí sola permiso para servirla como fuente web. |

### 2.5 Paquete editable del manual

Directorio: `gestion esencial manual de marca editable_Carpeta/`.

| Archivo | Contenido y utilidad |
| --- | --- |
| `gestion esencial manual de marca editable.ai` | Editable del manual, con 21 mesas/páginas de 792 × 612. Permite recuperar reglas, recursos gráficos, iconografía y aplicaciones. |
| `gestion esencial manual de marca editable Informe.txt` | Informe de Illustrator: RGB, Adobe RGB (1998), 27,94 × 21,59 cm y uso de Gill Sans MT regular e italic. No reporta imágenes enlazadas ni enlaces faltantes al empaquetar. |
| `Fonts/gill-sans-mt-italic.ttf` | Copia de la misma fuente italic del paquete web. |

### 2.6 Paquete de redes sociales

Directorio: `Gestion esencial redes sociales_Carpeta/`.

| Archivo | Contenido y utilidad |
| --- | --- |
| `GESTION ESENCIAL copia.ai` | 14 mesas/páginas: 9 publicaciones de 1080 × 1350 y 5 historias de 1080 × 1920. Incluye servicios de instalación, consejos para elegir pisos y productos como Aquatech LVT, Vermont White, Mediterráneo y Lucca. Complementa el lenguaje gráfico y aporta referencias de servicios; no es una base de datos del catálogo. |
| `GESTION ESENCIAL copia Informe.txt` | Informe de Illustrator con perfil Adobe RGB (1998), unidades en píxeles y mesa informada de 1080 × 1920. Enumera regular, italic, bold y bold italic. Las mesas reales tienen dos formatos; el informe no describe individualmente todas ellas. |
| `Fonts/gill-sans-mt-italic.ttf` | Tercera copia de la fuente italic. Se comprobó por hash que las tres copias son idénticas. |
| `Fonts/Gill Sans MT Bold.ttf` | Variante negrita usada en composiciones de redes. |
| `Fonts/Gill Sans MT Bold Italic.ttf` | Variante negrita cursiva usada en composiciones de redes. |

**Falta detectada:** no se encontró un archivo de Gill Sans MT **regular**, aunque aparece en los informes y en el manual. Tampoco se encontraron archivos de licencia tipográfica ni versiones WOFF/WOFF2. Se debe resolver disponibilidad y permiso de uso web antes de fijar la entrega tipográfica.

## 3. Lectura del diseño web, pantalla por pantalla

Fuente: `Página web Gestión escencial.pdf`, páginas 1 a 6, revisadas visualmente.

| Página | Diseño observado | Adaptación al objetivo confirmado |
| --- | --- | --- |
| 1. Inicio | Encabezado blanco con logo, navegación, buscador azul y carrito. Fotografía de interior a gran tamaño, oscurecimiento azul a la izquierda, título «Instalación de pisos», mensaje comercial, botón de servicios, flechas e indicadores de carrusel y botón flotante de WhatsApp. | Mantener jerarquía y estilo. Renombrar Tienda a Catálogo, retirar carrito y definir destino de servicios. Carrusel confirmado el 17 de octubre. |
| 2. Tienda | Fondo blanco, título amplio, filtros laterales, ordenamiento y cuadrícula de tres columnas. Tarjetas con foto cuadrada, borde fino y pie azul con nombre y precio por caja. | Convertir en Catálogo, conservar tarjetas y estructura. Confirmar filtros y ordenamientos que realmente se necesitan. |
| 3. Producto | Miniaturas verticales, imagen principal, nombre, referencia, descripción, precio por caja y por m², enlace a especificaciones, selector de cantidad y botón de carrito. | Conservar galería. Para pisos: precio principal por caja y precio por m² calculado, informativo. Otros artículos usan su unidad real de venta. Retirar cantidad y carrito. Incluir WhatsApp con nombre y SKU interno, que también será visible como referencia discreta. |
| 4. Especificaciones | Tabla de usos, áreas, piezas por caja, garantía y m² por caja; acordeones de atributos, ventajas, ficha técnica, notas y recomendaciones. | Base visual para ficha estructurada. Incluir m² por caja en pisos y usarlo para calcular el equivalente por m². Adaptar campos a otros materiales y unidades. |
| 5. Nosotros | Imagen de marca a la izquierda, historia y experiencia a la derecha. Franja inferior con iconos y tres mensajes: años, proyectos y calidad. | Conservar composición y tono. Verificar cifras y afirmaciones; permitir editar contenido desde administración. |
| 6. Proyectos | Título, filtros horizontales por sector y tarjetas fotográficas grandes en dos columnas con nombre, sector, ciudad y flecha. | Conservar estilo. Añadir SKU propio del proyecto, detalle individual, galería y productos utilizados públicos. Recorrido confirmado: proyecto → producto → WhatsApp. |

El orden visual de la navegación es Inicio, Tienda, Nosotros, Proyectos y Contáctanos. Las flechas de menú sugieren desplegables, pero los documentos no especifican su contenido ni su comportamiento. Tampoco prueban que el encabezado sea fijo al hacer scroll.

### Pantallas y comportamientos sin diseño entregado

- Adaptaciones para móvil y tableta.
- Detalle de proyecto y productos relacionados.
- Contacto, pie de página y destino de «Conoce nuestros servicios».
- Inicio de sesión, recuperación de acceso y todo el administrador.
- Formularios de creación/edición, biblioteca de imágenes y gestión de contenidos de la landing.
- Estados vacíos, sin resultados, errores, carga, confirmación de eliminación y páginas no encontradas.
- Comportamiento real de búsqueda, filtros, ordenamiento, carrusel, miniaturas y acordeones.

Estos vacíos requieren diseño coherente con la marca; no deben resolverse encogiendo las pantallas de escritorio como imágenes.

## 4. Reglas de identidad que deben conservarse

Fuente: `Gestión Escencial Manual de marca.pdf`, especialmente páginas 2 a 10.

| Elemento | Evidencia y criterio |
| --- | --- |
| Azul principal | **Black Sea Night: #011F5F**, RGB 1, 31, 95. |
| Azul secundario | **Theatre Blue: #1F4F78**, RGB 31, 79, 120. |
| Colores de apoyo | Blanco, grises claros y tonos aclarados de azul visibles en las composiciones. Los valores auxiliares del sitio se deberán extraer/definir; no se asignan códigos inventados. |
| Tipografía | **Gill Sans MT**, regular e italic como base; en redes también bold y bold italic. El logo es un recurso gráfico: no debe reconstruirse escribiendo el nombre con una fuente parecida. |
| Logo | Mantener proporciones, colores, contraste y área de protección. El manual indica tamaño digital mínimo del logo completo de **130 × 56 px**. |
| Composición | Espacios amplios, fotografías arquitectónicas protagonistas, texto azul sobre blanco, títulos grandes y cursivas para ciertos encabezados. |
| Componentes | Líneas divisorias finas, pies de tarjetas y botones con esquinas redondeadas, iconos de trazo simple y remates redondeados. |
| Fotografía | Interiores y detalles de pisos; sobreposiciones azules para legibilidad. Evitar recortes que oculten el material o el espacio relevante. |

La fidelidad se evaluará por identidad, jerarquía y composición, junto con legibilidad y uso real en móvil. La edición de contenidos debe permitir cambiar información sin convertir el administrador en un editor libre que altere arbitrariamente el diseño.

## 5. Contenido reutilizable y precauciones concretas

1. **Fotografías sin archivos independientes.** Los únicos PNG sueltos son de marca. Las fotografías, texturas de pisos e iconos están incorporados en los documentos. Será necesario exportar recursos o solicitar originales, verificar calidad y confirmar cuáles representan proyectos/productos reales autorizados.
2. **No hay catálogo estructurado.** Los nombres, precios, referencias y fichas de los diseños son referencias de contenido; no se deben importar como datos reales sin validación.
3. **Ejemplo comercial inconsistente.** El producto ilustrado muestra 99.000 COP por caja, 75.000 COP por m² y una ficha con 1,60 m² por caja. No son valores coherentes como conversión directa. El precio informativo por m² se calculará desde el precio final por caja y su cobertura, sin editarlo por separado.
4. **Texto por revisar.** Hay descripciones extensas/repetidas, errores ortográficos y ejemplos como «+5 años» y «+15 proyectos». Validar redacción, cifras y afirmaciones técnicas con la empresa antes de publicar.
5. **Extracción de texto imperfecta.** Algunos textos del PDF se extraen duplicados aunque visualmente se muestran como una sola etiqueta. El texto extraído no debe copiarse automáticamente a producción.
6. **Fuentes incompletas.** Falta regular y no hay documentación de licencia de uso web. Resolver esto manteniendo la identidad como prioridad; cualquier alternativa deberá revisarse visualmente.
7. **Perfil de color.** Los paquetes declaran Adobe RGB (1998); al preparar recursos web se deberá controlar la conversión de color para mantener la consistencia con los valores definidos por la marca.
8. **Archivos maestros pesados.** Los AI/PDF son originales de trabajo, no recursos que deban cargarse completos en una página. Las futuras exportaciones deben ser específicas para su uso.

## 6. Requisitos confirmados por el usuario

### Experiencia pública

- Landing corporativa y catálogo de productos, conservando los estilos entregados.
- Portafolio de proyectos con nombre, **SKU/referencia propia**, ciudad e imágenes.
- Sin carrito, compras en línea, pagos ni flujo de pedidos.
- Clientes consultan información sin necesitar cuenta para navegar.
- Cada producto tendrá nombre, precio, imágenes, SKU interno, SKU externo, ficha técnica estándar para pisos y descripción.
- **Los pisos se venden por caja.** El precio final por caja es el principal; el equivalente por m² se calcula desde los m² por caja y se muestra solo como información. Esta precisión del 17 de octubre reemplaza la anterior exclusión del precio por m².
- También se ofrecerán complementos como pegante, cemento y zócalos. Todo se vende por producto/presentación completa, como unidad o caja. Saco, bolsa o pieza describen el embalaje/presentación; los valores por kg, m² o metro lineal se calculan únicamente como información, sin venta fraccionada.
- Precios finales en COP, mantenidos manualmente por el administrador.
- SKU interno público, con tipografía descriptiva diferenciada, color secundario y tamaño menor pero legible; también se incluye en WhatsApp. SKU externo privado y opcional.
- **Un producto independiente por SKU.** Confirmado durante esta revisión; no se requiere un sistema de variantes agrupadas en esta etapa.
- Botón del producto que abre WhatsApp con mensaje preparado: «Hola, estoy interesado en [nombre del producto], SKU [SKU interno], y me interesa más información».
- Relación muchos a muchos confirmada, sin exigir asociaciones para publicar. Recorrido comercial: **proyecto → producto → WhatsApp**. En producto, una referencia textual opcional a obras donde se usó, sin enlaces de vuelta a proyectos.
- Carrusel e información en Inicio. Los filtros se adaptan a los atributos que correspondan a cada familia de producto.
- Fotografías y nombres de productos/proyectos son referenciales y pueden sustituirse o ampliarse en el diseño. Se conservan nombre de empresa, colores, identidad y estilos. Las demostraciones no deben presentarse como obras reales al publicar.

### Administración

- Un administrador inicial; carga manual. Volumen inicial indicado: «150», todavía sin desglose de productos/proyectos ni fotos por registro. Espacio privado para crear, consultar y actualizar productos y proyectos.
- «Eliminar» significa **borrado lógico recuperable**: conservar datos y relaciones y ocultarlos totalmente de la experiencia pública. No habrá eliminación definitiva en el alcance funcional.
- Carga y actualización de imágenes e información.
- **También se editarán contenidos de la landing:** textos, banners, servicios y contacto. Confirmado durante esta revisión; falta definir los campos y límites de edición.

### Condiciones del trabajo

- Primero documentar recursos, comprender diseños y cerrar preguntas.
- Después elaborar un plan técnico con stack, tecnologías, seguridad, escalabilidad y despliegue económico.
- Cloudflare se evaluó junto con alternativas y quedó como arquitectura recomendada en el plan técnico del 24 de octubre; el nivel Free o Paid depende de la validación prevista. Todavía no hay contratación ni despliegue.
- Presupuesto inicial: **200.000 COP para dominio, infraestructura y certificados**. Preferencia por pagos anuales y por minimizar costos posteriores conservando calidad. No es presupuesto mensual ni de desarrollo; se compararán arranque y renovaciones al elaborar el plan técnico.
- No iniciar implementación ni presentar una arquitectura como definitiva mientras sigan abiertas las decisiones necesarias.

## 7. Alcance de esta revisión

Se inventariaron los 22 originales, se extrajo texto y estructura de los PDF y de la representación PDF compatible de los AI, se revisaron visualmente las seis pantallas web, el manual, las variantes PNG y las composiciones de logos/redes. No se abrió Illustrator para auditar capas, efectos o editabilidad completa de cada objeto. Que un AI pueda leerse como PDF no demuestra que todos sus componentes sean editables de la misma forma.

Los originales se conservaron sin modificaciones. Los archivos de análisis y renderización temporal no forman parte de los recursos originales ni constituyen una implementación del sitio.
