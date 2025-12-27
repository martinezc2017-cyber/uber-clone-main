/**
 * ToroButton - Premium gold button with organic feel
 * TORO Design System
 */

import React, { useRef } from "react";
import {
  Pressable,
  Text,
  Animated,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

interface ToroButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function ToroButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  style,
  textStyle,
}: ToroButtonProps) {
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(opacity, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Size styles
  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, borderRadius: 12 },
    md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 16, borderRadius: 16 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 18, borderRadius: 20 },
  };

  // Variant styles
  const getVariantStyles = () => {
    const isDark = activeTheme === "dark";

    switch (variant) {
      case "primary":
        return {
          container: {
            backgroundColor: colors.gold,
            shadowColor: colors.gold,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 8,
          },
          text: {
            color: "#1A1A1A",
            fontWeight: "700" as const,
          },
        };
      case "secondary":
        return {
          container: {
            backgroundColor: isDark ? "rgba(201, 165, 92, 0.12)" : "rgba(166, 124, 61, 0.1)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(201, 165, 92, 0.3)" : "rgba(166, 124, 61, 0.25)",
          },
          text: {
            color: colors.gold,
            fontWeight: "600" as const,
          },
        };
      case "danger":
        return {
          container: {
            backgroundColor: isDark ? colors.dangerLight : "#FEE2E2",
            borderWidth: 1,
            borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(220, 38, 38, 0.25)",
          },
          text: {
            color: colors.danger,
            fontWeight: "600" as const,
          },
        };
      case "success":
        return {
          container: {
            backgroundColor: isDark ? colors.successLight : "#DCFCE7",
            borderWidth: 1,
            borderColor: isDark ? "rgba(34, 197, 94, 0.3)" : "rgba(22, 163, 74, 0.25)",
          },
          text: {
            color: colors.success,
            fontWeight: "600" as const,
          },
        };
      case "ghost":
        return {
          container: {
            backgroundColor: "transparent",
          },
          text: {
            color: colors.gold,
            fontWeight: "600" as const,
          },
        };
      default:
        return {
          container: {},
          text: { color: colors.text },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const currentSize = sizeStyles[size];

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
          opacity,
          borderRadius: currentSize.borderRadius,
          overflow: "hidden",
        },
        fullWidth && { width: "100%" },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: currentSize.paddingVertical,
            paddingHorizontal: currentSize.paddingHorizontal,
            borderRadius: currentSize.borderRadius,
            opacity: disabled ? 0.5 : 1,
          },
          variantStyles.container,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "primary" ? "#1A1A1A" : colors.gold}
          />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {icon && iconPosition === "left" && icon}
            <Text
              style={[
                {
                  fontSize: currentSize.fontSize,
                  textAlign: "center",
                  fontFamily: "Jakarta-SemiBold",
                },
                variantStyles.text,
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === "right" && icon}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
