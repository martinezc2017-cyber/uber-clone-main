// @ts-nocheck
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useFetch } from "@/lib/fetch";
import { fetchAPI } from "@/lib/fetch";
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

type DriverProfile = {
  driver: Driver & { created_at?: string; vehicle_make?: string; vehicle_model?: string; plate?: string; tier?: string };
  stats: {
    totalRides: number;
    totalEarnings: number;
    totalHours: number;
    totalMiles: number;
  };
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View
    style={{
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.08)",
      paddingVertical: 16,
      gap: 10,
    }}
  >
    <Text
      style={{
        fontSize: 18,
        fontWeight: "800",
        color: "#ffffff",
        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
      }}
    >
      {title}
    </Text>
    {children}
  </View>
);

export default function DriverProfile() {
  const router = useRouter();
  const { data: drivers } = useFetch<Driver[]>("/api/driver");
  const [driverId, setDriverId] = useState<number | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId && drivers && drivers.length > 0) {
      setDriverId(drivers[0].id);
    }
  }, [drivers, driverId]);

  const { data: profile, refetch } = useFetch<DriverProfile>(
    driverId ? `/api/driver/me?driver_id=${driverId}` : "",
  );

  const years = useMemo(() => {
    if (!profile?.driver?.created_at) return "—";
    const created = new Date(profile.driver.created_at);
    const diffYears = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return diffYears.toFixed(1);
  }, [profile]);

  useEffect(() => {
    if (profile?.driver?.profile_image_url) {
      setProfilePhoto(profile.driver.profile_image_url);
    }
  }, [profile?.driver?.profile_image_url]);

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && driverId) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const base64 = asset.base64;
        const dataUrl =
          base64 && asset.type
            ? `data:${asset.type};base64,${base64}`
            : uri;

        setProfilePhoto(uri);

        try {
          await fetchAPI("/api/driver/photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              driver_id: driverId,
              profile_image_url: dataUrl,
            }),
          });
          await refetch();
        } catch (error) {
          console.error("Error saving photo:", error);
        }
      }
    } catch (error) {
      console.error("Error picking photo:", error);
    }
  };

  const vehicle = `${profile?.driver?.vehicle_make ?? ""} ${profile?.driver?.vehicle_model ?? ""}`.trim() || "Vehicle not set";
  const plate = profile?.driver?.plate ?? "Plate not set";
  const tier = profile?.driver?.tier ?? "Standard";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0f14" }}
      contentContainerStyle={{ paddingTop: 50, padding: 16, gap: 14, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text
          style={{
            color: "#ffffff",
            fontSize: 24,
            fontWeight: "800",
            fontFamily: "Jakarta-Bold, system-ui, sans-serif",
          }}
        >
          Profile
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: "#d9b14a",
          }}
        >
          <Text style={{ color: "#1A1A1A", fontSize: 14, fontWeight: "700", fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>← Back</Text>
        </Pressable>
      </View>

      <View
        style={{
          ...glassCard,
          padding: 16,
          gap: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={pickPhoto}
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#d9b14a",
            overflow: "hidden",
          }}
        >
          {profilePhoto ? (
            <Image
              source={{ uri: profilePhoto }}
              style={{ width: 72, height: 72, borderRadius: 36 }}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: "#ffffff",
                fontFamily: "Jakarta-Bold, system-ui, sans-serif",
              }}
            >
              {profile?.driver
                ? `${profile.driver.first_name?.[0] ?? "D"}${
                    profile.driver.last_name?.[0] ?? ""
                  }`
                : "D"}
            </Text>
          )}
        </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: "#ffffff",
                fontFamily: "Jakarta-Bold, system-ui, sans-serif",
              }}
            >
              {profile?.driver
                ? `${profile.driver.first_name ?? ""} ${
                    profile.driver.last_name ?? ""
                  }`.trim()
                : "Select a driver"}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                fontFamily: "Jakarta-Regular, system-ui, sans-serif",
              }}
            >
              {vehicle} • {plate}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#d9b14a",
                fontWeight: "700",
                fontFamily: "Jakarta-Bold, system-ui, sans-serif",
              }}
            >
              {tier}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            padding: 12,
            gap: 12,
          }}
        >
          {[
            { label: "Rides", value: profile?.stats?.totalRides ?? 0 },
            { label: "Rating", value: profile?.driver?.rating ?? "—" },
            { label: "Years", value: years },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#ffffff",
                  fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                }}
              >
                {item.value}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                  fontFamily: "Jakarta-Medium, system-ui, sans-serif",
                }}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            padding: 12,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#ffffff",
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            Lifetime miles
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: "#d9b14a",
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            {(profile?.stats?.totalMiles ?? 0).toFixed(2)} mi
          </Text>
        </View>

        {<Section title="More Ways to Earn">
          <View style={{ gap: 10 }}>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Jakarta-Medium, system-ui, sans-serif" }}>
              Scheduled Rides (coming soon)
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Jakarta-Medium, system-ui, sans-serif" }}>
              Refer a friend (coming soon)
            </Text>
          </View>
        </Section>

        <Section title="Vehicle and Devices">
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Jakarta-Medium, system-ui, sans-serif" }}>
            {vehicle} • {plate}
          </Text>
        </Section>

        <Section title="Account">
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Jakarta-Medium, system-ui, sans-serif" }}>
            Manage account settings in admin panel.
          </Text>
        </Section>

        <Section title="Support and Resources">
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Jakarta-Medium, system-ui, sans-serif" }}>
            Support links coming soon.
          </Text>
        </Section>

        <Pressable
          style={{
            paddingVertical: 14,
            alignItems: "center",
            borderRadius: 12,
            backgroundColor: "#ef4444",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight: "800",
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            Log out
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

