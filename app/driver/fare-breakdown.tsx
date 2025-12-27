// @ts-nocheck
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { getTaxRate } from "@/lib/pricing";

// Dark glass card style
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

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

export default function DriverFareBreakdown() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Params from ride: fare_price (in cents), distance, duration, origin_address
  const farePriceCents = Number(params.fare_price ?? 0);
  const distanceMiles = Number(params.distance ?? 0);
  const durationMinutes = Number(params.duration ?? 0);
  const originAddress = (params.origin_address as string) || "";
  const destinationAddress = (params.destination_address as string) || "";

  const breakdown = useMemo(() => {
    // Convert cents to dollars
    const totalFare = farePriceCents / 100;

    // Get tax rate based on pickup city
    const cityName = originAddress.split(",")[1]?.trim() || "";
    const taxRate = getTaxRate("AZ", cityName);

    // Calculate subtotal (total before tax)
    // Total = Subtotal + Tax = Subtotal * (1 + taxRate)
    // Subtotal = Total / (1 + taxRate)
    const subtotal = totalFare / (1 + taxRate);
    const taxAmount = totalFare - subtotal;

    // Commission splits (from subtotal, before tax)
    const DRIVER_RATE = 0.60; // 60% for driver
    const PLATFORM_RATE = 0.20; // 20% platform fee
    const EXPENSES_RATE = 0.20; // 20% other expenses

    const driverEarnings = subtotal * DRIVER_RATE;
    const platformFee = subtotal * PLATFORM_RATE;
    const otherExpenses = subtotal * EXPENSES_RATE;

    return {
      totalFare,
      subtotal,
      taxAmount,
      taxRate,
      driverEarnings,
      platformFee,
      otherExpenses,
      distanceMiles,
      durationMinutes,
    };
  }, [farePriceCents, originAddress, distanceMiles, durationMinutes]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0f14" }}
      contentContainerStyle={{ paddingTop: 50, padding: 16, gap: 14, paddingBottom: 36 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={() => router.back()}
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
          <Text style={{ color: "#ffffff", fontSize: 16 }}>←</Text>
        </Pressable>
        <Text
          style={{
            color: "#ffffff",
            fontSize: 18,
            fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
          }}
        >
          Fare Breakdown
        </Text>
      </View>

      {/* Driver Earnings - Hero */}
      <View
        style={{
          ...glassCard,
          padding: 20,
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 14,
            fontFamily: "Jakarta-Medium, system-ui, sans-serif",
          }}
        >
          Your Earnings
        </Text>
        <Text
          style={{
            color: "#22c55e",
            fontSize: 42,
            fontFamily: "Jakarta-ExtraBold, system-ui, sans-serif",
          }}
        >
          {formatMoney(breakdown.driverEarnings)}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
          }}
        >
          {breakdown.distanceMiles.toFixed(1)} mi • {Math.round(breakdown.durationMinutes)} min
        </Text>
      </View>

      {/* Trip Route */}
      <View
        style={{
          ...glassCard,
          padding: 16,
          gap: 12,
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontFamily: "Jakarta-Medium, system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Trip Route
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#3b82f6",
            }}
          />
          <Text
            style={{
              color: "#ffffff",
              fontSize: 14,
              fontFamily: "Jakarta-Medium, system-ui, sans-serif",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {originAddress.split(",")[0] || "Pickup"}
          </Text>
        </View>

        <View style={{ marginLeft: 4, width: 2, height: 16, backgroundColor: "rgba(255,255,255,0.2)" }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#22c55e",
            }}
          />
          <Text
            style={{
              color: "#ffffff",
              fontSize: 14,
              fontFamily: "Jakarta-Medium, system-ui, sans-serif",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {destinationAddress.split(",")[0] || "Destination"}
          </Text>
        </View>
      </View>

      {/* Fare Breakdown Details */}
      <View
        style={{
          ...glassCard,
          padding: 16,
          gap: 16,
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontFamily: "Jakarta-Medium, system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Breakdown
        </Text>

        {/* Customer Total */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 15,
              fontFamily: "Jakarta-Medium, system-ui, sans-serif",
            }}
          >
            Customer Paid
          </Text>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 15,
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            {formatMoney(breakdown.totalFare)}
          </Text>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />

        {/* Subtotal */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontFamily: "Jakarta-Regular, system-ui, sans-serif",
            }}
          >
            Subtotal
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontFamily: "Jakarta-Medium, system-ui, sans-serif",
            }}
          >
            {formatMoney(breakdown.subtotal)}
          </Text>
        </View>

        {/* Tax */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontFamily: "Jakarta-Regular, system-ui, sans-serif",
            }}
          >
            Tax ({(breakdown.taxRate * 100).toFixed(1)}%)
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontFamily: "Jakarta-Medium, system-ui, sans-serif",
            }}
          >
            {formatMoney(breakdown.taxAmount)}
          </Text>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />

        {/* Driver Earnings */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#22c55e",
              }}
            />
            <Text
              style={{
                color: "#22c55e",
                fontSize: 15,
                fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
              }}
            >
              Driver Earnings (60%)
            </Text>
          </View>
          <Text
            style={{
              color: "#22c55e",
              fontSize: 15,
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            {formatMoney(breakdown.driverEarnings)}
          </Text>
        </View>

        {/* Platform Fee */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#d9b14a",
              }}
            />
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 14,
                fontFamily: "Jakarta-Regular, system-ui, sans-serif",
              }}
            >
              Platform Fee (20%)
            </Text>
          </View>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontFamily: "Jakarta-Medium, system-ui, sans-serif",
            }}
          >
            {formatMoney(breakdown.platformFee)}
          </Text>
        </View>

        {/* Other Expenses */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#6b7280",
              }}
            />
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 14,
                fontFamily: "Jakarta-Regular, system-ui, sans-serif",
              }}
            >
              Other Expenses (20%)
            </Text>
          </View>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontFamily: "Jakarta-Medium, system-ui, sans-serif",
            }}
          >
            {formatMoney(breakdown.otherExpenses)}
          </Text>
        </View>
      </View>

      {/* Visual Split */}
      <View
        style={{
          ...glassCard,
          padding: 16,
          gap: 12,
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontFamily: "Jakarta-Medium, system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Earnings Split
        </Text>

        {/* Progress bar showing split */}
        <View style={{ flexDirection: "row", height: 24, borderRadius: 12, overflow: "hidden" }}>
          <View style={{ flex: 60, backgroundColor: "#22c55e", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>60%</Text>
          </View>
          <View style={{ flex: 20, backgroundColor: "#d9b14a", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#1A1A1A", fontSize: 10, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>20%</Text>
          </View>
          <View style={{ flex: 20, backgroundColor: "#6b7280", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>20%</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" }} />
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Jakarta-Regular, system-ui, sans-serif" }}>
              You
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#d9b14a" }} />
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Jakarta-Regular, system-ui, sans-serif" }}>
              Platform
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#6b7280" }} />
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Jakarta-Regular, system-ui, sans-serif" }}>
              Expenses
            </Text>
          </View>
        </View>
      </View>

      {/* Done Button */}
      <Pressable
        onPress={() => router.back()}
        style={{
          backgroundColor: "#22c55e",
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Text
          style={{
            color: "#ffffff",
            fontSize: 16,
            fontFamily: "Jakarta-Bold, system-ui, sans-serif",
          }}
        >
          Done
        </Text>
      </Pressable>
    </ScrollView>
  );
}
