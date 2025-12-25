# Cómo configurar GPS en el Emulador de Android Studio

## Problema
El mapa se ve negro/gris porque el emulador no envía coordenadas GPS.

## Solución Rápida

### 1. Abrir Extended Controls
- Con el emulador corriendo, haz clic en los **3 puntos** (...) en el panel lateral derecho
- O presiona `Ctrl + Shift + M` (Windows) / `Cmd + Shift + M` (Mac)

### 2. Configurar Ubicación
- Ve a la sección **"Location"**
- En el campo de coordenadas, ingresa:
  ```
  Latitude: 33.4152
  Longitude: -111.8315
  ```
  (Estas son coordenadas de Mesa, Arizona - donde están los rides de prueba)

- Haz clic en **"Send"**

### 3. Verificar en la App
- Refresca la app driver
- El mapa debería cargar mostrando Mesa, AZ
- Presiona "Go Online"

## Alternativa: Usar ruta pre-configurada

1. En Extended Controls → Location
2. Ve a la pestaña **"Routes"**
3. Puedes crear una ruta para simular que el driver se mueve
4. Click "Play Route" para simular movimiento GPS

## Si el mapa sigue en negro

1. Verifica que tengas la API Key de Google Maps configurada
2. Revisa que internet funcione en el emulador
3. Reinicia el emulador
4. Limpia cache: `npx expo start --clear`

## Comando para abrir el emulador con ubicación

Si prefieres iniciar el emulador con ubicación desde la línea de comandos:

```bash
emulator -avd <nombre_del_avd> -gps 33.4152,-111.8315
```
