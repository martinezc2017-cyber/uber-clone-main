import CustomButton from "@/components/CustomButton";
import RideLayout from "@/components/RideLayout";
import { useDriverStore } from "@/store";
import { router } from "expo-router";
import { View, Text, Image } from "react-native";
import { icons } from "@/constants";
import { formatTime } from "@/lib/utils";

const ConfirmRide = () => {
  const { drivers } = useDriverStore();

  // Get the first driver's info (they all have same price/time/distance)
  const rideInfo = drivers?.[0];

  if (!rideInfo) {
    return (
      <RideLayout title="Ride Details" snapPoints={["65%", "85%"]}>
        <View>
          <Text className="text-lg font-JakartaRegular">Loading ride information...</Text>
        </View>
      </RideLayout>
    );
  }

  return (
    <RideLayout title="Ride Details" snapPoints={["65%", "85%"]}>
      <View>
        <Text className="text-2xl font-JakartaBold mb-5">Trip Summary</Text>

        {/* Distance */}
        <View className="flex flex-row items-center justify-between w-full bg-white rounded-lg p-4 mb-3 shadow-sm">
          <View className="flex flex-row items-center">
            <Image source={icons.point} className="w-6 h-6" />
            <Text className="text-lg font-JakartaSemiBold ml-3">Distance</Text>
          </View>
          <Text className="text-lg font-JakartaBold text-blue-600">
            {rideInfo.distance} miles
          </Text>
        </View>

        {/* Estimated Time */}
        <View className="flex flex-row items-center justify-between w-full bg-white rounded-lg p-4 mb-3 shadow-sm">
          <View className="flex flex-row items-center">
            <Image source={icons.to} className="w-6 h-6" />
            <Text className="text-lg font-JakartaSemiBold ml-3">Estimated Time</Text>
          </View>
          <Text className="text-lg font-JakartaBold text-blue-600">
            {formatTime(parseInt(`${rideInfo.time}`))}
          </Text>
        </View>

        {/* Price */}
        <View className="flex flex-row items-center justify-between w-full bg-white rounded-lg p-4 mb-3 shadow-sm border-2 border-green-500">
          <View className="flex flex-row items-center">
            <Text className="text-2xl">💵</Text>
            <Text className="text-lg font-JakartaSemiBold ml-3">Total Fare</Text>
          </View>
          <Text className="text-2xl font-JakartaBold text-green-600">
            ${rideInfo.price}
          </Text>
        </View>

        {/* Pricing Breakdown */}
        <View className="bg-gray-50 rounded-lg p-4 mb-5">
          <Text className="text-sm font-JakartaSemiBold mb-2 text-gray-600">Fare Breakdown</Text>
          <View className="flex flex-row justify-between mb-1">
            <Text className="text-sm font-JakartaRegular text-gray-600">Base Fare</Text>
            <Text className="text-sm font-JakartaRegular text-gray-600">$2.50</Text>
          </View>
          <View className="flex flex-row justify-between mb-1">
            <Text className="text-sm font-JakartaRegular text-gray-600">Distance ({rideInfo.distance} mi × $1.15)</Text>
            <Text className="text-sm font-JakartaRegular text-gray-600">${(parseFloat(rideInfo.distance) * 1.15).toFixed(2)}</Text>
          </View>
          <View className="flex flex-row justify-between mb-1">
            <Text className="text-sm font-JakartaRegular text-gray-600">Time ({Math.round(rideInfo.time)} min × $0.22)</Text>
            <Text className="text-sm font-JakartaRegular text-gray-600">${(rideInfo.time * 0.22).toFixed(2)}</Text>
          </View>
          <View className="flex flex-row justify-between">
            <Text className="text-sm font-JakartaRegular text-gray-600">Service Fee</Text>
            <Text className="text-sm font-JakartaRegular text-gray-600">$2.75</Text>
          </View>
        </View>

        <CustomButton
          title="Confirm and Book Ride"
          onPress={() => router.push("/(root)/book-ride")}
        />
      </View>
    </RideLayout>
  );
};

export default ConfirmRide;
