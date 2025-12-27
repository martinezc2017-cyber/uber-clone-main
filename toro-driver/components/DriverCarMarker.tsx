import React from "react";
import { View } from "react-native";

interface Props {
  size?: number;
  selected?: boolean;
  rotation?: number; // Ángulo de rotación en grados
  variant?: "arrow" | "dot"; // arrow = navigation mode, dot = overview
}

/**
 * Premium navigation marker - Google Maps / Uber style
 * Uses a directional arrow for navigation, simple dot for overview
 */
const DriverCarMarker: React.FC<Props> = ({
  size = 48,
  selected = false,
  rotation = 0,
  variant = "arrow"
}) => {
  // TORO gold colors
  const primaryColor = "#C9A55C";
  const accentColor = "#D4AF61";
  const darkColor = "#1A1A1A";

  if (variant === "dot") {
    // Simple pulsing dot for overview mode
    return (
      <View style={{
        width: size * 0.6,
        height: size * 0.6,
        alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Outer pulse ring */}
        <View style={{
          position: "absolute",
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: size * 0.3,
          backgroundColor: "rgba(201, 165, 92, 0.2)",
        }} />
        {/* Inner dot */}
        <View style={{
          width: size * 0.35,
          height: size * 0.35,
          borderRadius: size * 0.175,
          backgroundColor: primaryColor,
          borderWidth: 2,
          borderColor: "#FFFFFF",
          shadowColor: primaryColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 4,
          elevation: 6,
        }} />
      </View>
    );
  }

  // Navigation arrow - Google Maps blue style pointing UP
  const blue = "#4285F4";
  const w = size * 0.3;
  const h = size * 0.5;

  return (
    <View style={{
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "center",
      transform: [{ rotate: `${rotation}deg` }],
    }}>
      {/* Glow circle */}
      <View style={{
        position: "absolute",
        width: size * 0.85,
        height: size * 0.85,
        borderRadius: size * 0.425,
        backgroundColor: "rgba(66, 133, 244, 0.2)",
      }} />
      {/* White border (outer arrow) */}
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: w + 4,
        borderRightWidth: w + 4,
        borderBottomWidth: h + 6,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "#FFFFFF",
      }} />
      {/* Blue inner arrow */}
      <View style={{
        position: "absolute",
        width: 0,
        height: 0,
        borderLeftWidth: w,
        borderRightWidth: w,
        borderBottomWidth: h,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: blue,
      }} />
    </View>
  );
};

export default DriverCarMarker;
