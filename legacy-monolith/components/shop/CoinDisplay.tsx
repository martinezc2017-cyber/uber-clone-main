/**
 * CoinDisplay - Shows user's coin balance
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSkinStore } from "@/store/skinStore";

interface CoinDisplayProps {
  onAddCoins?: () => void;
}

export const CoinDisplay: React.FC<CoinDisplayProps> = ({ onAddCoins }) => {
  const { coins } = useSkinStore();

  return (
    <View className="flex-row items-center bg-amber-100 rounded-full px-4 py-2">
      <Text className="text-2xl mr-2">🪙</Text>
      <Text className="text-amber-700 font-bold text-lg">{coins}</Text>
      {onAddCoins && (
        <TouchableOpacity
          onPress={onAddCoins}
          className="ml-2 bg-amber-500 rounded-full w-6 h-6 items-center justify-center"
        >
          <Text className="text-white font-bold">+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
