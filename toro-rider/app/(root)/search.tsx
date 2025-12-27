import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { icons } from "@/constants";
import { useLocationStore } from "@/store";
import Screen from "@/components/layout/Screen";
import { useGlassStyle } from "@/components/layout/GlassCard";
import { useThemeStore, themeColors } from "@/store/themeStore";

type LocationResult = {
  latitude: number;
  longitude: number;
  address: string;
};

type PlaceSuggestion = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  main_text: string;
  secondary_text: string;
};

type SavedPlace = {
  address: string;
  latitude: number;
  longitude: number;
};

const SearchScreen = () => {
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const glassStyle = useGlassStyle();

  const {
    userLatitude,
    userLongitude,
    userAddress,
    setDestinationLocation,
    destinationHistory,
    removeFromHistory,
  } = useLocationStore();

  const [destinationText, setDestinationText] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [homeAddress, setHomeAddress] = useState<SavedPlace | null>(null);
  const [workAddress, setWorkAddress] = useState<SavedPlace | null>(null);
  const [editingPlace, setEditingPlace] = useState<"home" | "work" | null>(null);

  // Load saved addresses on mount
  useEffect(() => {
    const loadSavedAddresses = async () => {
      try {
        const home = await AsyncStorage.getItem("savedHome");
        const work = await AsyncStorage.getItem("savedWork");
        if (home) setHomeAddress(JSON.parse(home));
        if (work) setWorkAddress(JSON.parse(work));
      } catch (e) {
        console.warn("Error loading saved addresses:", e);
      }
    };
    loadSavedAddresses();
  }, []);

  const searchLocation = useCallback(async (text: string) => {
    const query = text.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        format: "json",
        q: query,
        addressdetails: "1",
        limit: "8",
        countrycodes: "us", // Solo resultados de USA
      });

      if (userLatitude && userLongitude) {
        // 1000 millas ≈ 14.5 grados de latitud, ~18 grados de longitud
        const latDelta = 14.5;
        const lonDelta = 18;
        const minLat = Math.max(userLatitude - latDelta, 24); // Sur de USA ~24°N
        const maxLat = Math.min(userLatitude + latDelta, 49); // Norte de USA ~49°N
        const minLon = Math.max(userLongitude - lonDelta, -125); // Oeste de USA ~-125°
        const maxLon = Math.min(userLongitude + lonDelta, -66); // Este de USA ~-66°
        params.append("viewbox", `${minLon},${maxLat},${maxLon},${minLat}`);
        params.append("bounded", "0"); // Preferir pero no limitar estrictamente
      }

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "rideshare-app/1.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn("Search error status:", response.status);
        setSuggestions([]);
        return;
      }

      const data = await response.json();
      const normalized: PlaceSuggestion[] = Array.isArray(data)
        ? data
            .map((item: any) => ({
              place_id: String(item.place_id ?? `${item.lat}-${item.lon}-${Date.now()}`),
              display_name: item.display_name ?? "",
              lat: String(item.lat ?? ""),
              lon: String(item.lon ?? ""),
              main_text: item.display_name?.split(",")[0]?.trim() ?? item.display_name ?? "",
              secondary_text:
                item.display_name?.split(",").slice(1).join(",").trim() ?? "",
            }))
            .filter((item) => item.display_name && item.lat && item.lon)
        : [];

      setSuggestions(normalized);
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [userLatitude, userLongitude]);

  const handleTextChange = (text: string) => {
    setDestinationText(text);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      searchLocation(text);
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleSelectDestination = (location: LocationResult) => {
    Keyboard.dismiss();
    setDestinationLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
    });
    router.push("/(root)/find-ride");
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    const latitude = Number(suggestion.lat);
    const longitude = Number(suggestion.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      Alert.alert("Error", "Could not get location details. Please try again.");
      return;
    }

    const details: LocationResult = {
      latitude,
      longitude,
      address: suggestion.display_name,
    };

    setIsSearching(true);
    try {
      if (editingPlace) {
        await savePlaceFromSelection(details, editingPlace);
      } else {
        handleSelectDestination(details);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFromHistory = (item: typeof destinationHistory[0]) => {
    handleSelectDestination({
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address,
    });
  };

  const handleEditSavedPlace = (type: "home" | "work") => {
    setEditingPlace(type);
    setDestinationText("");
    setSuggestions([]);
  };

  const savePlaceFromSelection = async (details: LocationResult, type: "home" | "work") => {
    try {
      const savedPlace: SavedPlace = {
        address: details.address,
        latitude: details.latitude,
        longitude: details.longitude,
      };

      if (type === "home") {
        await AsyncStorage.setItem("savedHome", JSON.stringify(savedPlace));
        setHomeAddress(savedPlace);
      } else {
        await AsyncStorage.setItem("savedWork", JSON.stringify(savedPlace));
        setWorkAddress(savedPlace);
      }
      setEditingPlace(null);
      setDestinationText("");
      setSuggestions([]);
      Alert.alert("Saved", `${type === "home" ? "Home" : "Work"} address saved!`);
    } catch (e) {
      Alert.alert("Error", "Could not save address.");
    }
  };

  const handleSelectSavedPlace = (place: SavedPlace) => {
    handleSelectDestination({
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address,
    });
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1">
      {/* Header */}
      <View style={[glassStyle, { borderRadius: 0, marginHorizontal: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16 }]}>
        <TouchableOpacity
          onPress={() => {
            if (editingPlace) {
              setEditingPlace(null);
              setDestinationText("");
              setSuggestions([]);
            } else {
              router.back();
            }
          }}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.muted }}>×</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, color: colors.text }} className="font-JakartaBold">
          {editingPlace ? `Set ${editingPlace === "home" ? "Home" : "Work"} Address` : "Destination"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Card */}
        <View style={[glassStyle, { marginHorizontal: 16, marginTop: 16 }]}>
          {/* Show origin only when not editing a saved place */}
          {!editingPlace && (
            <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ alignItems: "center", marginRight: 12 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#3b82f6" }} />
                <View style={{ width: 2, height: 32, backgroundColor: colors.border, marginVertical: 4 }} />
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} />
              </View>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => router.push("/(root)/pick-location?type=pickup")}
              >
                <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Pickup</Text>
                <Text style={{ fontSize: 14, color: colors.text }} className="font-JakartaMedium" numberOfLines={1}>
                  {userAddress || "Current location"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(root)/pick-location?type=pickup")}
                style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
              >
                <Image source={icons.map} className="w-5 h-5" resizeMode="contain" style={{ tintColor: colors.accent }} />
              </TouchableOpacity>
            </View>
          )}

          {/* Search Input Row */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: 12 }}>
            {!editingPlace && <View style={{ width: 10, marginRight: 12 }} />}
            {editingPlace && (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Text style={{ fontSize: 18 }}>{editingPlace === "home" ? "🏠" : "💼"}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              {!editingPlace && <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Destination</Text>}
              <TextInput
                style={{ fontSize: 16, color: colors.text, paddingVertical: 4 }}
                className="font-JakartaMedium"
                placeholder={editingPlace ? `Search for ${editingPlace} address...` : "Where to?"}
                placeholderTextColor={colors.muted}
                value={destinationText}
                onChangeText={handleTextChange}
                autoFocus
              />
            </View>
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : destinationText.length > 0 ? (
              <TouchableOpacity onPress={() => { setDestinationText(""); setSuggestions([]); }}>
                <Text style={{ color: colors.muted, fontSize: 20 }}>×</Text>
              </TouchableOpacity>
            ) : null}
            {/* Map Pin Button for Destination */}
            {!editingPlace && (
              <TouchableOpacity
                onPress={() => router.push("/(root)/pick-location?type=destination")}
                style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: 4 }}
              >
                <Image source={icons.map} className="w-5 h-5" resizeMode="contain" style={{ tintColor: colors.accent }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={[glassStyle, { marginHorizontal: 16, marginTop: 8 }]}>
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item.place_id}-${index}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border
                }}
                onPress={() => handleSelectSuggestion(item)}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: activeTheme === "dark" ? "rgba(139, 106, 63, 0.2)" : "rgba(139, 106, 63, 0.1)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Image source={icons.point} className="w-4 h-4" resizeMode="contain" style={{ tintColor: colors.accent }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: colors.text }} className="font-JakartaSemiBold" numberOfLines={1}>
                    {item.main_text || item.display_name?.split(",")[0] || item.display_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
                    {item.secondary_text || item.display_name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Saved & Recent Locations - only show when not searching and not editing */}
        {suggestions.length === 0 && !destinationText && !editingPlace && (
          <View style={{ marginTop: 16, marginHorizontal: 16 }}>
            <View style={[glassStyle, { marginBottom: 8 }]}>
              {/* Home */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                onPress={() => homeAddress ? handleSelectSavedPlace(homeAddress) : handleEditSavedPlace("home")}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: activeTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Text style={{ fontSize: 18 }}>🏠</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: colors.text }} className="font-JakartaSemiBold">Home</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
                    {homeAddress?.address || "Add home address"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleEditSavedPlace("home")} style={{ padding: 8 }}>
                  <Text style={{ color: colors.muted }}>✏️</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Work */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", padding: 16 }}
                onPress={() => workAddress ? handleSelectSavedPlace(workAddress) : handleEditSavedPlace("work")}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: activeTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Text style={{ fontSize: 18 }}>💼</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: colors.text }} className="font-JakartaSemiBold">Work</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
                    {workAddress?.address || "Add work address"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleEditSavedPlace("work")} style={{ padding: 8 }}>
                  <Text style={{ color: colors.muted }}>✏️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            {/* Recent Searches */}
            {destinationHistory.length > 0 && (
              <View style={[glassStyle]}>
                <Text style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, fontSize: 12, color: colors.muted, textTransform: "uppercase" }} className="font-JakartaSemiBold">
                  Recent
                </Text>
                {destinationHistory.slice(0, 5).map((item, index) => (
                  <TouchableOpacity
                    key={`${item.id}-${index}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: index < Math.min(destinationHistory.length, 5) - 1 ? 1 : 0,
                      borderBottomColor: colors.border
                    }}
                    onPress={() => handleSelectFromHistory(item)}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: activeTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <Text style={{ color: colors.muted }}>🕐</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, color: colors.text }} className="font-JakartaMedium" numberOfLines={1}>
                        {item.address?.split(",")[0] || "Unknown"}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
                        {item.address || ""}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        removeFromHistory(item.id);
                      }}
                      style={{ padding: 8 }}
                    >
                      <Text style={{ color: colors.muted, fontSize: 18 }}>×</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      </SafeAreaView>
    </Screen>
  );
};

export default SearchScreen;
