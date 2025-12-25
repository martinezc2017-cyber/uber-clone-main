import { useUser } from "@clerk/clerk-expo";
import { ActivityIndicator, FlatList, Image, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import RideCard from "@/components/RideCard";
import { images } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { Ride } from "@/types/type";

const Rides = () => {
  const { user } = useUser();

  const {
    data: recentRides,
    loading,
    error,
  } = useFetch<Ride[]>(`/(api)/ride/${user?.id}`);
  const { data: activeRide } = useFetch<Ride>(`/api/ride/active?clerk_id=${user?.id}`);

  const hasActive =
    !!activeRide &&
    ["pending", "accepted", "active", "in_progress", "arrived"].includes(
      String(activeRide.ride_status),
    );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={recentRides}
        renderItem={({ item }) => <RideCard ride={item} />}
        keyExtractor={(item, index) => index.toString()}
        className="px-5"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        ListEmptyComponent={() => (
          <View className="flex flex-col items-center justify-center">
            {!loading ? (
              <>
                <Image
                  source={images.noResult}
                  className="w-40 h-40"
                  alt="No recent rides found"
                  resizeMode="contain"
                />
                <Text className="text-sm">No recent rides found</Text>
              </>
            ) : (
              <ActivityIndicator size="small" color="#000" />
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            {hasActive && (
              <View className="bg-[#f5f9ff] border border-[#c8ddff] rounded-2xl p-4 mt-4">
                <Text className="text-xs text-[#2563eb] font-JakartaBold mb-1">
                  Viaje en progreso
                </Text>
                <Text className="text-sm text-gray-700 mb-2">
                  Tienes un viaje activo que no ha terminado. Retómalo para ver el seguimiento.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(root)/book-ride")}
                  className="bg-[#2563eb] rounded-full py-2 px-3 self-start"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-sm font-JakartaSemiBold">Retomar viaje</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text className="text-2xl font-JakartaBold my-5">All Rides</Text>
          </>
        }
      />
    </SafeAreaView>
  );
};

export default Rides;
