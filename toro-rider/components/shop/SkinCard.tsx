/**
 * SkinCard - Displays a skin item in the shop
 */

import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Skin, RARITY_COLORS, RARITY_LABELS } from "@/constants/skins/types";
import { useSkinStore } from "@/store/skinStore";

interface SkinCardProps {
  skin: Skin;
  onPress: (skin: Skin) => void;
  isActive?: boolean;
}

export const SkinCard: React.FC<SkinCardProps> = ({ skin, onPress, isActive }) => {
  const { ownsSkin } = useSkinStore();
  const owned = ownsSkin(skin.id);
  const rarityColor = RARITY_COLORS[skin.rarity];

  return (
    <TouchableOpacity
      onPress={() => onPress(skin)}
      className={`bg-white rounded-xl p-3 m-1 shadow-sm border-2 ${
        isActive ? "border-green-500" : owned ? "border-gray-300" : "border-transparent"
      }`}
      style={{ width: "47%" }}
    >
      {/* Badges */}
      <View className="flex-row justify-between mb-2">
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: rarityColor + "20" }}
        >
          <Text style={{ color: rarityColor, fontSize: 10, fontWeight: "600" }}>
            {RARITY_LABELS[skin.rarity]}
          </Text>
        </View>
        {skin.isNew && (
          <View className="bg-blue-500 px-2 py-0.5 rounded-full">
            <Text className="text-white text-xs font-semibold">NEW</Text>
          </View>
        )}
        {skin.isLimited && (
          <View className="bg-amber-500 px-2 py-0.5 rounded-full">
            <Text className="text-white text-xs font-semibold">LIMITED</Text>
          </View>
        )}
      </View>

      {/* Preview Image */}
      <View className="items-center justify-center h-20 mb-2">
        <Image
          source={skin.preview}
          className="w-16 h-16"
          resizeMode="contain"
        />
      </View>

      {/* Name */}
      <Text className="text-gray-900 font-semibold text-center" numberOfLines={1}>
        {skin.name}
      </Text>

      {/* Price or Status */}
      <View className="mt-2 items-center">
        {owned ? (
          <View className="flex-row items-center">
            {isActive ? (
              <Text className="text-green-600 font-semibold text-sm">Activo</Text>
            ) : (
              <Text className="text-gray-500 text-sm">Adquirido</Text>
            )}
          </View>
        ) : (
          <View className="flex-row items-center bg-amber-100 px-3 py-1 rounded-full">
            <Text className="text-amber-700 font-bold">{skin.price}</Text>
            <Text className="text-amber-600 ml-1 text-xs">monedas</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
