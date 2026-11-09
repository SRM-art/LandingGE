import {z} from 'zod';
import {carouselLimits,carouselLabels} from '../domain/carousel.ts';

export function carouselText(field:keyof typeof carouselLimits,minimum=0){
 return z.string().trim()
  .min(minimum,`${carouselLabels[field]}: escribe al menos ${minimum} caracteres.`)
  .max(carouselLimits[field],`${carouselLabels[field]}: máximo ${carouselLimits[field]} caracteres.`)
  .transform(value=>value.replace(/\s+/g,' '));
}
