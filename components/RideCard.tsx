import { useState } from "react";
import { Image, Text, View, TouchableOpacity, Animated } from "react-native";

import { icons } from "@/constants";
import { formatDate, formatTimeOfDay } from "@/lib/utils";
import { Ride } from "@/types/type";

const RideCard = ({ ride }: { ride: Ride }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Format price from cents to dollars
  const formatPrice = (cents: number | string | null | undefined) => {
    if (!cents) return "$0.00";
    const numCents = typeof cents === 'string' ? parseFloat(cents) : cents;
    if (isNaN(numCents)) return "$0.00";
    return `$${(numCents / 100).toFixed(2)}`;
  };

  return (
    <View className="bg-white rounded-lg shadow-sm shadow-neutral-300 mb-3 overflow-hidden">
      {/* Header - Always visible, tap to expand */}
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.7}
        className="flex flex-row items-center justify-between px-4 py-3 bg-white"
      >
        <View className="flex flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
            <Image source={icons.point} className="w-5 h-5" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-JakartaBold text-gray-900">
              {ride.created_at ? formatDate(ride.created_at) : "No date"}
            </Text>
            <Text className="text-sm font-JakartaMedium text-gray-500">
              {ride.created_at ? formatTimeOfDay(ride.created_at) : ""}
            </Text>
          </View>
        </View>

        <View className="flex flex-row items-center">
          <Text className="text-base font-JakartaBold text-gray-900 mr-2">
            {formatPrice(ride.fare_price)}
          </Text>
          <Text className={`text-lg ${expanded ? 'rotate-180' : ''}`}>
            {expanded ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expandable content */}
      {expanded && (
        <View className="px-4 pb-4 border-t border-gray-100">
          {/* Map preview */}
          <View className="mt-3 flex flex-row">
            <Image
              source={{
                uri: `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:${ride.destination_longitude},${ride.destination_latitude}&zoom=14&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`,
              }}
              className="w-[80px] h-[90px] rounded-lg"
            />

            <View className="flex flex-col ml-4 flex-1 justify-center gap-y-3">
              <View className="flex flex-row items-center gap-x-2">
                <View className="w-3 h-3 rounded-full bg-green-500" />
                <Text className="text-sm font-JakartaMedium text-gray-700" numberOfLines={1}>
                  {ride.origin_address}
                </Text>
              </View>

              <View className="flex flex-row items-center gap-x-2">
                <View className="w-3 h-3 rounded-full bg-red-500" />
                <Text className="text-sm font-JakartaMedium text-gray-700" numberOfLines={1}>
                  {ride.destination_address}
                </Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <View className="mt-4 bg-gray-50 rounded-lg p-3">
            <View className="flex flex-row items-center justify-between mb-3">
              <Text className="text-sm font-JakartaMedium text-gray-500">
                Driver
              </Text>
              <Text className="text-sm font-JakartaBold text-gray-900">
                {ride.driver?.first_name && ride.driver?.last_name
                  ? `${ride.driver.first_name} ${ride.driver.last_name}`
                  : "Searching..."}
              </Text>
            </View>

            <View className="flex flex-row items-center justify-between mb-3">
              <Text className="text-sm font-JakartaMedium text-gray-500">
                Car Seats
              </Text>
              <Text className="text-sm font-JakartaBold text-gray-900">
                {ride.driver?.car_seats || "-"}
              </Text>
            </View>

            <View className="flex flex-row items-center justify-between">
              <Text className="text-sm font-JakartaMedium text-gray-500">
                Payment Status
              </Text>
              <View className={`px-2 py-1 rounded-full ${
                ride.payment_status === "paid"
                  ? "bg-green-100"
                  : "bg-yellow-100"
              }`}>
                <Text
                  className={`text-xs capitalize font-JakartaBold ${
                    ride.payment_status === "paid"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {ride.payment_status}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default RideCard;
