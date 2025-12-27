// @ts-nocheck
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, Image } from "react-native";

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

type DriverProfile = {
  driver: Driver & {
    created_at?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    plate?: string;
    tier?: string;
    rating?: number;
  };
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={{ gap: 10 }}>
    <Text
      style={{
        color: "#ffffff",
        fontSize: 16,
        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
      }}
    >
      {title}
    </Text>
    <View
      style={{
        ...glassCard,
        borderRadius: 12,
      }}
    >
      {children}
    </View>
  </View>
);

const MenuItem = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={{
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.08)",
    }}
  >
    <Text style={{ fontSize: 16 }}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: "#ffffff",
          fontSize: 14,
          fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 12,
            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
    <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}>{">"}</Text>
  </Pressable>
);

export default function DriverMenu() {
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

  const initials = useMemo(() => {
    if (!profile?.driver) return "D";
    const first = profile.driver.first_name?.[0] ?? "D";
    const last = profile.driver.last_name?.[0] ?? "";
    return `${first}${last}`;
  }, [profile]);

  const vehicleLine = useMemo(() => {
    const make = profile?.driver?.vehicle_make ?? "";
    const model = profile?.driver?.vehicle_model ?? "";
    const plate = profile?.driver?.plate ?? "";
    const vehicle = `${make} ${model}`.trim();
    if (vehicle && plate) return `${vehicle} - ${plate}`;
    if (vehicle) return vehicle;
    if (plate) return plate;
    return "Vehicle not set";
  }, [profile]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0f14" }}
      contentContainerStyle={{ paddingTop: 50, padding: 16, gap: 14, paddingBottom: 36 }}
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
          Menu
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
          padding: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#d9b14a",
              overflow: "hidden",
            }}
          >
            {profile?.driver?.profile_image_url ? (
              <Image
                source={{ uri: profile.driver.profile_image_url }}
                style={{ width: 58, height: 58, borderRadius: 29 }}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: "#ffffff",
                  fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                }}
              >
                {initials}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#ffffff",
                fontSize: 18,
                fontFamily: "Jakarta-ExtraBold, system-ui, sans-serif",
              }}
            >
              {profile?.driver
                ? `${profile.driver.first_name ?? ""} ${
                    profile.driver.last_name ?? ""
                  }`.trim()
                : "Driver"}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontFamily: "Jakarta-Medium, system-ui, sans-serif",
              }}
            >
              Rating: {profile?.driver?.rating ?? "pending"}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Help", slug: "help" },
            { label: "Safety", slug: "safety" },
            { label: "Settings", slug: "settings" },
          ].map((item) => (
            <Pressable
              key={item.slug}
              onPress={() => router.push(`/(tabs)/menu/${item.slug}`)}
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 13,
                  fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Section title="Earnings & Growth">
        {[
          { icon: "[R]", title: "Refer a Driver", subtitle: "Earn bonuses", slug: "refer-friends" },
        ].map((item) => (
          <MenuItem
            key={item.slug}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => router.push(`/(tabs)/menu/${item.slug}`)}
          />
        ))}
      </Section>

      <Section title="Onboarding">
        <MenuItem
          icon="[W]"
          title="Driver waitlist"
          subtitle="Solicita acceso prioritario"
          onPress={() => router.push("/(tabs)/waitlist")}
        />
      </Section>

      <Section title="Manage">
        {[
          { icon: "[V]", title: "Vehicles", subtitle: vehicleLine, slug: "vehicles" },
          { icon: "[D]", title: "Documents", slug: "documents" },
          { icon: "[I]", title: "Insurance", slug: "insurance" },
        ].map((item) => (
          <MenuItem
            key={item.slug}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => router.push(`/(tabs)/menu/${item.slug}`)}
          />
        ))}
      </Section>

      <Section title="Money">
        <MenuItem
          icon="[S]"
          title="Session Summary"
          subtitle="View earnings history"
          onPress={() => router.push("/(tabs)/session-summary")}
        />
        {[
          { icon: "[T]", title: "Tax Info", slug: "tax-info", subtitle: "" },
          { icon: "[$]", title: "Payout methods", slug: "payout-methods", subtitle: "" },
        ].map((item) => (
          <MenuItem
            key={item.slug}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => router.push(`/(tabs)/menu/${item.slug}`)}
          />
        ))}
      </Section>

      <Section title="Resources">
        {[
          { icon: "[L]", title: "Learning Center", slug: "learning-center", subtitle: "" },
          { icon: "[B]", title: "Bug Reporter", slug: "bug-reporter", subtitle: "" },
          { icon: "[i]", title: "About", slug: "about", subtitle: "" },
        ].map((item) => (
          <MenuItem
            key={item.slug}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => router.push(`/(tabs)/menu/${item.slug}`)}
          />
        ))}
      </Section>
    </ScrollView>
  );
}
