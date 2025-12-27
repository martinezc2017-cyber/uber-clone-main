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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { fetchAPI } from "@/lib/fetch";
import Screen from "@/components/layout/Screen";
import { useThemeStore, themeColors } from "@/store/themeStore";
import { images } from "@/constants";

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

type ActiveRide = {
  ride_id: number;
  driver_id?: number;
  driver?: {
    first_name?: string;
    last_name?: string;
  };
};

export default function Chat() {
  const { user } = useUser();
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];

  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active ride
  useEffect(() => {
    const fetchActiveRide = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetchAPI(`/api/ride/active?clerk_id=${user.id}`);
        if (res?.data) {
          setActiveRide(res.data);
        }
      } catch (e) {
        console.warn("Error fetching active ride:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveRide();
  }, [user?.id]);

  // Fetch messages
  const fetchMessages = async () => {
    if (!activeRide?.ride_id) return;
    try {
      const res = await fetchAPI(`/api/messages?ride_id=${activeRide.ride_id}`);
      if (res?.data) {
        setMessages(res.data);
        // Mark messages as read
        await fetchAPI("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ride_id: activeRide.ride_id, reader_type: "user" }),
        });
      }
    } catch (e) {
      console.warn("Error fetching messages:", e);
    }
  };

  useEffect(() => {
    if (activeRide?.ride_id) {
      fetchMessages();
      // Poll for new messages every 3 seconds
      pollIntervalRef.current = setInterval(fetchMessages, 3000);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeRide?.ride_id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRide?.ride_id || !user?.id || sending) return;

    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      await fetchAPI("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_id: activeRide.ride_id,
          sender_type: "user",
          sender_id: user.id,
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
    const isUser = item.sender_type === "user";
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.driverBubble,
        ]}
      >
        <Text style={[styles.messageText, isUser ? styles.userText : styles.driverText]}>
          {item.message}
        </Text>
        <Text style={[styles.messageTime, isUser ? styles.userTime : styles.driverTime]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  const driverName = activeRide?.driver
    ? `${activeRide.driver.first_name || ""} ${activeRide.driver.last_name || ""}`.trim() || "Conductor"
    : "Conductor";

  if (loading) {
    return (
      <Screen>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  // No active ride - show empty state
  if (!activeRide) {
    return (
      <Screen>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
          <Text style={[styles.title, { color: colors.text }]}>Chat</Text>
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Image
              source={images.message}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No hay viaje activo
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.muted }]}>
              Cuando tengas un viaje activo, podras chatear con tu conductor aqui
            </Text>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{driverName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Viaje #{activeRide.ride_id}</Text>
          </View>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          {messages.length === 0 ? (
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>No hay mensajes aun</Text>
              <Text style={[styles.emptySubtext2, { color: colors.muted }]}>Envia un mensaje a tu conductor</Text>
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
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text }]}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={colors.muted}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  flex: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
  },
  emptyImage: {
    width: "100%",
    height: 160,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext2: {
    fontSize: 14,
    marginTop: 8,
  },
  messageList: {
    paddingVertical: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  driverBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e7eb",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
  },
  driverText: {
    color: "#1f2937",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userTime: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "right",
  },
  driverTime: {
    color: "#9ca3af",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
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
});
