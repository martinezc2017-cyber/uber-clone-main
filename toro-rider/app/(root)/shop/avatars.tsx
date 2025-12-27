/**
 * Avatar Skins Shop Screen
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SkinCard, PurchaseModal, CoinDisplay } from "@/components/shop";
import { AVATAR_SKINS } from "@/constants/skins/avatars";
import { Skin } from "@/constants/skins/types";
import { useSkinStore } from "@/store/skinStore";

export default function AvatarSkinsScreen() {
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { activeAvatarSkin, purchaseSkin, setActiveAvatarSkin } = useSkinStore();

  const handleSkinPress = (skin: Skin) => {
    setSelectedSkin(skin);
    setModalVisible(true);
  };

  const handlePurchase = () => {
    if (!selectedSkin) return;

    const success = purchaseSkin(selectedSkin);
    if (success) {
      Alert.alert("Compra exitosa!", `Ahora tienes ${selectedSkin.name}`);
      setModalVisible(false);
    } else {
      Alert.alert("Error", "No se pudo completar la compra");
    }
  };

  const handleEquip = () => {
    if (!selectedSkin) return;

    setActiveAvatarSkin(selectedSkin.id);
    Alert.alert("Avatar equipado!", `${selectedSkin.name} es tu nuevo avatar`);
    setModalVisible(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Text className="text-2xl">←</Text>
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-gray-900">Avatares</Text>
              <Text className="text-gray-500 text-sm">
                {AVATAR_SKINS.length} avatares disponibles
              </Text>
            </View>
          </View>
          <CoinDisplay />
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Active Avatar Banner */}
        <View className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
          <Text className="text-purple-800 font-semibold">
            👤 Avatar activo:{" "}
            {AVATAR_SKINS.find((s) => s.id === activeAvatarSkin)?.name || "Default"}
          </Text>
        </View>

        {/* Filter by Category */}
        <Text className="text-gray-700 font-semibold mb-3">Por categoria</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          {["Todos", "Professional", "Casual", "Gaming", "Fantasy"].map(
            (category) => (
              <TouchableOpacity
                key={category}
                className="bg-white px-4 py-2 rounded-full mr-2 border border-gray-200"
              >
                <Text className="text-gray-700">{category}</Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* Grid */}
        <View className="flex-row flex-wrap justify-between">
          {AVATAR_SKINS.map((skin) => (
            <SkinCard
              key={skin.id}
              skin={skin}
              onPress={handleSkinPress}
              isActive={activeAvatarSkin === skin.id}
            />
          ))}
        </View>
      </ScrollView>

      {/* Purchase Modal */}
      <PurchaseModal
        skin={selectedSkin}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPurchase={handlePurchase}
        onEquip={handleEquip}
      />
    </SafeAreaView>
  );
}
