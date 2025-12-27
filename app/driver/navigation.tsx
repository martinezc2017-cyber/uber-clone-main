import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Alert, View } from "react-native";
import OSMNavigation from "@/components/OSMNavigation";
import RideChat from "@/components/RideChat";
import { fetchAPI } from "@/lib/fetch";

export default function DriverNavigation() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [chatVisible, setChatVisible] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [cancelNotified, setCancelNotified] = useState(false);

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

  // Poll ride status to detect user cancellation and exit navigation
  useEffect(() => {
    if (!ride.ride_id) return;

    const pollStatus = async () => {
      try {
        const res = await fetchAPI(`/api/ride/status?ride_id=${ride.ride_id}`);
        const status = res?.data?.ride_status;
        if (status === "cancelled" && !cancelNotified) {
          setCancelNotified(true);
          setChatVisible(false);
          Alert.alert(
            "Viaje cancelado",
            "El pasajero canceló el viaje. Volviendo al panel.",
            [{ text: "OK", onPress: () => router.replace("/driver") }],
          );
        }
      } catch (err) {
        // silent fail
      }
    };

    pollStatus();
    const timer = setInterval(pollStatus, 5000);
    return () => clearInterval(timer);
  }, [ride.ride_id, cancelNotified, router]);

  const handleArrivedNotify = async () => {
    try {
      await fetchAPI("/api/ride/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ride_id: ride.ride_id, status: "arrived" }),
      });
    } catch (error) {
      console.warn("Error updating ride status:", error);
    }
  };

  const handleStartTrip = async () => {
    try {
      await fetchAPI("/api/ride/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ride_id: ride.ride_id }),
      });
      router.replace({
        pathname: "/driver/trip",
        params: {
          ride_id: ride.ride_id,
          origin_address: ride.origin_address,
          destination_address: ride.destination_address,
          origin_latitude: ride.origin_latitude,
          origin_longitude: ride.origin_longitude,
          destination_latitude: ride.destination_latitude,
          destination_longitude: ride.destination_longitude,
          fare_price: ride.fare_price,
          user_name: ride.user_name,
          user_id: ride.user_id,
          driver_id: ride.driver_id,
        },
      });
    } catch (error) {
      console.warn("Error updating ride status:", error);
    }
  };

  const handleCancelRide = () => {
    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride?",
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
              router.replace("/driver");
            } catch (err) {
              console.warn("Error canceling:", err);
              router.replace("/driver");
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
        targetLatitude={ride.origin_latitude}
        targetLongitude={ride.origin_longitude}
        targetAddress={ride.origin_address}
        userName={ride.user_name}
        estimatedEarnings={ride.fare_price}
        onWaitUpdate={async (waitSeconds, waitFeeCents) => {
          try {
            await fetchAPI("/api/ride/wait-time", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ride_id: ride.ride_id, wait_seconds: waitSeconds, wait_fee_cents: waitFeeCents }),
            });
          } catch (err) {
            console.warn("Error reporting wait time:", err);
          }
        }}
        onArriveNotify={handleArrivedNotify}
        onStartTrip={handleStartTrip}
        onCancel={handleCancelRide}
        phaseLabel="Pickup"
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
