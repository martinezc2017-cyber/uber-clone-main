# Especificaciones de Skins - RideShare App

Este documento define los requisitos exactos para cada tipo de skin.
**Copia y pega la sección relevante cuando le pidas a ChatGPT/DALL-E que genere assets.**

---

## 1. SKINS DE VEHICULOS (Car Skins)

### Requisitos Técnicos
- **Formato**: PNG con fondo transparente
- **Tamaño**: 128x128 píxeles (mínimo 64x64)
- **Vista**: Top-down (vista superior) o 3/4 angle
- **Padding**: Dejar 10% de margen en cada lado

### Prompt para ChatGPT/DALL-E
```
Crea un ícono de vehículo para app móvil de rideshare.

REQUISITOS OBLIGATORIOS:
- Formato: PNG, fondo 100% transparente
- Tamaño: 128x128 píxeles
- Vista: desde arriba (top-down view)
- Estilo: flat design, minimalista, sin sombras complejas
- Colores: máximo 4-5 colores sólidos
- Líneas: bordes definidos de 2px mínimo
- Sin texto ni logos

Tipo de vehículo: [SEDAN/SUV/DEPORTIVO/MOTOCICLETA/LIMUSINA]
Color principal: [COLOR]
Estilo visual: [REALISTA/CARTOON/PIXEL ART]
```

### Checklist de Validación
- [ ] ¿El fondo es 100% transparente?
- [ ] ¿Se ve bien a 32x32px? (tamaño mínimo en mapa)
- [ ] ¿Los colores son sólidos sin gradientes complejos?
- [ ] ¿El vehículo está centrado?
- [ ] ¿Es reconocible el tipo de vehículo?

---

## 2. TEMAS DE UI (Theme Skins)

### Requisitos Técnicos
Los temas NO son imágenes, son paletas de colores con estos valores:

```typescript
{
  bg: string,      // Color de fondo principal
  surface: string, // Color de cards/superficies
  border: string,  // Color de bordes
  text: string,    // Color de texto principal
  muted: string,   // Color de texto secundario
  accent: string,  // Color de acento/botones
}
```

### Prompt para ChatGPT
```
Diseña una paleta de colores para app de rideshare.

REQUISITOS:
1. Debe tener EXACTAMENTE estos 6 colores en formato HEX:
   - bg: color de fondo (debe ser claro u oscuro, no intermedio)
   - surface: color de tarjetas (ligeramente diferente al bg)
   - border: color de bordes (sutil, no muy contrastante)
   - text: color de texto (alto contraste con bg)
   - muted: color de texto secundario
   - accent: color de acento para botones (llamativo)

2. Contraste mínimo:
   - text vs bg: ratio 4.5:1 mínimo (WCAG AA)
   - accent vs surface: ratio 3:1 mínimo

3. Coherencia visual:
   - Todos los colores deben pertenecer a la misma familia visual
   - El accent debe destacar pero no desentonar

Tema deseado: [CYBERPUNK/OCEAN/SUNSET/FOREST/etc]

Dame SOLO los valores HEX en este formato exacto:
bg: #XXXXXX
surface: #XXXXXX
border: #XXXXXX
text: #XXXXXX
muted: #XXXXXX
accent: #XXXXXX
```

### Checklist de Validación
- [ ] ¿El texto es legible sobre el fondo?
- [ ] ¿El accent destaca lo suficiente?
- [ ] ¿Funciona tanto en luz como en sombra?
- [ ] ¿Los colores son consistentes entre sí?

---

## 3. AVATARES (Avatar Skins)

### Requisitos Técnicos
- **Formato**: PNG con fondo transparente O circular con fondo de color
- **Tamaño**: 200x200 píxeles (se mostrará en círculo)
- **Área segura**: El contenido principal en el 80% central
- **Sin texto**

### Prompt para ChatGPT/DALL-E
```
Crea un avatar circular para perfil de usuario en app de transporte.

REQUISITOS OBLIGATORIOS:
- Formato: PNG, 200x200 píxeles
- Forma: circular o con fondo que funcione recortado en círculo
- Estilo: [CARTOON/PIXEL ART/ILUSTRACIÓN/ANIME]
- Contenido: rostro o figura centrada
- Colores: vibrantes pero no neón extremo
- Sin texto, logos ni marcas

Tema: [PROFESIONAL/CASUAL/GAMING/FANTASÍA]
Descripción: [EJECUTIVO/GAMER/MAGO/NINJA/etc]
```

### Checklist de Validación
- [ ] ¿Se ve bien recortado en círculo?
- [ ] ¿El rostro/figura está centrado?
- [ ] ¿Es reconocible a 40x40px?
- [ ] ¿No tiene elementos cortados en los bordes?

---

## 4. IMAGEN DE PREVIEW PARA TIENDA

Además del asset principal, cada skin necesita una imagen de preview.

### Requisitos
- **Tamaño**: 256x256 píxeles
- **Fondo**: Color sólido que complemente la skin
- **Contenido**: La skin centrada con padding

---

## PROCESO RECOMENDADO

1. **Pedir a ChatGPT** usando el prompt exacto de arriba
2. **Validar** con el checklist antes de descargar
3. **Probar** en la app antes de publicar
4. **Nombrar archivos** consistentemente:
   - `car_[nombre].png`
   - `avatar_[nombre].png`
   - `theme_[nombre]_preview.png`

---

## ARCHIVOS A MODIFICAR

Cuando agregues una nueva skin, actualiza:

### App Pasajero + Driver (ambas usan el mismo código)
1. `constants/skins/cars.ts` - para vehículos
2. `constants/skins/themes.ts` - para temas
3. `constants/skins/avatars.ts` - para avatares

### Ubicación de imágenes
```
assets/
└── skins/
    ├── cars/
    │   └── car_nombre.png
    ├── themes/
    │   └── theme_nombre_preview.png
    └── avatars/
        └── avatar_nombre.png
```
