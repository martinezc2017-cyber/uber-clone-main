'use client';

import { Platform } from "react-native";

// Importar dinamicamente según la plataforma
let MapComponent: any = null;

if (Platform.OS === 'web') {
  // En web, importar Map.web
  MapComponent = require('./Map.web').default;
} else {
  // En mobile, importar Map nativa
  MapComponent = require('./Map.native').default;
}

export default MapComponent;
