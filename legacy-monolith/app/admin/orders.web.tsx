// @ts-nocheck
import React, { useMemo, useState } from "react";
import { ScrollView, Text, View, Image } from "react-native";
import { SwissColors } from '@/constants/theme';

import { useFetch } from "@/lib/fetch";
import { Ride } from "@/types/type";

const haversineMiles = ({
  lat1,
  lon1,
  lat2,
  lon2,
}: {
  lat1: number;
  lon1: number;
  lat2: number;
  lon2: number;
}) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleString();
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: "SwissColors.textLight",
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: "SwissColors.textPrimary",
    }}
  >
    <Text
      style={{
        fontSize: 12,
        color: "#475569",
        fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: 22,
        fontWeight: "800",
        color: "SwissColors.surfaceDark",
        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
        marginTop: 4,
      }}
    >
      {value}
    </Text>
  </View>
);

const OrdersPage = () => {
  const { data, loading, error } = useFetch<Ride[]>("/(api)/ride/list");
  const rides = data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(
    rides.length ? rides[0]?.ride_id : null,
  );

  const selectedRide =
    rides.find((r) => r.ride_id === selectedId) ?? rides[0] ?? null;

  const totals = useMemo(() => {
    const count = rides.length;
    const earnings = rides.reduce((sum, r) => sum + Number(r.fare_price || 0), 0);
    const avgDist =
      rides.length === 0
        ? 0
        : rides.reduce((sum, r) => {
            const miles = haversineMiles({
              lat1: Number(r.origin_latitude),
              lon1: Number(r.origin_longitude),
              lat2: Number(r.destination_latitude),
              lon2: Number(r.destination_longitude),
            });
            return sum + miles;
          }, 0) / rides.length;
    return {
      count,
      earnings,
      avgDist,
    };
  }, [rides]);

  const staticMapUrl = useMemo(() => {
    if (!selectedRide) return "";
    const key = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    if (!key) return "";
    const oLat = Number(selectedRide.origin_latitude);
    const oLng = Number(selectedRide.origin_longitude);
    const dLat = Number(selectedRide.destination_latitude);
    const dLng = Number(selectedRide.destination_longitude);
    const markers = `markers=color:blue|label:O|${oLat},${oLng}&markers=color:red|label:D|${dLat},${dLng}`;
    const path = `path=color:0x4f46e5ff|weight:4|${oLat},${oLng}|${dLat},${dLng}`;
    return `https://maps.googleapis.com/maps/api/staticmap?size=640x320&scale=2&${markers}&${path}&key=${key}`;
  }, [selectedRide]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 40, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: "SwissColors.surfaceDark",
          fontFamily: "Jakarta-Bold, system-ui, sans-serif",
        }}
      >
        Orders
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric label="Total Orders" value={totals.count.toString()} />
        <Metric label="Total Earnings" value={`$${totals.earnings.toFixed(2)}`} />
        <Metric
          label="Avg. Distance"
          value={`${totals.avgDist.toFixed(2)} mi`}
        />
      </View>

      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "SwissColors.textPrimary",
          padding: 16,
          gap: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "SwissColors.surfaceDark",
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            Map
          </Text>
          {selectedRide ? (
            <Text
              style={{
                fontSize: 12,
                color: "#475569",
                fontFamily: "Jakarta-Medium, system-ui, sans-serif",
              }}
            >
              {selectedRide.origin_address} → {selectedRide.destination_address}
            </Text>
          ) : null}
        </View>

        {staticMapUrl ? (
          <Image
            source={{ uri: staticMapUrl }}
            style={{
              width: "100%",
              height: 260,
              borderRadius: 12,
              backgroundColor: "SwissColors.textPrimary",
            }}
          />
        ) : (
          <View
            style={{
              height: 260,
              borderRadius: 12,
              backgroundColor: "SwissColors.textPrimary",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "SwissColors.textSecondary" }}>Select a ride to view the map</Text>
          </View>
        )}
      </View>

      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "SwissColors.textPrimary",
          paddingVertical: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderColor: "SwissColors.textPrimary",
          }}
        >
          {[
            "User",
            "Driver",
            "Created",
            "From",
            "To",
            "Distance",
            "Time (min)",
            "Price",
          ].map((label, idx) => (
            <Text
              key={label}
              style={{
                flex: idx === 0 || idx === 1 ? 1 : idx === 2 ? 1.2 : 1.4,
                fontSize: 12,
                color: "SwissColors.textSecondary",
                fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
              }}
            >
              {label}
            </Text>
          ))}
        </View>

        {loading ? (
          <View style={{ padding: 20 }}>
            <Text style={{ color: "#475569" }}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={{ padding: 20 }}>
            <Text style={{ color: "SwissColors.error" }}>Error: {error}</Text>
          </View>
        ) : rides.length === 0 ? (
          <View style={{ padding: 20 }}>
            <Text style={{ color: "#475569" }}>No orders yet.</Text>
          </View>
        ) : (
          rides.map((ride) => {
            const distanceMi = haversineMiles({
              lat1: Number(ride.origin_latitude),
              lon1: Number(ride.origin_longitude),
              lat2: Number(ride.destination_latitude),
              lon2: Number(ride.destination_longitude),
            });
            const isSelected = selectedId === ride.ride_id;
            return (
              <View
                key={ride.ride_id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: "#f1f5f9",
                  backgroundColor: isSelected ? "SwissColors.textLight" : "transparent",
                  cursor: "pointer",
                } as any}
                onClick={() => setSelectedId(ride.ride_id)}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "SwissColors.surfaceDark",
                    fontFamily: "Jakarta-Medium, system-ui, sans-serif",
                  }}
                >
                  {ride.user?.name ?? ride.user?.email ?? "—"}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "SwissColors.surfaceDark",
                    fontFamily: "Jakarta-Medium, system-ui, sans-serif",
                  }}
                >
                  {ride.driver
                    ? `${ride.driver.first_name} ${ride.driver.last_name}`
                    : "—"}
                </Text>
                <Text
                  style={{
                    flex: 1.2,
                    fontSize: 12,
                    color: "#475569",
                    fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                  }}
                >
                  {formatDate(ride.created_at)}
                </Text>
                <Text
                  style={{
                    flex: 1.4,
                    fontSize: 12,
                    color: "#475569",
                    fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                  }}
                >
                  {ride.origin_address}
                </Text>
                <Text
                  style={{
                    flex: 1.4,
                    fontSize: 12,
                    color: "#475569",
                    fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                  }}
                >
                  {ride.destination_address}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "SwissColors.surfaceDark",
                    fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
                  }}
                >
                  {distanceMi.toFixed(2)} mi
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "SwissColors.surfaceDark",
                    fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
                  }}
                >
                  {ride.ride_time} min
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "SwissColors.surfaceDark",
                    fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                  }}
                >
                  ${Number(ride.fare_price).toFixed(2)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

export default OrdersPage;
// @ts-nocheck

