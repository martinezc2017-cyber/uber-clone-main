import CustomButton from "@/components/CustomButton";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { useLocationStore } from "@/store";
import { computeFare, getTaxRate } from "@/lib/pricing";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store";
import { router } from "expo-router";
import { Image, Text, View } from "react-native";
import { useMemo } from "react";

const ConfirmRide = () => {
  const { drivers } = useDriverStore();
  const { userAddress, destinationAddress, userLatitude, userLongitude, destinationLatitude, destinationLongitude } = useLocationStore();

  // Get the first driver's info (they all have same price/time/distance)
  const rideInfo = drivers?.[0];

  // Simple haversine for fallback miles between user and destination
  const fallbackDistance = useMemo(() => {
    if (!userLatitude || !userLongitude || !destinationLatitude || !destinationLongitude) return null;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 3959;
    const dLat = toRad(destinationLatitude - userLatitude);
    const dLon = toRad(destinationLongitude - userLongitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(userLatitude)) * Math.cos(toRad(destinationLatitude)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  const fallbackETA = fallbackDistance != null ? Math.ceil(fallbackDistance * 2.4) : null;
  const fallbackFare =
    (rideInfo?.distance && rideInfo.time != null
      ? computeFare({
          distanceMiles: parseFloat(rideInfo.distance),
          durationMinutes: rideInfo.time,
          context: { availableDrivers: drivers?.length },
        })
      : fallbackDistance != null && fallbackETA != null
        ? computeFare({
            distanceMiles: fallbackDistance,
            durationMinutes: fallbackETA,
            context: { availableDrivers: drivers?.length },
          })
        : null);

  const summaryDistance = rideInfo?.distance ?? (fallbackDistance != null ? fallbackDistance.toFixed(1) : "--");
  const summaryETA = rideInfo?.time ?? fallbackETA ?? 0;
  const fare = rideInfo?.fareBreakdown ?? fallbackFare;
  const totalFare =
    rideInfo?.price ??
    (fare ? fare.total.toFixed(2) : (0).toFixed(2));

  if (!rideInfo) {
    return (
      <RideLayout title="Ride Details" snapPoints={["30%", "65%", "90%"]}>
        <View className="pb-4">
          <Text className="text-2xl font-JakartaBold mb-4">Trip Summary</Text>
          <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
            <View className="flex-row items-start mb-3">
              <Image source={icons.point} className="w-5 h-5 mt-1" />
              <View className="ml-3 flex-1">
                <Text className="text-xs text-gray-500">Pickup</Text>
                <Text className="text-sm font-JakartaSemiBold" numberOfLines={2}>
                  {userAddress || "Tu ubicación"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-start">
              <Image source={icons.from} className="w-5 h-5 mt-1" />
              <View className="ml-3 flex-1">
                <Text className="text-xs text-gray-500">Destination</Text>
                <Text className="text-sm font-JakartaSemiBold" numberOfLines={2}>
                  {destinationAddress || "Select a destination"}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex flex-row items-center justify-between w-full bg-white rounded-lg p-4 mb-3 shadow-sm">
            <Text className="text-lg font-JakartaSemiBold">Distance</Text>
            <Text className="text-lg font-JakartaBold text-blue-600">{summaryDistance} miles</Text>
          </View>

          <View className="flex flex-row items-center justify-between w-full bg-white rounded-lg p-4 mb-3 shadow-sm">
            <Text className="text-lg font-JakartaSemiBold">Estimated Time</Text>
            <Text className="text-lg font-JakartaBold text-blue-600">{formatTime(parseInt(`${summaryETA || 0}`))}</Text>
          </View>

          <View className="flex flex-row items-center justify-between w-full bg-white rounded-lg p-4 mb-3 shadow-sm border-2 border-green-500">
            <Text className="text-lg font-JakartaSemiBold">Estimated Total</Text>
            <Text className="text-2xl font-JakartaBold text-green-600">${totalFare}</Text>
          </View>

          <View className="flex-row gap-3 mt-4">
            <CustomButton
              title="Cancel"
              containerStyles="flex-1 bg-gray-100"
              textStyles="text-gray-700"
              onPress={() => router.back()}
            />
            <CustomButton
              title="Find Driver"
              containerStyles="flex-1"
              onPress={() => router.push("/(root)/book-ride")}
            />
          </View>
        </View>
      </RideLayout>
    );
  }

  const estimatedMinutes = fare?.estimatedDurationMinutes ?? rideInfo.time ?? 0;

  return (
    <RideLayout title="Ride Details" snapPoints={["30%", "65%", "90%"]}>
      <View className="pb-4">
        <Text className="text-2xl font-JakartaBold mb-5">Trip Summary</Text>

        {/* Pickup / Destination */}
        <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
          <View className="flex-row items-start mb-3">
            <Image source={icons.point} className="w-5 h-5 mt-1" />
            <View className="ml-3 flex-1">
              <Text className="text-xs text-gray-500">Pickup</Text>
              <Text className="text-sm font-JakartaSemiBold" numberOfLines={2}>
                {userAddress || "Tu ubicación"}
              </Text>
            </View>
          </View>
          <View className="flex-row items-start">
            <Image source={icons.from} className="w-5 h-5 mt-1" />
            <View className="ml-3 flex-1">
              <Text className="text-xs text-gray-500">Destination</Text>
              <Text className="text-sm font-JakartaSemiBold" numberOfLines={2}>
                {destinationAddress || "Select a destination"}
              </Text>
            </View>
          </View>
        </View>

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
            <Text className="text-lg font-JakartaSemiBold ml-3">
              Estimated Time
            </Text>
          </View>
          <Text className="text-lg font-JakartaBold text-blue-600">
            {formatTime(parseInt(`${estimatedMinutes}`))}
          </Text>
        </View>

        {/* Price */}
        <View className="flex flex-row items-center justify-between w-full bg-white rounded-lg p-4 mb-3 shadow-sm border-2 border-green-500">
          <View className="flex flex-row items-center">
            <Text className="text-2xl">$</Text>
            <Text className="text-lg font-JakartaSemiBold ml-3">Total Fare</Text>
          </View>
          <Text className="text-2xl font-JakartaBold text-green-600">
            ${totalFare}
          </Text>
        </View>

        {/* Pricing Breakdown */}
        <View className="bg-gray-50 rounded-lg p-4 mb-5">
          <Text className="text-sm font-JakartaSemiBold mb-2 text-gray-600">
            Fare Breakdown
          </Text>

          {(() => {
            const distance = parseFloat(summaryDistance);
            const isShortTrip = distance < 5;

            if (isShortTrip) {
              // Trips < 5 miles: fixed $9.98 with 50/50 split for platform & insurance
              const minimumFare = 9.98;
              const driverEarnings = 6.00;
              const remainder = minimumFare - driverEarnings;
              const platformFee = remainder * 0.5; // 50% to platform
              const otherExpenses = remainder * 0.5; // 50% to insurance
              const subtotal = minimumFare;
              const taxRate = getTaxRate("AZ", userAddress?.split(',')[1]?.trim());
              const tax = subtotal * taxRate;
              const calculatedTotal = subtotal + tax;

              return (
                <>
                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Driver Earnings
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-green-600">
                      ${driverEarnings.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Platform Fee (50%)
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-orange-600">
                      ${platformFee.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Insurance & Expenses
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-red-600">
                      ${otherExpenses.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Subtotal
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-gray-600">
                      ${subtotal.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Tax ({(taxRate * 100).toFixed(2)}%)
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-blue-600">
                      ${tax.toFixed(2)}
                    </Text>
                  </View>

                  <View className="border-t border-gray-300 pt-2 mt-2">
                    <View className="flex flex-row justify-between">
                      <Text className="text-sm font-JakartaSemiBold text-gray-900">
                        Total Fare
                      </Text>
                      <Text className="text-sm font-JakartaSemiBold text-gray-900">
                        ${calculatedTotal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </>
              );
            } else {
              // Long trips (>= 5 miles) - Distance + Time based
              const baseFare = 2.00;
              const costPerMile = 1.80;
              const costPerMinute = 0.40; // Changed from 0.25 to 0.40

              const distanceFare = distance * costPerMile;
              const timeFare = summaryETA * costPerMinute;
              const subtotal = baseFare + distanceFare + timeFare;

              // Driver gets 60%, rest 40% split between platform and expenses
              const driverEarnings = subtotal * 0.60;
              const platformAndExpenses = subtotal * 0.40;
              const platformFee = platformAndExpenses / 2; // 20%
              const otherExpenses = platformAndExpenses / 2; // 20%

              const cityName = userAddress?.split(',')[1]?.trim() || "";
              const taxRate = getTaxRate("AZ", cityName);
              const tax = subtotal * taxRate;
              const calculatedTotal = subtotal + tax;

              return (
                <>
                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Base Fare
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-gray-600">
                      ${baseFare.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Distance ({distance.toFixed(1)} mi × ${costPerMile}/mi)
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-gray-600">
                      ${distanceFare.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Time ({Math.round(summaryETA)} min × ${costPerMinute}/min)
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-gray-600">
                      ${timeFare.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Subtotal
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-gray-600">
                      ${subtotal.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-green-600 font-bold">
                      Driver Earnings (60%)
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-green-600 font-bold">
                      ${driverEarnings.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-orange-600">
                      Platform Fee (20%)
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-orange-600">
                      ${platformFee.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-red-600">
                      Other Expenses (20%)
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-red-600">
                      ${otherExpenses.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex flex-row justify-between mb-2">
                    <Text className="text-sm font-JakartaSemiBold text-gray-700">
                      Tax ({(taxRate * 100).toFixed(2)}%)
                    </Text>
                    <Text className="text-sm font-JakartaSemiBold text-blue-600">
                      ${tax.toFixed(2)}
                    </Text>
                  </View>

                  <View className="border-t border-gray-300 pt-2 mt-2">
                    <View className="flex flex-row justify-between">
                      <Text className="text-sm font-JakartaSemiBold text-gray-900">
                        Total Fare
                      </Text>
                      <Text className="text-sm font-JakartaSemiBold text-gray-900">
                        ${calculatedTotal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </>
              );
            }
          })()}
        </View>

        <CustomButton
          title="Confirm and Book Ride"
          onPress={() => router.push("/(root)/book-ride")}
        />
        <View className="mt-3">
          <CustomButton
            title="Cancel"
            containerStyles="bg-gray-100"
            textStyles="text-gray-700"
            onPress={() => router.back()}
          />
        </View>
      </View>
    </RideLayout>
  );
};

export default ConfirmRide;
