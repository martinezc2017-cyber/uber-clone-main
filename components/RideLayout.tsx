/**
 * RideLayout - Layout with map and bottom sheet
 * TORO Design System
 */

import { icons } from "@/constants";
import { router } from "expo-router";
import { Image, Text, TouchableOpacity, View, Keyboard } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Map from "@/components/Map";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRef, useEffect, useMemo } from "react";
import { useThemeStore, themeColors } from "@/store/themeStore";

const RideLayout = ({
  title,
  children,
  snapPoints,
  showMap = true,
  mapContent,
  sheetIndex = 0,
}: {
  title: string;
  children: React.ReactNode;
  snapPoints?: string[];
  showMap?: boolean;
  mapContent?: React.ReactNode;
  sheetIndex?: number;
}) => {
  const bottomsheetRef = useRef<BottomSheet>(null);
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const isDark = activeTheme === "dark";

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardDidShow', () => {
      bottomsheetRef.current?.snapToIndex(1);
    });

    return () => {
      keyboardWillShow.remove();
    };
  }, []);

  // Memoize background style for bottom sheet
  const sheetBackgroundStyle = useMemo(() => ({
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 12,
    elevation: 16,
  }), [colors.bg, isDark]);

  const handleIndicatorStyle = useMemo(() => ({
    backgroundColor: isDark ? "rgba(201, 165, 92, 0.4)" : "rgba(166, 124, 61, 0.3)",
    width: 40,
    height: 4,
  }), [isDark]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Back button and title */}
          <View style={{
            position: "absolute",
            zIndex: 10,
            top: 60,
            left: 0,
            right: 0,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
          }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 44,
                height: 44,
                backgroundColor: isDark ? "rgba(20, 22, 25, 0.9)" : "rgba(255, 255, 255, 0.95)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(201, 165, 92, 0.2)" : "rgba(166, 124, 61, 0.15)",
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: colors.gold,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Image
                source={icons.backArrow}
                resizeMode="contain"
                style={{ width: 24, height: 24, tintColor: colors.gold }}
              />
            </TouchableOpacity>
            {title ? (
              <Text style={{
                fontSize: 20,
                fontFamily: "Jakarta-SemiBold",
                marginLeft: 16,
                color: colors.text,
              }}>
                {title}
              </Text>
            ) : null}
          </View>
          {showMap && (mapContent ?? <Map />)}
        </View>
        <BottomSheet
          ref={bottomsheetRef}
          snapPoints={snapPoints || ["40%", "85%"]}
          index={sheetIndex}
          enablePanDownToClose={false}
          backgroundStyle={sheetBackgroundStyle}
          handleIndicatorStyle={handleIndicatorStyle}
        >
          <BottomSheetScrollView
            style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, backgroundColor: colors.bg }}
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
