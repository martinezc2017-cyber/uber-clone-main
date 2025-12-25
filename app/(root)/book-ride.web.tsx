import { useUser } from "@clerk/clerk-expo";
import { Text, View, ScrollView } from "react-native";
import { router } from "expo-router";

export default function BookRide() {
  const { user } = useUser();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0b0f14" }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ padding: 16, gap: 16 }}>
        <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "bold" }}>
          Book a Ride
        </Text>
        <View style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: 16, borderRadius: 12 }}>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textAlign: "center" }}>
            Please use the mobile app (Expo Go) on your Android device to book a ride.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
