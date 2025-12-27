import { View, Text } from "react-native";

export default function OSMNavigation() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0b0f14", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textAlign: "center", paddingHorizontal: 16 }}>
        OSM Navigation is only available on mobile (Expo Go).
      </Text>
    </View>
  );
}
