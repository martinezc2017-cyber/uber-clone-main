# Skins Assets

Coloca aquí las imágenes generadas por ChatGPT/DALL-E.

## Estructura

```
skins/
├── cars/           # Iconos de vehículos (128x128 PNG transparente)
├── themes/         # Previews de temas (256x256 PNG)
└── avatars/        # Avatares de perfil (200x200 PNG)
```

## Nomenclatura

- `car_[nombre].png` - Ej: `car_sport_red.png`
- `theme_[nombre]_preview.png` - Ej: `theme_cyberpunk_preview.png`
- `avatar_[nombre].png` - Ej: `avatar_ninja.png`

## Después de agregar imágenes

Actualiza el archivo correspondiente en `constants/skins/`:

```typescript
// En constants/skins/cars.ts
{
  id: 'car_sport_red',
  name: 'Deportivo Rojo',
  preview: require('@/assets/skins/cars/car_sport_red.png'),
  // ...
}
```

Ver `constants/skins/SKIN_SPECS.md` para las especificaciones completas.
