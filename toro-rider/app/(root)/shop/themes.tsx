/**
 * Theme Skins Shop Screen
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
import { THEME_SKINS } from "@/constants/skins/themes";
import { Skin, ThemeSkin } from "@/constants/skins/types";
import { useSkinStore } from "@/store/skinStore";

export default function ThemeSkinsScreen() {
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { activeThemeSkin, purchaseSkin, setActiveThemeSkin } = useSkinStore();

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

    setActiveThemeSkin(selectedSkin.id);
    Alert.alert(
      "Tema aplicado!",
      `${selectedSkin.name} esta ahora activo. Reinicia la app para ver los cambios completos.`
    );
    setModalVisible(false);
  };

  const activeTheme = THEME_SKINS.find((s) => s.id === activeThemeSkin) as ThemeSkin;

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
              <Text className="text-xl font-bold text-gray-900">Temas</Text>
              <Text className="text-gray-500 text-sm">
                {THEME_SKINS.length} temas disponibles
              </Text>
            </View>
          </View>
          <CoinDisplay />
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Active Theme Preview */}
        {activeTheme && (
          <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
            <Text className="text-gray-700 font-semibold mb-3">
              🎨 Tema activo: {activeTheme.name}
            </Text>
            <View className="flex-row gap-2">
              {Object.entries(activeTheme.colors).map(([key, color]) => (
                <View key={key} className="items-center">
                  <View
                    className="w-8 h-8 rounded-full border border-gray-300"
                    style={{ backgroundColor: color }}
                  />
                  <Text className="text-xs text-gray-500 mt-1">{key}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Grid */}
        <View className="flex-row flex-wrap justify-between">
          {THEME_SKINS.map((skin) => (
            <SkinCard
              key={skin.id}
              skin={skin}
              onPress={handleSkinPress}
              isActive={activeThemeSkin === skin.id}
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
