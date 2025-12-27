/**
 * Car Skins Catalog
 * Agrega nuevas skins aqui - solo necesitas la imagen en assets/skins/cars/
 */

import { CarSkin } from './types';

// Placeholder hasta que agregues las imagenes reales
const placeholderCar = require('@/assets/icons/pin.png');

export const CAR_SKINS: CarSkin[] = [
  {
    id: 'car_default',
    name: 'Clasico',
    description: 'El vehiculo clasico de siempre',
    price: 0,
    rarity: 'common',
    vehicleType: 'sedan',
    type: 'car',
    preview: placeholderCar,
  },
  {
    id: 'car_sport_red',
    name: 'Deportivo Rojo',
    description: 'Un elegante deportivo color rojo fuego',
    price: 500,
    rarity: 'rare',
    vehicleType: 'sport',
    type: 'car',
    preview: placeholderCar,
    isNew: true,
  },
  {
    id: 'car_suv_black',
    name: 'SUV Ejecutivo',
    description: 'SUV negro para viajes de negocios',
    price: 750,
    rarity: 'rare',
    vehicleType: 'suv',
    type: 'car',
    preview: placeholderCar,
  },
  {
    id: 'car_luxury_gold',
    name: 'Limusina Dorada',
    description: 'Para los que quieren llegar con estilo',
    price: 2000,
    rarity: 'legendary',
    vehicleType: 'luxury',
    type: 'car',
    preview: placeholderCar,
    isLimited: true,
  },
  {
    id: 'car_moto_neon',
    name: 'Moto Neon',
    description: 'Motocicleta con luces neon',
    price: 1000,
    rarity: 'epic',
    vehicleType: 'motorcycle',
    type: 'car',
    preview: placeholderCar,
  },
];
