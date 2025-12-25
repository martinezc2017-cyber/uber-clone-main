import { icons } from "@/constants";
import { router } from "expo-router";
import { Image, Text, TouchableOpacity, View, Keyboard } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Map from "@/components/Map";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRef, useEffect } from "react";

const RideLayout = ({
  title,
  children,
  snapPoints,
  showMap = true,
  mapContent,
}: {
  title: string;
  children: React.ReactNode;
  snapPoints?: string[];
  showMap?: boolean;
  mapContent?: React.ReactNode;
}) => {
  const bottomsheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardDidShow', () => {
      bottomsheetRef.current?.snapToIndex(1);
    });

    return () => {
      keyboardWillShow.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView>
      <View className="flex-1 bg-white">
        <View className={`flex flex-col bg-blue-500 ${showMap ? "h-screen" : ""}`}>
          <View className="flex flex-row absolute z-10 top-16 items-center justify-start px-5">
            <TouchableOpacity onPress={() => router.back()}>
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center">
                <Image
                  source={icons.backArrow}
                  resizeMode="contain"
                  className="w-6 h-6"
                />
              </View>
            </TouchableOpacity>
            <Text className="text-xl font-JakartaSemiBold ml-5">
              {title || "Go Back"}
            </Text>
          </View>
          {showMap && (mapContent ?? <Map />)}
        </View>
        <BottomSheet
          ref={bottomsheetRef}
          snapPoints={snapPoints || ["40%", "85%"]}
          index={0}
          enablePanDownToClose={false}
           >
            <BottomSheetScrollView
              style={{ flex: 1, padding: 20 }}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </BottomSheetScrollView>
            </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
};

export default RideLayout;
