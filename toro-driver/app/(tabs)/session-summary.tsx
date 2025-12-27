// @ts-nocheck
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useFetch } from "@/lib/fetch";
import { Driver } from "@/types/type";

// Dark glass card style (same as index.tsx)
const glassCard = {
  backgroundColor: "rgba(12, 15, 20, 0.85)",
  borderColor: "rgba(255, 255, 255, 0.08)",
  borderWidth: 1,
  borderRadius: 22,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 18,
  elevation: 12,
};

type RideRow = {
  ride_id: number;
  fare_price?: number | string | null;
  ride_time?: number | string | null;
  created_at?: string | null;
};

type DriverProfile = {
  driver: Driver & {
    created_at?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    plate?: string;
    tier?: string;
  };
  stats: {
    totalRides: number;
    totalEarnings: number;
    totalHours: number;
    totalMiles: number;
  };
  rides: RideRow[];
};

const HOURS_WINDOW = 12;

// Value is in cents, convert to dollars
const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const toNumber = (v: number | string | null | undefined) => {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatHourLabel = (hour: number) => {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${suffix}`;
};

export default function DriverSessionSummary() {
  const router = useRouter();
  const { data: drivers } = useFetch<Driver[]>("/api/driver");
  const [driverId, setDriverId] = useState<number | null>(null);

  useEffect(() => {
    if (!driverId && drivers && drivers.length > 0) {
      setDriverId(drivers[0].id);
    }
  }, [drivers, driverId]);

  const { data: profile } = useFetch<DriverProfile>(
    driverId ? `/api/driver/me?driver_id=${driverId}` : "",
  );

  const session = useMemo(() => {
    const rides = profile?.rides ?? [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - HOURS_WINDOW * 60 * 60 * 1000);

    const inWindow = rides.filter((ride) => {
      if (!ride?.created_at) return false;
      const created = new Date(ride.created_at);
      return created >= windowStart;
    });

    const sessionRides = inWindow.length > 0 ? inWindow : rides.slice(0, 12);

    const times = sessionRides
      .map((ride) => (ride.created_at ? new Date(ride.created_at) : null))
      .filter((d): d is Date => Boolean(d));

    const start =
      times.length > 0
        ? new Date(Math.min(...times.map((d) => d.getTime())))
        : windowStart;
    const end =
      times.length > 0
        ? new Date(Math.max(...times.map((d) => d.getTime())))
        : now;

    const totalEarnings = sessionRides.reduce(
      (sum, ride) => sum + toNumber(ride.fare_price),
      0,
    );
    const totalMinutes = sessionRides.reduce(
      (sum, ride) => sum + toNumber(ride.ride_time),
      0,
    );
    const completed = sessionRides.length;
    const offered = completed === 0 ? 0 : Math.max(completed, Math.ceil(completed * 1.2));

    return {
      rides: sessionRides,
      start,
      end,
      totalEarnings,
      totalMinutes,
      completed,
      offered,
    };
  }, [profile]);

  const bars = useMemo(() => {
    const buckets = Array.from({ length: HOURS_WINDOW }, () => ({
      label: "",
      amount: 0,
    }));

    const end = session.end;
    const start = new Date(end.getTime() - HOURS_WINDOW * 60 * 60 * 1000);

    for (let i = 0; i < HOURS_WINDOW; i++) {
      const hour = new Date(start.getTime());
      hour.setHours(start.getHours() + i, 0, 0, 0);
      buckets[i].label = formatHourLabel(hour.getHours());
    }

    session.rides.forEach((ride) => {
      if (!ride?.created_at) return;
      const created = new Date(ride.created_at);
      const diffMs = created.getTime() - start.getTime();
      const bucketIndex = Math.floor(diffMs / (60 * 60 * 1000));
      if (bucketIndex >= 0 && bucketIndex < HOURS_WINDOW) {
        buckets[bucketIndex].amount += toNumber(ride.fare_price);
      }
    });

    return buckets;
  }, [session]);

  const maxBar = Math.max(...bars.map((b) => b.amount), 1);
  const availableToCashOut = profile?.stats?.totalEarnings ?? session.totalEarnings;
  const streakTrips = session.completed > 0 ? session.completed : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0f14" }}
      contentContainerStyle={{ paddingTop: 50, padding: 16, gap: 14, paddingBottom: 36 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 16 }}>×</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 16,
              fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
            }}
          >
            Session summary
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontFamily: "Jakarta-Regular, system-ui, sans-serif",
            }}
          >
            {session.start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} -{" "}
            {session.end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </Text>
        </View>
      </View>

      <View
        style={{
          ...glassCard,
          padding: 16,
          gap: 10,
        }}
      >
        <Text
          style={{
            color: "#d9b14a",
            fontSize: 28,
            fontFamily: "Jakarta-ExtraBold, system-ui, sans-serif",
          }}
        >
          {formatMoney(session.totalEarnings)}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
          }}
        >
          {formatMoney(availableToCashOut)} available to cash out
        </Text>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontFamily: "Jakarta-Bold, system-ui, sans-serif",
              }}
            >
              Trips completed
            </Text>
            <Text
              style={{
                color: "#ffffff",
                fontSize: 20,
                fontFamily: "Jakarta-ExtraBold, system-ui, sans-serif",
              }}
            >
              {session.completed}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontFamily: "Jakarta-Bold, system-ui, sans-serif",
              }}
            >
              Trips offered
            </Text>
            <Text
              style={{
                color: "#ffffff",
                fontSize: 20,
                fontFamily: "Jakarta-ExtraBold, system-ui, sans-serif",
              }}
            >
              {session.offered}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          ...glassCard,
          padding: 14,
          gap: 6,
        }}
      >
        <Text
          style={{
            color: "#22c55e",
            fontSize: 13,
            fontFamily: "Jakarta-Bold, system-ui, sans-serif",
          }}
        >
          Nice! You accepted and completed {streakTrips} trips in a row.
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 12,
            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
          }}
        >
          Keep the streak going to unlock more demand in your area.
        </Text>
      </View>

      <View
        style={{
          ...glassCard,
          padding: 14,
          gap: 10,
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
              color: "#ffffff",
              fontSize: 16,
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            Earnings trends for rides
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
              }}
            >
              Details
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            padding: 12,
            gap: 10,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(217, 177, 74, 0.2)",
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "#d9b14a",
                fontSize: 12,
                fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
              }}
            >
              Your session
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 6,
              height: 160,
            }}
          >
            {bars.map((bar, idx) => {
              const heightPct = (bar.amount / maxBar) * 100;
              const barHeight = Math.max(6, (heightPct / 100) * 140);
              return (
                <View key={bar.label + idx} style={{ flex: 1, alignItems: "center" }}>
                  <View
                    style={{
                      width: "70%",
                      height: barHeight,
                      borderRadius: 6,
                      backgroundColor: idx % 2 === 0 ? "#d9b14a" : "rgba(255,255,255,0.3)",
                    }}
                  />
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 10,
                      marginTop: 6,
                      textAlign: "center",
                      fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                    }}
                  >
                    {bar.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/(tabs)/profile")}
        style={{
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <Text
          style={{
            color: "#ffffff",
            fontSize: 15,
            fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
          }}
        >
          Open earnings activity
        </Text>
      </Pressable>

      <Pressable
        style={{
          backgroundColor: "#d9b14a",
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 16,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "#1A1A1A",
            fontSize: 15,
            fontFamily: "Jakarta-Bold, system-ui, sans-serif",
          }}
        >
          Cash out balance
        </Text>
        <Text
          style={{
            color: "rgba(26, 26, 26, 0.7)",
            fontSize: 12,
            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
          }}
        >
          {formatMoney(availableToCashOut)} available
        </Text>
      </Pressable>
    </ScrollView>
  );
}
