/**
 * Theme Skins Catalog
 * Temas de UI personalizados
 */

import { ThemeSkin } from './types';

const placeholderTheme = require('@/assets/icons/map.png');

export const THEME_SKINS: ThemeSkin[] = [
  {
    id: 'theme_toro',
    name: 'Toro Classic',
    description: 'El tema original premium',
    price: 0,
    rarity: 'common',
    type: 'theme',
    preview: placeholderTheme,
    colors: {
      bg: '#F4F2EE',
      surface: '#FFFFFF',
      border: '#E4E0D9',
      text: '#141414',
      muted: '#5F6672',
      accent: '#8B6A3F',
    },
  },
  {
    id: 'theme_midnight',
    name: 'Midnight',
    description: 'Oscuro y elegante para la noche',
    price: 300,
    rarity: 'rare',
    type: 'theme',
    preview: placeholderTheme,
    colors: {
      bg: '#0F172A',
      surface: '#1E293B',
      border: '#334155',
      text: '#F8FAFC',
      muted: '#94A3B8',
      accent: '#6366F1',
    },
  },
  {
    id: 'theme_ocean',
    name: 'Ocean Blue',
    description: 'Frescura del oceano en tu app',
    price: 400,
    rarity: 'rare',
    type: 'theme',
    preview: placeholderTheme,
    isNew: true,
    colors: {
      bg: '#ECFEFF',
      surface: '#FFFFFF',
      border: '#A5F3FC',
      text: '#164E63',
      muted: '#67E8F9',
      accent: '#0891B2',
    },
  },
  {
    id: 'theme_cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon y futurista',
    price: 1500,
    rarity: 'legendary',
    type: 'theme',
    preview: placeholderTheme,
    isLimited: true,
    colors: {
      bg: '#0D0D0D',
      surface: '#1A1A2E',
      border: '#FF00FF',
      text: '#00FFFF',
      muted: '#FF6EC7',
      accent: '#FF00FF',
    },
  },
  {
    id: 'theme_sunset',
    name: 'Sunset',
    description: 'Colores calidos del atardecer',
    price: 600,
    rarity: 'epic',
    type: 'theme',
    preview: placeholderTheme,
    colors: {
      bg: '#FFF7ED',
      surface: '#FFFFFF',
      border: '#FED7AA',
      text: '#7C2D12',
      muted: '#FB923C',
      accent: '#EA580C',
    },
  },
];
