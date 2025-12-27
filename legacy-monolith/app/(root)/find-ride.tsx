/**
 * FindRide - Search for pickup and destination
 * TORO Design System
 */

import CustomButton from "@/components/CustomButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import RideLayout from "@/components/RideLayout";
import DestinationHistory from "@/components/DestinationHistory";
import { icons } from "@/constants";
import { useLocationStore } from "@/store";
import { router } from "expo-router";
import { Text, View, TouchableOpacity, Image } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

const FindRide = () => {
  const {
    userAddress,
    destinationAddress,
    setDestinationLocation,
    setUserLocation,
  } = useLocationStore();

  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const isDark = activeTheme === "dark";

  return (
    <RideLayout title="Ride" snapPoints={["85%"]}>
      {/* From Section */}
      <View style={{ marginVertical: 12 }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <Text style={{
            fontSize: 18,
            fontFamily: "Jakarta-SemiBold",
            color: colors.text,
          }}>
            From
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(root)/pick-location?type=pickup")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: isDark ? "rgba(201, 165, 92, 0.1)" : "rgba(166, 124, 61, 0.08)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(201, 165, 92, 0.2)" : "rgba(166, 124, 61, 0.15)",
              borderRadius: 20,
            }}
          >
            <Image
              source={icons.map}
              style={{ width: 16, height: 16, marginRight: 6, tintColor: colors.gold }}
              resizeMode="contain"
            />
            <Text style={{
              fontSize: 12,
              fontFamily: "Jakarta-Medium",
              color: colors.gold,
            }}>
              Map
            </Text>
          </TouchableOpacity>
        </View>
        <GoogleTextInput
          icon={icons.target}
          initialLocation={userAddress || undefined}
          containerStyle="bg-transparent"
          textInputBackgroundColor={isDark ? colors.surface : "#F5F5F5"}
          handlePress={(location) => setUserLocation(location)}
        />
      </View>

      {/* To Section */}
      <View style={{ marginVertical: 12 }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <Text style={{
            fontSize: 18,
            fontFamily: "Jakarta-SemiBold",
            color: colors.text,
          }}>
            To
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(root)/pick-location?type=destination")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: isDark ? "rgba(201, 165, 92, 0.1)" : "rgba(166, 124, 61, 0.08)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(201, 165, 92, 0.2)" : "rgba(166, 124, 61, 0.15)",
              borderRadius: 20,
            }}
          >
            <Image
              source={icons.map}
              style={{ width: 16, height: 16, marginRight: 6, tintColor: colors.gold }}
              resizeMode="contain"
            />
            <Text style={{
              fontSize: 12,
              fontFamily: "Jakarta-Medium",
              color: colors.gold,
            }}>
              Map
            </Text>
          </TouchableOpacity>
        </View>
        <GoogleTextInput
          icon={icons.target}
          initialLocation={destinationAddress || undefined}
          containerStyle="bg-transparent"
          textInputBackgroundColor={isDark ? colors.surface : "#F5F5F5"}
          handlePress={(location) => setDestinationLocation(location)}
        />
      </View>

      <DestinationHistory
        onSelectDestination={(location) => setDestinationLocation(location)}
      />

      <View style={{ marginTop: 20 }}>
        <CustomButton
          title="Find Now"
          onPress={() => router.push("/(root)/confirm-ride")}
        />
      </View>
    </RideLayout>
  );
};

export default FindRide;
