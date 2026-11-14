# Simulador de compra de pisos

## Alcance

Disponible únicamente en la ficha pública de productos de la categoría con código `pisos`, vendidos por `CAJA`. No se habilita por nombre del producto ni por tener m²: quedan excluidos porcelanatos, cerámicas, zócalos y adhesivos de otras categorías. La cobertura proviene del campo M2 por presentación de la ficha; nunca se deduce de las dimensiones de una pieza. Si falta o es inválida, se muestra una indicación para consultar con un asesor.

El botón **¡Calcula tu espacio!** abre el simulador en una ventana modal. Se cierra con la X, Escape o un clic en el fondo; conserva los valores al reabrir y devuelve el foco al botón. La página de fondo no se desplaza mientras está abierto.

## Cálculo

1. El visitante ingresa el área neta en m², sin desperdicio incluido.
2. Se añade un margen ajustable (10 % inicial; enteros entre 0 y 30).
3. Cajas = redondear hacia arriba [área × (1 + margen / 100) ÷ cobertura de una caja].
4. Cobertura comprada = cajas × m² por caja.
5. Total estimado = cajas × precio final de la caja, usando la oferta vigente cuando existe.

Ejemplo: 20 m², 10 % y 2,24 m²/caja → 22 m² requeridos → 10 cajas → 22,4 m² comprados. El excedente previsto y el sobrante por redondear a cajas completas son conceptos distintos.

La cuenta usa enteros y BigInt para evitar una caja adicional por errores de coma flotante. Acepta coma o punto decimal, hasta cuatro decimales, sin separadores de miles; área máxima 100.000 m². No guarda las medidas ni crea pedidos. El resultado se invalida al editar los datos para no consultar una cantidad anterior por error. El enlace de WhatsApp incluye producto, SKU interno, área, margen y cajas estimadas.

## Investigación y criterio

Consultado el 11 de noviembre de 2026:

- [Quick-Step: planificación de pisos](https://www.quick-step.co.uk/en-gb/room-types) recomienda considerar alrededor del 10 % para cortes.
- [Quick-Step: regla del 5 %](https://www.quick-step.ie/en-ie/frequently-asked-questions/general/webstore/flooring-cost-for-hardwood-laminate-and-vinyl) distingue 5 % en condiciones simples y 10 % en espacios con muchos ángulos.
- [Havwoods: preguntas de instalación](https://www.havwoods.com/int/faqs/) indica 8–12 % para tablas y 15–20 % para patrones, y recomienda consultar al instalador.
- [Cerámica San Lorenzo: cálculo de cajas](https://sanlorenzo.com.pe/como-calcular-la-cantidad-de-ceramico-que-necesito/) explica el uso de área, cobertura por caja y un margen de al menos 10 % en su contexto.

El 10 % es una referencia inicial del simulador, no una norma universal ni una garantía de suficiencia. El resultado debe confirmarse con instalador/asesor y las instrucciones del fabricante específico. El valor estimado cubre solo las cajas del producto; no incluye instalación, transporte ni otros materiales.
