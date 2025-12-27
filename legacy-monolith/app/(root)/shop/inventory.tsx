/**
 * Inventory Screen - Shows all owned skins
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSkinStore } from "@/store/skinStore";
import { CAR_SKINS } from "@/constants/skins/cars";
import { THEME_SKINS } from "@/constants/skins/themes";
import { AVATAR_SKINS } from "@/constants/skins/avatars";
import { RARITY_COLORS } from "@/constants/skins/types";

export default function InventoryScreen() {
  const { ownedSkins, activeCarSkin, activeThemeSkin, activeAvatarSkin } =
    useSkinStore();

  const ownedCarSkins = CAR_SKINS.filter((s) => ownedSkins.includes(s.id));
  const ownedThemeSkins = THEME_SKINS.filter((s) => ownedSkins.includes(s.id));
  const ownedAvatarSkins = AVATAR_SKINS.filter((s) => ownedSkins.includes(s.id));

  const renderSkinItem = (
    skin: (typeof CAR_SKINS)[0],
    isActive: boolean,
    type: string
  ) => (
    <View
      key={skin.id}
      className={`bg-white rounded-xl p-3 mr-3 w-28 border-2 ${
        isActive ? "border-green-500" : "border-transparent"
      }`}
    >
      <View className="items-center">
        <Image
          source={skin.preview}
          className="w-12 h-12 mb-2"
          resizeMode="contain"
        />
        <Text className="text-xs font-semibold text-center" numberOfLines={1}>
          {skin.name}
        </Text>
        <View
          className="mt-1 px-2 py-0.5 rounded-full"
          style={{ backgroundColor: RARITY_COLORS[skin.rarity] + "20" }}
        >
          <Text
            style={{ color: RARITY_COLORS[skin.rarity], fontSize: 8 }}
            className="font-semibold"
          >
            {skin.rarity.toUpperCase()}
          </Text>
        </View>
        {isActive && (
          <Text className="text-green-600 text-xs mt-1">Activo</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-2xl">←</Text>
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900">Mi Inventario</Text>
            <Text className="text-gray-500 text-sm">
              {ownedSkins.length} skins en total
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Cars Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            🚗 Vehiculos ({ownedCarSkins.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ownedCarSkins.map((skin) =>
              renderSkinItem(skin, activeCarSkin === skin.id, "car")
            )}
          </ScrollView>
        </View>

        {/* Themes Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            🎨 Temas ({ownedThemeSkins.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ownedThemeSkins.map((skin) =>
              renderSkinItem(skin, activeThemeSkin === skin.id, "theme")
            )}
          </ScrollView>
        </View>

        {/* Avatars Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            👤 Avatares ({ownedAvatarSkins.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ownedAvatarSkins.map((skin) =>
              renderSkinItem(skin, activeAvatarSkin === skin.id, "avatar")
            )}
          </ScrollView>
        </View>

        {/* Stats */}
        <View className="bg-white rounded-xl p-4 mt-4">
          <Text className="text-gray-700 font-semibold mb-3">Estadisticas</Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">
                {ownedSkins.length}
              </Text>
              <Text className="text-gray-500 text-sm">Total</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-purple-600">
                {
                  ownedSkins.filter((id) =>
                    [...CAR_SKINS, ...THEME_SKINS, ...AVATAR_SKINS].find(
                      (s) => s.id === id && s.rarity === "legendary"
                    )
                  ).length
                }
              </Text>
              <Text className="text-gray-500 text-sm">Legendarias</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-amber-600">
                {
                  ownedSkins.filter((id) =>
                    [...CAR_SKINS, ...THEME_SKINS, ...AVATAR_SKINS].find(
                      (s) => s.id === id && s.isLimited
                    )
                  ).length
                }
              </Text>
              <Text className="text-gray-500 text-sm">Limitadas</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
