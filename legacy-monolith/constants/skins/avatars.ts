/**
 * Avatar Skins Catalog
 * Avatares personalizados para perfil
 */

import { AvatarSkin } from './types';

const placeholderAvatar = require('@/assets/icons/person.png');

export const AVATAR_SKINS: AvatarSkin[] = [
  {
    id: 'avatar_default',
    name: 'Default',
    description: 'Avatar basico',
    price: 0,
    rarity: 'common',
    type: 'avatar',
    category: 'casual',
    preview: placeholderAvatar,
  },
  {
    id: 'avatar_business',
    name: 'Ejecutivo',
    description: 'Look profesional de negocios',
    price: 200,
    rarity: 'common',
    type: 'avatar',
    category: 'professional',
    preview: placeholderAvatar,
  },
  {
    id: 'avatar_gamer',
    name: 'Gamer Pro',
    description: 'Para los amantes de los videojuegos',
    price: 400,
    rarity: 'rare',
    type: 'avatar',
    category: 'gaming',
    preview: placeholderAvatar,
    isNew: true,
  },
  {
    id: 'avatar_wizard',
    name: 'Mago',
    description: 'Misterioso y magico',
    price: 800,
    rarity: 'epic',
    type: 'avatar',
    category: 'fantasy',
    preview: placeholderAvatar,
  },
  {
    id: 'avatar_dragon',
    name: 'Dragon Rider',
    description: 'El legendario jinete de dragones',
    price: 2500,
    rarity: 'legendary',
    type: 'avatar',
    category: 'fantasy',
    preview: placeholderAvatar,
    isLimited: true,
  },
  {
    id: 'avatar_ninja',
    name: 'Ninja',
    description: 'Silencioso y letal',
    price: 600,
    rarity: 'epic',
    type: 'avatar',
    category: 'gaming',
    preview: placeholderAvatar,
  },
];
