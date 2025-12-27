// @ts-nocheck
import React, { useMemo } from "react";
import { ImageBackground, Pressable, ScrollView, Text, View } from "react-native";
import { SwissColors } from '@/constants/theme';

import { useFetch } from "@/lib/fetch";
import { Driver, Ride } from "@/types/type";

const MetricCard = ({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string;
  color: string;
  accent?: string;
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: `${color}12`,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: `${color}30`,
      gap: 6,
      minHeight: 90,
    }}
  >
    <Text
      style={{
        fontSize: 12,
        color: "SwissColors.textSecondary",
        fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: 20,
        fontWeight: "800",
        color: color,
        letterSpacing: -0.5,
        fontFamily: "Jakarta-ExtraBold, system-ui, sans-serif",
      }}
    >
      {value}
    </Text>
    {accent ? (
      <Text
        style={{
          fontSize: 12,
          color: "#0ea5e9",
          fontFamily: "Jakarta-Medium, system-ui, sans-serif",
        }}
      >
        {accent}
      </Text>
    ) : null}
  </View>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      backgroundColor: "SwissColors.surfaceDark",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: "flex-start",
    }}
  >
    <Text
      style={{
        color: "#fff",
        fontSize: 12,
        fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
      }}
    >
      {children}
    </Text>
  </View>
);

const MapPlaceholder = () => (
  <View
    style={{
      height: 220,
      borderRadius: 18,
      overflow: "hidden",
      position: "relative",
      backgroundColor: "#eef2ff",
      borderWidth: 1,
      borderColor: "SwissColors.textPrimary",
    }}
  >
    <ImageBackground
      source={{
        uri: "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/10/300/384.png",
      }}
      style={{ flex: 1 }}
      imageStyle={{ opacity: 0.18 }}
      resizeMode="cover"
    >
      <View
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #c7d2fe 0%, #bfdbfe 100%)" as any,
          opacity: 0.18,
        }}
      />
      {[...Array(5)].map((_, idx) => (
        <View
          key={idx}
          style={{
            position: "absolute",
            top: 20 + idx * 30,
            left: 30 + idx * 28,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: idx % 2 === 0 ? "SwissColors.primary" : "#a855f7",
            opacity: 0.85,
          }}
        />
      ))}
      <View
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          right: 16,
          backgroundColor: "rgba(255,255,255,0.92)",
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.9)",
        }}
      >
        <Text
          style={{
            color: "SwissColors.surfaceDark",
            fontSize: 13,
            fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
            marginBottom: 4,
          }}
        >
          Knowledge base
        </Text>
        <Text
          style={{
            color: "#475569",
            fontSize: 12,
            lineHeight: 16,
            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
          }}
        >
          Latest rides, hotspots and driver activity summarized on the map.
        </Text>
      </View>
    </ImageBackground>
  </View>
);

const ChartPlaceholder = () => (
  <View
    style={{
      height: 180,
      borderRadius: 14,
      backgroundColor: "SwissColors.textLight",
      borderWidth: 1,
      borderColor: "SwissColors.textPrimary",
      paddingHorizontal: 12,
      paddingVertical: 14,
      overflow: "hidden",
      position: "relative",
    }}
  >
    {[...Array(5)].map((_, i) => (
      <View
        key={i}
        style={{
          position: "absolute",
          top: 20 + i * 32,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "SwissColors.textPrimary",
          opacity: 0.6,
        }}
      />
    ))}
    <View
      style={{
        position: "absolute",
        top: 26,
        left: 6,
        right: 6,
        height: 120,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: "SwissColors.textSecondary",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 70,
          left: 14,
          width: "88%",
          height: 90,
          background: "linear-gradient(180deg, #c7d2fe 0%, rgba(255,255,255,0) 100%)" as any,
          transform: [{ skewX: "-14deg" }],
          borderRadius: 12,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 30,
          left: 10,
          width: "88%",
          height: 2,
          backgroundColor: "#6366f1",
          borderRadius: 999,
          boxShadow: "0 8px 16px rgba(99,102,241,0.2)",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 85,
          left: 40,
          width: "78%",
          height: 2,
          backgroundColor: "SwissColors.success",
          borderRadius: 999,
          boxShadow: "0 8px 16px rgba(34,197,94,0.2)",
        }}
      />
    </View>
    <Text
      style={{
        position: "absolute",
        bottom: 10,
        right: 12,
        fontSize: 11,
        color: "SwissColors.textSecondary",
        fontFamily: "Jakarta-Medium, system-ui, sans-serif",
      }}
    >
      Progress score · Average grade · Exams
    </Text>
  </View>
);

