/**
 * Car Skins Shop Screen
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
import { CAR_SKINS } from "@/constants/skins/cars";
import { Skin } from "@/constants/skins/types";
import { useSkinStore } from "@/store/skinStore";

export default function CarSkinsScreen() {
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { activeCarSkin, purchaseSkin, setActiveCarSkin, ownsSkin } = useSkinStore();

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

    setActiveCarSkin(selectedSkin.id);
    Alert.alert("Equipado!", `${selectedSkin.name} esta ahora activo`);
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
              <Text className="text-xl font-bold text-gray-900">Vehiculos</Text>
              <Text className="text-gray-500 text-sm">
                {CAR_SKINS.length} skins disponibles
              </Text>
            </View>
          </View>
          <CoinDisplay />
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Active Skin Banner */}
        <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <Text className="text-green-800 font-semibold">
            🚗 Skin activa:{" "}
            {CAR_SKINS.find((s) => s.id === activeCarSkin)?.name || "Default"}
          </Text>
        </View>

        {/* Grid */}
        <View className="flex-row flex-wrap justify-between">
          {CAR_SKINS.map((skin) => (
            <SkinCard
              key={skin.id}
              skin={skin}
              onPress={handleSkinPress}
              isActive={activeCarSkin === skin.id}
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
