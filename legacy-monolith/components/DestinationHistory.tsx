import { View, Text, TouchableOpacity, Image } from "react-native";
import { useLocationStore } from "@/store";
import { icons } from "@/constants";

interface DestinationHistoryProps {
  onSelectDestination: (location: { latitude: number; longitude: number; address: string }) => void;
}

const DestinationHistory = ({ onSelectDestination }: DestinationHistoryProps) => {
  const { destinationHistory, removeFromHistory, clearHistory } = useLocationStore();

  if (destinationHistory.length === 0) {
    return null;
  }

  return (
    <View className="mt-5">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-JakartaSemiBold">Recent Destinations</Text>
        <TouchableOpacity
          onPress={clearHistory}
          className="px-3 py-1 bg-red-100 rounded-full"
        >
          <Text className="text-red-600 text-xs font-JakartaSemiBold">Clear All</Text>
        </TouchableOpacity>
      </View>

      <View className="space-y-2">
        {destinationHistory.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelectDestination({
              latitude: item.latitude,
              longitude: item.longitude,
              address: item.address,
            })}
            className="flex-row items-center bg-white rounded-xl p-3 shadow-sm"
            activeOpacity={0.7}
          >
            <Image
              source={icons.point}
              className="w-5 h-5 mr-3"
              resizeMode="contain"
            />
            <Text
              className="flex-1 text-sm font-JakartaRegular"
              numberOfLines={2}
            >
              {item.address}
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                removeFromHistory(item.id);
              }}
              className="ml-2 w-6 h-6 bg-gray-200 rounded-full items-center justify-center"
            >
              <Text className="text-gray-600 text-xs font-bold">✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default DestinationHistory;
