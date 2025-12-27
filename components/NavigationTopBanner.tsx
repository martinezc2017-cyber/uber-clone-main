import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  distance?: string;
  instruction?: string;
  street?: string;
  turnSymbol?: string;
};

export default function NavigationTopBanner({ distance, instruction, street, turnSymbol }: Props) {
  if (!distance && !instruction && !street && !turnSymbol) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.card}>
        {turnSymbol ? (
          <View style={styles.arrowBubble}>
            <Text style={styles.arrowText}>{turnSymbol}</Text>
          </View>
        ) : null}
        <View style={styles.textCol}>
          {instruction ? <Text style={styles.instruction}>{instruction}</Text> : null}
          {street ? <Text style={styles.street}>{street}</Text> : null}
          {distance ? <Text style={styles.distance}>{distance}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  card: {
    backgroundColor: "rgba(10,12,18,0.92)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  arrowBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F5C33B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 10,
  },
  arrowText: { color: "#0B0B0B", fontWeight: "900", fontSize: 30, lineHeight: 34 },
  textCol: { flex: 1 },
  instruction: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  street: { color: "rgba(255,255,255,0.75)", fontWeight: "800", fontSize: 14, marginTop: 2 },
  distance: { color: "#F1B21A", fontWeight: "800", fontSize: 13, marginTop: 4 },
});
