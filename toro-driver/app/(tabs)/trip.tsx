import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Alert, View } from "react-native";
import OSMNavigation from "@/components/OSMNavigation";
import RideChat from "@/components/RideChat";
import { fetchAPI } from "@/lib/fetch";

export default function DriverTrip() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [chatVisible, setChatVisible] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const ride = {
    ride_id: Number(params.ride_id),
    origin_address: params.origin_address as string,
    destination_address: params.destination_address as string,
    origin_latitude: Number(params.origin_latitude),
    origin_longitude: Number(params.origin_longitude),
    destination_latitude: Number(params.destination_latitude),
    destination_longitude: Number(params.destination_longitude),
    fare_price: params.fare_price as string,
    user_name: params.user_name as string,
    user_id: Number(params.user_id) || 0,
    driver_id: Number(params.driver_id) || 0,
  };

  // Poll for unread messages
  useEffect(() => {
    if (!ride.ride_id) return;

    const checkUnread = async () => {
      try {
        const response = await fetchAPI(
          `/api/messages/unread?ride_id=${ride.ride_id}&reader_type=driver`
        );
        if (response?.data?.unread_count !== undefined) {
          setUnreadMessages(response.data.unread_count);
        }
      } catch (error) {
        // Silent fail
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 5000);
    return () => clearInterval(interval);
  }, [ride.ride_id]);

  const handleCompleteTrip = async () => {
    try {
      await fetchAPI("/api/ride/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ride_id: ride.ride_id, status: "completed" }),
      });

      router.replace({
        pathname: "/(tabs)/session-summary",
        params: {
          ride_id: ride.ride_id,
          fare_price: ride.fare_price,
          destination_address: ride.destination_address,
        },
      });
    } catch (error) {
      console.warn("Error completing trip:", error);
      Alert.alert("Error", "Failed to complete trip. Please try again.");
    }
  };

  const handleCancelDuringTrip = () => {
    Alert.alert(
      "Cancel Trip",
      "Are you sure you want to cancel? The passenger is already in the car.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await fetchAPI("/api/ride/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ride_id: ride.ride_id, by_driver: true }),
              });
              router.replace("/(tabs)");
            } catch (err) {
              console.warn("Error canceling:", err);
              router.replace("/(tabs)");
            }
          },
        },
      ]
    );
  };

  const handleOpenChat = () => {
    setChatVisible(true);
    setUnreadMessages(0);
  };

  return (
    <View style={{ flex: 1 }}>
      <OSMNavigation
        targetLatitude={ride.destination_latitude}
        targetLongitude={ride.destination_longitude}
        targetAddress={ride.destination_address}
        userName={ride.user_name}
        onArrive={handleCompleteTrip}
        onCancel={handleCancelDuringTrip}
        phaseLabel="Dropoff"
        rideId={ride.ride_id}
        driverId={ride.driver_id}
        onOpenChat={handleOpenChat}
        unreadMessages={unreadMessages}
      />

      {/* Chat Modal */}
      {ride.ride_id > 0 && ride.driver_id > 0 && (
        <RideChat
          rideId={ride.ride_id}
          userId={ride.driver_id}
          userType="driver"
          userName={ride.user_name}
          visible={chatVisible}
          onClose={() => setChatVisible(false)}
        />
      )}
    </View>
  );
}