const DriverRow = ({
  driver,
  index,
}: {
  driver: Driver & { orders?: number; income?: number };
  index: number;
}) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: index === 4 ? 0 : 1,
      borderColor: "SwissColors.textPrimary",
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: "SwissColors.textPrimary",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: "SwissColors.surfaceDark",
            fontFamily: "Jakarta-Bold, system-ui, sans-serif",
          }}
        >
          {`${driver.first_name?.[0] ?? "?"}${driver.last_name?.[0] ?? ""}`.trim()}
        </Text>
      </View>
      <View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: "SwissColors.surfaceDark",
            fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
          }}
        >
          {driver.first_name} {driver.last_name}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: "SwissColors.textSecondary",
            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
          }}
        >
          Orders {driver.orders ?? "—"}
        </Text>
      </View>
    </View>
    <Text
      style={{
        fontSize: 14,
        fontWeight: "700",
        color: "SwissColors.surfaceDark",
        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
      }}
    >
      ${driver.income ?? 0}
    </Text>
  </View>
);

export default function AdminDashboard() {
  const { data: drivers } = useFetch<Driver[]>("/(api)/driver");
  const { data: rides } = useFetch<Ride[]>("/(api)/ride/list");

  const topDrivers = useMemo(() => {
    if (!drivers || drivers.length === 0) return [];
    const sorted = [...drivers].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return sorted.slice(0, 6).map((d) => ({
      name: `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Driver",
      rating: d.rating ?? null,
    }));
  }, [drivers]);

  const metrics = useMemo(() => {
    const totalOrders = rides?.length ?? 0;
    const totalEarnings = (rides ?? []).reduce(
      (sum, r) => sum + Number(r.fare_price || 0),
      0,
    );
    const profiles = drivers?.length ?? 0;
    return { totalOrders, totalEarnings, profiles };
  }, [rides, drivers]);

  const classPrices = [
    { name: "Start", price: 20.00 },
    { name: "Comfort", price: 30.00 },
    { name: "Standard", price: 35.00 },
    { name: "Lobo", price: 50.00 },
  ];

  const trips = [
    { user: "Olga Ferguson", carComfort: "simple", orderedTime: "04.12.2020 20:20", startLocation: "45 Scarborough st, 00-775 Warsaw, Poland", finishLocation: "34 Scarborough st, 00-775 Warsaw, Poland", income: "$58.203.206 UAH" },
    { user: "Olga Ferguson", carComfort: "vlow", orderedTime: "04.12.2020 20:24", startLocation: "45 Scarborough st, 00-775 Warsaw, Poland", finishLocation: "34 Scarborough st, 00-775 Warsaw, Poland", income: "$999.999 UAH" },
    { user: "Olga Ferguson", carComfort: "convenient", orderedTime: "04.12.2020 20:23", startLocation: "45 Scarborough st, 00-775 Warsaw, Poland", finishLocation: "34 Scarborough st, 00-775 Warsaw, Poland", income: "$3.208.603 UAH" },
    { user: "Olga Ferguson", carComfort: "convenient", orderedTime: "17.12.2020 12:20", startLocation: "45 Scarborough st, 00-775 Warsaw, Poland", finishLocation: "34 Scarborough st, 00-775 Warsaw, Poland", income: "$166.409.989 UAH" },
    { user: "Olga Ferguson", carComfort: "convenient", orderedTime: "04.12.2020 20:30", startLocation: "45 Scarborough st, 00-775 Warsaw, Poland", finishLocation: "34 Scarborough st, 00-775 Warsaw, Poland", income: "$166.409.989 UAH" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f7" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{
          flex: 1,
          padding: 24,
        }}
      >
        <View style={{ flexDirection: "row", gap: 16 }}>
          {/* Left column */}
          <View style={{ flex: 2, gap: 14 }}>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 18,
                padding: 18,
                borderWidth: 1,
                borderColor: "SwissColors.textPrimary",
                gap: 14,
                boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
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
                    color: "SwissColors.surfaceDark",
                    fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                  }}
                >
                  Knowledge base
                </Text>
                <Text
                  style={{
                    color: "SwissColors.textSecondary",
                    fontSize: 12,
                    fontFamily: "Jakarta-Medium, system-ui, sans-serif",
                  }}
                >
                  Aug 2021
                </Text>
              </View>

              {/* Knowledge map */}
              {(() => {
                const key = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
                const list = rides ?? [];
                if (!key || list.length === 0) return <MapPlaceholder />;

                const maxPoints = list.slice(0, 10);
                const originMarkers = maxPoints
                  .map(
                    (r, idx) =>
                      `markers=color:blue|label:${idx + 1}|${Number(r.origin_latitude)},${Number(r.origin_longitude)}`,
                  )
                  .join("&");
                const destMarkers = maxPoints
                  .map(
                    (r, idx) =>
                      `markers=color:red|label:${idx + 1}|${Number(r.destination_latitude)},${Number(r.destination_longitude)}`,
                  )
                  .join("&");

                const first = maxPoints[0];
                const path = first
                  ? `path=color:0x4f46e5ff|weight:4|${Number(first.origin_latitude)},${Number(first.origin_longitude)}|${Number(first.destination_latitude)},${Number(first.destination_longitude)}`
                  : "";

                const url = `https://maps.googleapis.com/maps/api/staticmap?size=640x320&scale=2&${originMarkers}&${destMarkers}${
                  path ? `&${path}` : ""
                }&key=${key}`;

                return (
                  <ImageBackground
                    source={{ uri: url }}
                    style={{ height: 220, borderRadius: 12, overflow: "hidden" }}
                    imageStyle={{ borderRadius: 12 }}
                    resizeMode="cover"
                  />
                );
              })()}

              <View style={{ flexDirection: "row", gap: 12 }}>
                <MetricCard
                  label="Total Orders"
                  value={metrics.totalOrders.toString()}
                  color="#2563eb"
                />
                <MetricCard
                  label="Total Earnings"
                  value={`$${metrics.totalEarnings.toFixed(2)}`}
                  color="SwissColors.error"
                />
                <MetricCard
                  label="Profiles"
                  value={metrics.profiles.toString()}
                  color="#f59e0b"
                />
              </View>
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 18,
                padding: 18,
                borderWidth: 1,
                borderColor: "SwissColors.textPrimary",
                gap: 18,
                boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
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
                    color: "SwissColors.surfaceDark",
                    fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                  }}
                >
                  Statistic
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "SwissColors.textSecondary",
                    fontFamily: "Jakarta-Medium, system-ui, sans-serif",
                  }}
                >
                  Aug 2021 · Progress score
                </Text>
              </View>

              <ChartPlaceholder />
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "SwissColors.textPrimary",
                overflow: "hidden",
                boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
              }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderColor: "SwissColors.textPrimary",
                  backgroundColor: "SwissColors.textLight",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: "SwissColors.surfaceDark",
                    fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                  }}
                >
                  Recent orders
                </Text>
              </View>

              <View style={{ paddingHorizontal: 14 }}>
                <View
                  style={{
                    flexDirection: "row",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderColor: "SwissColors.textPrimary",
                  }}
                >
                  {["User", "Car comfort", "Ordered time", "Start location", "Finish location", "Income"].map(
                    (label, idx) => (
                      <Text
                        key={label}
                        style={{
                          flex: idx === 0 ? 1.2 : idx === 1 ? 0.9 : idx === 5 ? 0.8 : 1.3,
                          fontSize: 12,
                          color: "SwissColors.textSecondary",
                          fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
                        }}
                      >
                        {label}
                      </Text>
                    ),
                  )}
                </View>

                {trips.map((trip, idx) => (
                  <View
                    key={trip.user + idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 14,
                      borderBottomWidth: idx === trips.length - 1 ? 0 : 1,
                      borderColor: "SwissColors.textPrimary",
                    }}
                  >
                    <View style={{ flex: 1.2, flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 12,
                          backgroundColor: "#eef2ff",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "SwissColors.textPrimary",
                        }}
                      >
                        <Text
                          style={{
                            color: "#312e81",
                            fontSize: 12,
                            fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
                          }}
                        >
                          {trip.user[0]}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: "SwissColors.surfaceDark",
                          fontSize: 13,
                          fontFamily: "Jakarta-Medium, system-ui, sans-serif",
                        }}
                      >
                        {trip.user}
                      </Text>
                    </View>
                    <Text
                      style={{
                        flex: 0.9,
                        color: "#475569",
                        fontSize: 13,
                        fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                      }}
                    >
                      {trip.carComfort}
                    </Text>
                    <Text
                      style={{
                        flex: 1.3,
                        color: "#475569",
                        fontSize: 13,
                        fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                      }}
                    >
                      {trip.orderedTime}
                    </Text>
                    <Text
                      style={{
                        flex: 1.4,
                        color: "#475569",
                        fontSize: 12,
                        lineHeight: 16,
                        fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                      }}
                    >
                      {trip.startLocation}
                    </Text>
                    <Text
                      style={{
                        flex: 1.4,
                        color: "#475569",
                        fontSize: 12,
                        lineHeight: 16,
                        fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                      }}
                    >
                      {trip.finishLocation}
                    </Text>
                    <Text
                      style={{
                        flex: 0.8,
                        textAlign: "right",
                        color: "#16a34a",
                        fontSize: 14,
                        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                      }}
                    >
                      {trip.income}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Right column */}
          <View style={{ flex: 1, gap: 14 }}>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 18,
                padding: 18,
                borderWidth: 1,
                borderColor: "SwissColors.textPrimary",
                boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: "SwissColors.surfaceDark",
                    fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                  }}
                >
                  Top Drivers
                </Text>
              </View>

              {topDrivers.length === 0 ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: "SwissColors.textSecondary",
                    fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                  }}
                >
                  No drivers yet. Add one to see the leaderboard.
                </Text>
              ) : (
                topDrivers.map((driver, idx) => (
                  <View
                    key={`${driver.name}-${idx}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 12,
                      borderBottomWidth:
                        idx === topDrivers.length - 1 ? 0 : 1,
                      borderColor: "SwissColors.textPrimary",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: "SwissColors.textPrimary",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 16, color: "SwissColors.surfaceDark" }}>
                          {driver.name[0] ?? "?"}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: "SwissColors.surfaceDark",
                            fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
                          }}
                        >
                          {driver.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "SwissColors.textMuted",
                            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                          }}
                        >
                          {driver.rating != null
                            ? `Rating ${driver.rating.toFixed(1)}`
                            : "No rating"}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: "SwissColors.surfaceDark",
                        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                      }}
                    >
                      —
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 18,
                padding: 18,
                borderWidth: 1,
                borderColor: "SwissColors.textPrimary",
                gap: 12,
                boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: "SwissColors.surfaceDark",
                  fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                }}
              >
                Class price list
              </Text>
              {classPrices.map((item, idx) => (
                <View
                  key={item.name}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    borderBottomWidth: idx === classPrices.length - 1 ? 0 : 1,
                    borderColor: "SwissColors.textPrimary",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: "SwissColors.surfaceDark",
                      fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#16a34a",
                      fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                    }}
                  >
                    ${item.price.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

