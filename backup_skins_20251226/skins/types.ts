/**
 * Skin System Types
 */

export type SkinRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface BaseSkin {
  id: string;
  name: string;
  description: string;
  price: number; // En monedas virtuales o centavos
  rarity: SkinRarity;
  preview: any; // require() de la imagen
  isNew?: boolean;
  isLimited?: boolean;
}

export interface CarSkin extends BaseSkin {
  type: 'car';
  vehicleType: 'sedan' | 'suv' | 'sport' | 'motorcycle' | 'luxury';
}

export interface ThemeSkin extends BaseSkin {
  type: 'theme';
  colors: {
    bg: string;
    surface: string;
    border: string;
    text: string;
    muted: string;
    accent: string;
  };
}

export interface AvatarSkin extends BaseSkin {
  type: 'avatar';
  category: 'professional' | 'casual' | 'gaming' | 'fantasy';
}

export type Skin = CarSkin | ThemeSkin | AvatarSkin;

export const RARITY_COLORS: Record<SkinRarity, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

export const RARITY_LABELS: Record<SkinRarity, string> = {
  common: 'Comun',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Legendario',
};
