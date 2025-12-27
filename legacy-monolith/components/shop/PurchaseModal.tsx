/**
 * PurchaseModal - Modal for purchasing or equipping a skin
 */

import React from "react";
import { View, Text, Image, TouchableOpacity, Modal } from "react-native";
import { Skin, RARITY_COLORS, RARITY_LABELS } from "@/constants/skins/types";
import { useSkinStore } from "@/store/skinStore";

interface PurchaseModalProps {
  skin: Skin | null;
  visible: boolean;
  onClose: () => void;
  onPurchase: () => void;
  onEquip: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  skin,
  visible,
  onClose,
  onPurchase,
  onEquip,
}) => {
  const { coins, ownsSkin } = useSkinStore();

  if (!skin) return null;

  const owned = ownsSkin(skin.id);
  const canAfford = coins >= skin.price;
  const rarityColor = RARITY_COLORS[skin.rarity];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          {/* Header */}
          <View className="items-center mb-4">
            <View
              className="px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: rarityColor + "20" }}
            >
              <Text style={{ color: rarityColor, fontWeight: "600" }}>
                {RARITY_LABELS[skin.rarity]}
              </Text>
            </View>

            {/* Preview */}
            <View
              className="w-32 h-32 rounded-xl items-center justify-center mb-3"
              style={{ backgroundColor: rarityColor + "10" }}
            >
              <Image
                source={skin.preview}
                className="w-24 h-24"
                resizeMode="contain"
              />
            </View>

            <Text className="text-xl font-bold text-gray-900">{skin.name}</Text>
            <Text className="text-gray-500 text-center mt-1">
              {skin.description}
            </Text>
          </View>

          {/* Badges */}
          <View className="flex-row justify-center gap-2 mb-4">
            {skin.isNew && (
              <View className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="text-blue-600 font-semibold">Nuevo</Text>
              </View>
            )}
            {skin.isLimited && (
              <View className="bg-amber-100 px-3 py-1 rounded-full">
                <Text className="text-amber-600 font-semibold">Edicion Limitada</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {owned ? (
            <TouchableOpacity
              onPress={onEquip}
              className="bg-green-500 py-4 rounded-xl mb-3"
            >
              <Text className="text-white font-bold text-center text-lg">
                Equipar
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* Price Display */}
              <View className="bg-gray-100 rounded-xl p-3 mb-3 flex-row justify-between items-center">
                <Text className="text-gray-600">Precio</Text>
                <View className="flex-row items-center">
                  <Text className="text-xl font-bold text-amber-600">
                    {skin.price}
                  </Text>
                  <Text className="text-amber-500 ml-1">monedas</Text>
                </View>
              </View>

              {/* Your Balance */}
              <View className="bg-gray-50 rounded-xl p-3 mb-4 flex-row justify-between items-center">
                <Text className="text-gray-600">Tu saldo</Text>
                <Text
                  className={`text-lg font-bold ${
                    canAfford ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {coins} monedas
                </Text>
              </View>

              <TouchableOpacity
                onPress={onPurchase}
                disabled={!canAfford}
                className={`py-4 rounded-xl mb-3 ${
                  canAfford ? "bg-amber-500" : "bg-gray-300"
                }`}
              >
                <Text
                  className={`font-bold text-center text-lg ${
                    canAfford ? "text-white" : "text-gray-500"
                  }`}
                >
                  {canAfford ? "Comprar" : "Monedas insuficientes"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Close Button */}
          <TouchableOpacity onPress={onClose} className="py-3">
            <Text className="text-gray-500 text-center font-semibold">
              Cerrar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
