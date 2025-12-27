import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchAPI } from "@/lib/fetch";

type Message = {
  id: number;
  ride_id: number;
  sender_type: "user" | "driver";
  sender_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
};

type RideStatus = {
  ride_id: number;
  ride_status: string;
  origin_address?: string;
  destination_address?: string;
  fare_price?: number;
  ride_time?: number;
};

export default function DriverChat() {
  const params = useLocalSearchParams<{
    ride_id?: string;
    user_name?: string;
    driver_id?: string;
  }>();
  const router = useRouter();
  const rideId = params.ride_id ? Number(params.ride_id) : null;
  const userName = params.user_name || "Cliente";
  const driverId = params.driver_id ? Number(params.driver_id) : 1;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [rideStatus, setRideStatus] = useState<RideStatus | null>(null);
  const [chatEnabled, setChatEnabled] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if ride is active (chat only available during active trips)
  useEffect(() => {
    const checkRideStatus = async () => {
      if (!rideId) return;
      try {
        const res = await fetchAPI(`/api/ride/status?ride_id=${rideId}`);
        if (res?.data) {
          setRideStatus(res.data);
          // Chat only enabled for accepted, arrived, or in_progress rides
          const status = res.data.ride_status?.toLowerCase();
          const isActive = ["accepted", "arrived", "in_progress"].includes(status);
          setChatEnabled(isActive);
        }
      } catch (e) {
        console.warn("Error checking ride status:", e);
      }
    };
    checkRideStatus();
  }, [rideId]);

  // Fetch messages
  const fetchMessages = async () => {
    if (!rideId || !chatEnabled) return;
    try {
      const res = await fetchAPI(`/api/messages?ride_id=${rideId}`);
      if (res?.data) {
        setMessages(res.data);
        // Mark messages as read
        await fetchAPI("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ride_id: rideId, reader_type: "driver" }),
        });
      }
    } catch (e) {
      console.warn("Error fetching messages:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatEnabled) {
      fetchMessages();
      // Poll for new messages every 3 seconds
      pollIntervalRef.current = setInterval(fetchMessages, 3000);
    } else {
      setLoading(false);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [rideId, chatEnabled]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !rideId || sending) return;

    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      await fetchAPI("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_id: rideId,
          sender_type: "driver",
          sender_id: driverId,
          message: text,
        }),
      });
      // Refresh messages
      await fetchMessages();
    } catch (e) {
      console.warn("Error sending message:", e);
      setNewMessage(text); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isDriver = item.sender_type === "driver";
    return (
      <View
        style={[
          styles.messageBubble,
          isDriver ? styles.driverBubble : styles.userBubble,
        ]}
      >
        <Text style={[styles.messageText, isDriver ? styles.driverText : styles.userText]}>
          {item.message}
        </Text>
        <Text style={[styles.messageTime, isDriver ? styles.driverTime : styles.userTime]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  if (!rideId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Volver</Text>
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No se encontro el viaje</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Chat disabled - ride is not active
  if (!loading && !chatEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{userName}</Text>
            <Text style={styles.headerSubtitle}>Viaje #{rideId}</Text>
          </View>
        </View>
        <View style={styles.centered}>
          <Text style={styles.disabledIcon}>🔒</Text>
          <Text style={styles.disabledTitle}>Chat no disponible</Text>
          <Text style={styles.disabledText}>
            El chat solo esta disponible durante viajes activos.
          </Text>
          {rideStatus && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                Estado: {rideStatus.ride_status || "desconocido"}
              </Text>
            </View>
          )}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{userName}</Text>
          <Text style={styles.headerSubtitle}>Viaje #{rideId}</Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No hay mensajes aun</Text>
            <Text style={styles.emptySubtext}>Envia un mensaje al cliente</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#9ca3af"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Enviar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  backText: {
    fontSize: 20,
    color: "#3b82f6",
    fontWeight: "600",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#ef4444",
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 18,
    color: "#6b7280",
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginVertical: 4,
  },
  driverBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  userBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e7eb",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  driverText: {
    color: "#fff",
  },
  userText: {
    color: "#1f2937",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  driverTime: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "right",
  },
  userTime: {
    color: "#9ca3af",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1f2937",
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#9ca3af",
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  // Disabled chat styles
  disabledIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  disabledText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  statusBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusText: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
