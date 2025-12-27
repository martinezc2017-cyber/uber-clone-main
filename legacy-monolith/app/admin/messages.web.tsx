import React, { useEffect, useState } from "react";
import { Text, View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SwissColors } from '@/constants/theme';
import { fetchAPI } from "@/lib/fetch";

interface RideWithMessages {
  ride_id: number;
  origin_address: string;
  destination_address: string;
  ride_status: string;
  ride_created_at: string;
  user_name: string;
  driver_name: string;
  message_count: number;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: number;
  ride_id: number;
  sender_type: "user" | "driver";
  sender_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
}

export default function AdminMessages() {
  const [rides, setRides] = useState<RideWithMessages[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedRide, setSelectedRide] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch rides with messages
  useEffect(() => {
    const fetchRides = async () => {
      try {
        const response = await fetchAPI("/api/admin/messages");
        if (response?.data) {
          setRides(response.data);
        }
      } catch (error) {
        console.error("Error fetching rides:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
    const interval = setInterval(fetchRides, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Fetch messages for selected ride
  useEffect(() => {
    if (!selectedRide) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const response = await fetchAPI(`/api/admin/messages?ride_id=${selectedRide}`);
        if (response?.data) {
          setMessages(response.data);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedRide]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "SwissColors.success";
      case "in_progress": return "SwissColors.primary";
      case "cancelled": return "SwissColors.error";
      case "pending": return "#f59e0b";
      default: return "SwissColors.textMuted";
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="SwissColors.primary" />
        <Text style={{ marginTop: 16, color: "SwissColors.textMuted" }}>Cargando mensajes...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: "row", gap: 20 }}>
      {/* Rides List */}
      <View
        style={{
          width: 400,
          backgroundColor: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: "SwissColors.textPrimary",
            backgroundColor: "#f9fafb",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "SwissColors.surface" }}>
            Viajes con Mensajes
          </Text>
          <Text style={{ fontSize: 13, color: "SwissColors.textMuted", marginTop: 4 }}>
            {rides.length} conversaciones
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {rides.length === 0 ? (
            <View style={{ padding: 32, alignItems: "center" }}>
              <Text style={{ color: "SwissColors.textMuted", fontSize: 14 }}>
                No hay mensajes aún
              </Text>
            </View>
          ) : (
            rides.map((ride) => (
              <Pressable
                key={ride.ride_id}
                onPress={() => setSelectedRide(ride.ride_id)}
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f3f4f6",
                  backgroundColor: selectedRide === ride.ride_id ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "SwissColors.surface" }}>
                        Viaje #{ride.ride_id}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 12,
                          backgroundColor: getStatusColor(ride.ride_status) + "20",
                        }}
                      >
                        <Text style={{ fontSize: 11, color: getStatusColor(ride.ride_status), fontWeight: "600" }}>
                          {ride.ride_status}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: "SwissColors.textMuted", marginTop: 4 }} numberOfLines={1}>
                      {ride.user_name || "Usuario"} → {ride.driver_name || "Sin conductor"}
                    </Text>
                    <Text style={{ fontSize: 12, color: "SwissColors.textMuted", marginTop: 2 }} numberOfLines={1}>
                      {ride.origin_address?.split(",")[0] || "Origen"} → {ride.destination_address?.split(",")[0] || "Destino"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 13, color: "SwissColors.textMuted" }}>
                        {ride.message_count} msgs
                      </Text>
                      {Number(ride.unread_count) > 0 && (
                        <View
                          style={{
                            backgroundColor: "SwissColors.error",
                            borderRadius: 10,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                            {ride.unread_count}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: "SwissColors.textMuted", marginTop: 4 }}>
                      {formatDate(ride.last_message_at)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      {/* Messages Panel */}
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {!selectedRide ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
            <Text style={{ fontSize: 16, color: "SwissColors.textMuted" }}>
              Selecciona un viaje para ver los mensajes
            </Text>
          </View>
        ) : loadingMessages ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="SwissColors.primary" />
          </View>
        ) : (
          <>
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "SwissColors.textPrimary",
                backgroundColor: "#f9fafb",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "SwissColors.surface" }}>
                Viaje #{selectedRide}
              </Text>
              <Text style={{ fontSize: 13, color: "SwissColors.textMuted", marginTop: 2 }}>
                {messages.length} mensajes en esta conversación
              </Text>
            </View>

            <ScrollView style={{ flex: 1, padding: 16 }}>
              {messages.length === 0 ? (
                <View style={{ padding: 32, alignItems: "center" }}>
                  <Text style={{ color: "SwissColors.textMuted" }}>No hay mensajes</Text>
                </View>
              ) : (
                messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={{
                      marginBottom: 16,
                      maxWidth: "80%",
                      alignSelf: msg.sender_type === "user" ? "flex-start" : "flex-end",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: msg.sender_type === "user" ? "SwissColors.primary" : "SwissColors.success",
                        }}
                      />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "SwissColors.textMuted" }}>
                        {msg.sender_name || (msg.sender_type === "user" ? "Cliente" : "Conductor")}
                      </Text>
                      <Text style={{ fontSize: 11, color: "SwissColors.textMuted" }}>
                        {formatTime(msg.created_at)}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: msg.sender_type === "user" ? "#eff6ff" : "#f0fdf4",
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: msg.sender_type === "user" ? "#dbeafe" : "#dcfce7",
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "SwissColors.border", lineHeight: 20 }}>
                        {msg.message}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 10,
                        color: "SwissColors.textMuted",
                        marginTop: 4,
                        textAlign: msg.sender_type === "user" ? "left" : "right",
                      }}
                    >
                      {msg.is_read ? "✓ Leído" : "Enviado"}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

