/**
 * GoogleTextInput - Location search input
 * TORO Design System
 */

import { View, Image, TextInput, TouchableOpacity, Text, Keyboard } from "react-native";
import { useState } from "react";
import Constants from 'expo-constants';

import { icons } from "@/constants";
import { GoogleInputProps } from "@/types/type";
import { useThemeStore, themeColors } from "@/store/themeStore";

const GoogleTextInput = ({
  icon,
  initialLocation,
  containerStyle,
  textInputBackgroundColor,
  handlePress,
}: GoogleInputProps) => {
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const isDark = activeTheme === "dark";

  const searchLocation = async (text: string, retryCount = 0) => {
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchUrl = `https://nominatim.openstreetmap.org/search?` +
        `format=json` +
        `&q=${encodeURIComponent(text + ", Arizona, USA")}` +
        `&limit=10` +
        `&addressdetails=1`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'ToroApp/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 503 && retryCount < 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return searchLocation(text, retryCount + 1);
        }
        setSuggestions([]);
        return;
      }

      let data = await response.json();

      const looksLikeAddress = /\d/.test(text) || text.includes(',');

      if (looksLikeAddress) {
        const customOption = {
          place_id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          display_name: text + ", Arizona, USA (Use this address)",
          lat: null,
          lon: null,
          isCustom: true,
          originalText: text
        };
        data = [customOption, ...data];
      }

      setSuggestions(data.slice(0, 8));
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTextChange = (text: string) => {
    setSearchText(text);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      searchLocation(text);
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleSelectPlace = async (place: any) => {
    setSuggestions([]);

    if (place.isCustom) {
      setSearchText("Searching location...");
      try {
        const parts = place.originalText.split(',').map((p: string) => p.trim());
        const cityPart = parts[1] || parts[0];

        let location = null;

        // Strategy 1: Google Geocoding API
        const googleApiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY ||
                           'AIzaSyCfY-wxJaGf036soqLFYhQCCHHFJcK4SyE';

        try {
          const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?` +
            `address=${encodeURIComponent(place.originalText + ", Arizona, USA")}` +
            `&key=${googleApiKey}`;

          const googleResponse = await fetch(googleUrl);
          const googleData = await googleResponse.json();

          if (googleData.status === "OK" && googleData.results && googleData.results.length > 0) {
            const result = googleData.results[0];
            location = {
              latitude: result.geometry.location.lat,
              longitude: result.geometry.location.lng,
              address: result.formatted_address,
            };
          }
        } catch (error) {
          console.error("Google Geocoding API error:", error);
        }

        // Strategy 2: Nominatim if Google failed
        if (!location) {
          const cleanAddress = place.originalText.replace(/\s+(AZ|Arizona)\s+\d{5}/, '').trim();

          const url1 = `https://nominatim.openstreetmap.org/search?` +
            `format=json` +
            `&q=${encodeURIComponent(cleanAddress + ", Arizona, USA")}` +
            `&limit=5` +
            `&addressdetails=1`;

          const response1 = await fetch(url1, {
            headers: {
              'User-Agent': 'ToroApp/1.0',
              'Accept': 'application/json'
            }
          });

          let data = await response1.json();
          if (data.length > 0) {
            location = {
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon),
              address: place.originalText + ", Arizona, USA",
            };
          }
        }

        // Strategy 3: City-only search
        if (!location && cityPart) {
          const url2 = `https://nominatim.openstreetmap.org/search?` +
            `format=json` +
            `&q=${encodeURIComponent(cityPart + ", Arizona, USA")}` +
            `&limit=1` +
            `&addressdetails=1`;

          const response2 = await fetch(url2, {
            headers: {
              'User-Agent': 'ToroApp/1.0',
              'Accept': 'application/json'
            }
          });

          const data = await response2.json();
          if (data && data.length > 0) {
            location = {
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon),
              address: place.originalText + ", Arizona, USA",
            };
          }
        }

        // Strategy 4: Fallback to known city coordinates
        if (!location) {
          const cityCoords: { [key: string]: { lat: number; lon: number } } = {
            'chandler': { lat: 33.3062, lon: -111.8413 },
            'phoenix': { lat: 33.4484, lon: -112.0740 },
            'mesa': { lat: 33.4152, lon: -111.8315 },
            'scottsdale': { lat: 33.4942, lon: -111.9261 },
            'tempe': { lat: 33.4255, lon: -111.9400 },
            'gilbert': { lat: 33.3528, lon: -111.7890 },
            'glendale': { lat: 33.5387, lon: -112.1860 },
            'tucson': { lat: 32.2226, lon: -110.9747 }
          };

          const cityLower = cityPart.toLowerCase();
          const coords = Object.entries(cityCoords).find(([city]) =>
            cityLower.includes(city)
          );

          if (coords) {
            location = {
              latitude: coords[1].lat,
              longitude: coords[1].lon,
              address: place.originalText + ", Arizona, USA",
            };
          } else {
            location = {
              latitude: 33.4484,
              longitude: -112.0740,
              address: place.originalText + ", Arizona, USA",
            };
          }
        }

        setSearchText(place.originalText);
        handlePress(location);
      } catch (error) {
        console.error("Geocoding error:", error);
        setSearchText(place.originalText);
      }
    } else {
      setSearchText(place.display_name);

      const location = {
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        address: place.display_name,
      };

      handlePress(location);
    }
  };

  return (
    <View style={{ position: "relative", zIndex: 50 }}>
      <View style={{ flex: 1 }}>
        {/* Search Input */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: textInputBackgroundColor || (isDark ? colors.surface : "#F5F5F5"),
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: isDark ? "rgba(201, 165, 92, 0.15)" : "rgba(166, 124, 61, 0.1)",
          shadowColor: colors.gold,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <Image
            source={icon ? icon : icons.search}
            style={{ width: 22, height: 22, marginRight: 12, tintColor: colors.gold }}
            resizeMode="contain"
          />
          <TextInput
            style={{
              flex: 1,
              fontSize: 15,
              fontFamily: "Jakarta-SemiBold",
              color: colors.text,
            }}
            placeholder={initialLocation ?? "Where do you want to go today?"}
            placeholderTextColor={colors.muted}
            value={searchText}
            onChangeText={handleTextChange}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText("");
                setSuggestions([]);
                if (searchTimeout) {
                  clearTimeout(searchTimeout);
                }
              }}
              style={{ marginLeft: 8 }}
            >
              <View style={{
                width: 22,
                height: 22,
                backgroundColor: colors.muted,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text style={{ color: colors.bg, fontSize: 12, fontWeight: "bold" }}>✕</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View
            style={{
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              marginTop: 8,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? "rgba(201, 165, 92, 0.15)" : "rgba(166, 124, 61, 0.1)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              zIndex: 999,
            }}
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={item.place_id.toString()}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
                onPress={() => {
                  Keyboard.dismiss();
                  handleSelectPlace(item);
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 14,
                  fontFamily: "Jakarta-Medium",
                  color: colors.text,
                }}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default GoogleTextInput;
