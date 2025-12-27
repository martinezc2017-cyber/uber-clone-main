/**
 * Shop - Main shop screen with categories
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { CoinDisplay } from "@/components/shop";
import { useSkinStore } from "@/store/skinStore";

const CATEGORIES = [
  {
    id: "cars",
    title: "Vehiculos",
    description: "Personaliza como se ve tu vehiculo en el mapa",
    icon: "🚗",
    route: "/shop/cars" as const,
    color: "#3B82F6",
  },
  {
    id: "themes",
    title: "Temas",
    description: "Cambia los colores y estilo de la app",
    icon: "🎨",
    route: "/shop/themes" as const,
    color: "#8B5CF6",
  },
  {
    id: "avatars",
    title: "Avatares",
    description: "Elige tu imagen de perfil",
    icon: "👤",
    route: "/shop/avatars" as const,
    color: "#10B981",
  },
];

export default function ShopScreen() {
  const { addCoins } = useSkinStore();

  const handleAddCoins = () => {
    Alert.alert(
      "Obtener Monedas",
      "Esta es una version de prueba. Se te agregaran 500 monedas gratis.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Obtener",
          onPress: () => {
            addCoins(500);
            Alert.alert("Listo!", "Se agregaron 500 monedas a tu cuenta");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Tienda</Text>
            <Text className="text-gray-500">Personaliza tu experiencia</Text>
          </View>
          <CoinDisplay onAddCoins={handleAddCoins} />
        </View>
      </View>

      <ScrollView className="flex-1 p-5">
        {/* Categories */}
        <Text className="text-lg font-semibold text-gray-700 mb-4">
          Categorias
        </Text>

        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => router.push(category.route)}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm flex-row items-center"
            style={{ borderLeftWidth: 4, borderLeftColor: category.color }}
          >
            <View
              className="w-14 h-14 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: category.color + "15" }}
            >
              <Text className="text-3xl">{category.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                {category.title}
              </Text>
              <Text className="text-gray-500 text-sm">
                {category.description}
              </Text>
            </View>
            <Text className="text-gray-400 text-xl">›</Text>
          </TouchableOpacity>
        ))}

        {/* Promo Banner */}
        <View className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-5 mt-4">
          <View className="bg-amber-500 rounded-2xl p-5">
            <Text className="text-white text-lg font-bold mb-1">
              🎁 Oferta Especial
            </Text>
            <Text className="text-amber-100 text-sm">
              Compra monedas y obtiene un 20% extra. Solo por tiempo limitado!
            </Text>
            <TouchableOpacity
              onPress={handleAddCoins}
              className="bg-white mt-3 py-2 px-4 rounded-lg self-start"
            >
              <Text className="text-amber-600 font-semibold">Ver ofertas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Inventory Link */}
        <TouchableOpacity
          onPress={() => router.push("/shop/inventory")}
          className="bg-gray-100 rounded-2xl p-5 mt-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <Text className="text-2xl mr-3">📦</Text>
            <View>
              <Text className="text-gray-900 font-semibold">Mi Inventario</Text>
              <Text className="text-gray-500 text-sm">
                Ver tus skins adquiridas
              </Text>
            </View>
          </View>
          <Text className="text-gray-400 text-xl">›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
