import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { fetchAPI } from "@/lib/fetch";
import { icons } from "@/constants";
import { SwissColors } from "@/constants/theme";

interface Message {
  id: number;
  ride_id: number;
  sender_type: "user" | "driver";
  sender_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

interface RideChatProps {
  rideId: number;
  userId: number;
  userType: "user" | "driver";
  driverName?: string;
  userName?: string;
  visible: boolean;
  onClose: () => void;
}

const RideChat: React.FC<RideChatProps> = ({
  rideId,
  userId,
  userType,
  driverName,
  userName,
  visible,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch messages
  const fetchMessages = async () => {
    if (!rideId || !userId) {
      setErrorText("Falta ride_id o userId para cargar el chat.");
      setLoading(false);
      return;
    }
    setErrorText(null);
    try {
      const response = await fetchAPI(`/api/messages?ride_id=${rideId}`);
      if (response?.data) {
        setMessages(response.data);
        // Mark messages as read
        await fetchAPI("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ride_id: rideId,
            reader_type: userType,
          }),
        });
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setErrorText("No se pudieron cargar los mensajes. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Start polling when visible
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setErrorText(null);
      fetchMessages();
      // Poll for new messages every 3 seconds
      pollRef.current = setInterval(fetchMessages, 3000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [visible, rideId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetchAPI("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_id: rideId,
          sender_type: userType,
          sender_id: userId,
          message: newMessage.trim(),
        }),
      });

      if (response?.data) {
        setMessages((prev) => [...prev, response.data]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render message bubble
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_type === userType;

    return (
      <View
        className={`mb-2 max-w-[80%] ${
          isOwnMessage ? "self-end" : "self-start"
        }`}
      >
        <View
          className={`px-4 py-2 rounded-2xl ${
            isOwnMessage
              ? "bg-primary-500 rounded-br-sm"
              : "bg-gray-200 rounded-bl-sm"
          }`}
        >
          <Text
            className={`text-sm ${
              isOwnMessage ? "text-white" : "text-gray-800"
            }`}
          >
            {item.message}
          </Text>
        </View>
        <Text
          className={`text-xs text-gray-400 mt-1 ${
            isOwnMessage ? "text-right" : "text-left"
          }`}
        >
          {formatTime(item.created_at)}
          {isOwnMessage && item.is_read && " ✓✓"}
        </Text>
      </View>
    );
  };

  const otherName = userType === "user" ? driverName : userName;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        style={{ flex: 1, backgroundColor: "#fff" }}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-200 bg-white">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
            <Image
              source={icons.backArrow}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View className="flex-1 ml-2">
            <Text className="text-lg font-JakartaBold">
              {otherName || "Chat"}
            </Text>
            <Text className="text-xs text-gray-500">
              Mensajes del viaje #{rideId}
            </Text>
          </View>
        </View>

        {/* Messages */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0286FF" />
            <Text className="text-gray-500 mt-2">Cargando mensajes...</Text>
          </View>
        ) : errorText ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-gray-600 text-center mb-3">{errorText}</Text>
            <TouchableOpacity
              onPress={fetchMessages}
              className="px-4 py-2 bg-primary-500 rounded-full"
              activeOpacity={0.8}
            >
              <Text className="text-white font-JakartaSemiBold">Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Image
              source={icons.chat}
              className="w-16 h-16 mb-4 opacity-30"
              resizeMode="contain"
            />
            <Text className="text-gray-500 text-center">
              No hay mensajes aún.{"\n"}Envía un mensaje para comenzar la
              conversación.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{
              padding: 16,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input */}
        <View className="flex-row items-center px-4 py-3 border-t border-gray-200 bg-white">
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-2 text-base"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              newMessage.trim() && !sending ? "bg-primary-500" : "bg-gray-300"
            }`}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-lg">➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RideChat;
