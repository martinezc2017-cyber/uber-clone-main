import { View, Image, TextInput, TouchableOpacity, Text, Keyboard } from "react-native";
import { useState } from "react";
import Constants from 'expo-constants';

import { icons } from "@/constants";
import { GoogleInputProps } from "@/types/type";

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
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const searchLocation = async (text: string, retryCount = 0) => {
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log("=== Starting search for:", text);

      // Search with Nominatim
      const searchUrl = `https://nominatim.openstreetmap.org/search?` +
        `format=json` +
        `&q=${encodeURIComponent(text + ", Arizona, USA")}` +
        `&limit=10` +
        `&addressdetails=1`;

      console.log("Fetching from URL:", searchUrl);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'NextrydeApp/1.0',
          'Accept': 'application/json'
        }
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        if (response.status === 503 && retryCount < 1) {
          console.log("Server busy, retrying in 1 second...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          return searchLocation(text, retryCount + 1);
        }
        console.error("Search failed with status:", response.status);
        setSuggestions([]);
        return;
      }

      let data = await response.json();
      console.log("=== Got", data.length, "results from API");

      // If the user typed a full address but we got no results or generic results,
      // add an option to use the text as-is with geocoding
      const looksLikeAddress = /\d/.test(text) || text.includes(',');

      if (looksLikeAddress) {
        // Always add "Use this address" option at the top
        const customOption = {
          place_id: 'custom-' + Date.now(),
          display_name: text + ", Arizona, USA (Use this address)",
          lat: null,
          lon: null,
          isCustom: true,
          originalText: text
        };
        data = [customOption, ...data];
        console.log("Added custom address option");
      }

      if (data.length > 0) {
        console.log("First result:", data[0].display_name);
      }

      setSuggestions(data.slice(0, 8));
    } catch (error) {
      console.error("=== Search error:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
      console.log("=== Search complete");
    }
  };

  const handleTextChange = (text: string) => {
    console.log(">>> Text changed to:", text);
    setSearchText(text);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout to avoid too many requests
    const timeout = setTimeout(() => {
      console.log(">>> Timeout fired, calling searchLocation");
      searchLocation(text);
    }, 300); // Wait 300ms after user stops typing

    setSearchTimeout(timeout);
  };

  const handleSelectPlace = async (place: any) => {
    console.log("handleSelectPlace called with:", place);
    setSuggestions([]);

    // If this is a custom address, we need to geocode it
    if (place.isCustom) {
      setSearchText("Searching location...");
      try {
        // Extract city from the address
        const parts = place.originalText.split(',').map((p: string) => p.trim());
        const cityPart = parts[1] || parts[0]; // Get city or use full text

        console.log("Geocoding custom address:", place.originalText);
        console.log("City part:", cityPart);

        // Try multiple geocoding strategies
        let location = null;

        // Strategy 1: Try Google Geocoding API first (most accurate for USA addresses)
        console.log("=== Strategy 1: Google Geocoding API ===");
        const googleApiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY ||
                           'AIzaSyCfY-wxJaGf036soqLFYhQCCHHFJcK4SyE';

        try {
          const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?` +
            `address=${encodeURIComponent(place.originalText + ", Arizona, USA")}` +
            `&key=${googleApiKey}`;

          console.log("Fetching from Google Geocoding API");

          const googleResponse = await fetch(googleUrl);
          const googleData = await googleResponse.json();

          console.log("Google API status:", googleData.status);
          console.log("Google API results:", googleData.results?.length || 0);

          if (googleData.status === "OK" && googleData.results && googleData.results.length > 0) {
            const result = googleData.results[0];
            location = {
              latitude: result.geometry.location.lat,
              longitude: result.geometry.location.lng,
              address: result.formatted_address,
            };
            console.log("✓ Google found location:", location);
            console.log("  Coordinates:", location.latitude, location.longitude);
          } else {
            console.log("✗ Google API returned no results, status:", googleData.status);
            if (googleData.error_message) {
              console.log("  Error message:", googleData.error_message);
            }
          }
        } catch (error) {
          console.error("Google Geocoding API error:", error);
        }

        // Strategy 2: Try Nominatim if Google failed
        if (!location) {
          console.log("=== Strategy 2: Nominatim (OpenStreetMap) ===");
          const cleanAddress = place.originalText.replace(/\s+(AZ|Arizona)\s+\d{5}/, '').trim();

          const url1 = `https://nominatim.openstreetmap.org/search?` +
            `format=json` +
            `&q=${encodeURIComponent(cleanAddress + ", Arizona, USA")}` +
            `&limit=5` +
            `&addressdetails=1`;

          console.log("Fetching from Nominatim");

          const response1 = await fetch(url1, {
            headers: {
              'User-Agent': 'NextrydeApp/1.0',
              'Accept': 'application/json'
            }
          });

          let data = await response1.json();
          console.log("Nominatim results:", data.length);
          if (data.length > 0) {
            console.log("First result:", data[0].display_name, "at", data[0].lat, data[0].lon);
            location = {
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon),
              address: place.originalText + ", Arizona, USA",
            };
            console.log("✓ Nominatim found location:", location);
          } else {
            console.log("✗ Nominatim returned no results");
          }
        }

        // Strategy 3: Try city-only search if still no results
        if (!location && cityPart) {
          console.log("=== Strategy 3: City-only search ===");
          console.log("Trying city-only search:", cityPart);
          const url2 = `https://nominatim.openstreetmap.org/search?` +
            `format=json` +
            `&q=${encodeURIComponent(cityPart + ", Arizona, USA")}` +
            `&limit=1` +
            `&addressdetails=1`;

          const response2 = await fetch(url2, {
            headers: {
              'User-Agent': 'NextrydeApp/1.0',
              'Accept': 'application/json'
            }
          });

          const data = await response2.json();
          console.log("City search results:", data.length);
          if (data && data.length > 0) {
            location = {
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon),
              address: place.originalText + ", Arizona, USA",
            };
            console.log("✓ City search found location:", location);
          }
        }

        // Strategy 4: Fallback to known city coordinates
        if (!location) {
          console.log("=== Strategy 4: Known city coordinates fallback ===");
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
            console.log("⚠ Using known city coordinates:", coords[0]);
          } else {
            // Ultimate fallback: Phoenix
            location = {
              latitude: 33.4484,
              longitude: -112.0740,
              address: place.originalText + ", Arizona, USA",
            };
            console.log("⚠ Using Phoenix fallback");
          }
        }

        setSearchText(place.originalText);
        handlePress(location);
      } catch (error) {
        console.error("Geocoding error:", error);
        setSearchText(place.originalText);
      }
    } else {
      // Normal place from search results
      setSearchText(place.display_name);

      const location = {
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        address: place.display_name,
      };

      console.log("Calling handlePress with location:", location);
      handlePress(location);
      console.log("handlePress completed");
    }
  };

  return (
    <View
      className={`flex flex-row items-center justify-center relative z-50 rounded-xl ${containerStyle}`}
    >
      <View className="flex-1">
        <View className="flex-row items-center bg-white rounded-full px-4 py-3 shadow-md">
          <Image
            source={icon ? icon : icons.search}
            className="w-6 h-6 mr-2"
            resizeMode="contain"
          />
          <TextInput
            className="flex-1 text-base font-semibold"
            placeholder={initialLocation ?? "Where do you want to go today?"}
            placeholderTextColor="gray"
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
              className="ml-2"
            >
              <View className="w-5 h-5 bg-gray-300 rounded-full items-center justify-center">
                <Text className="text-white text-xs font-bold">✕</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {suggestions.length > 0 && (
          <View
            className="bg-white mt-2 rounded-xl shadow-md"
            style={{
              zIndex: 999,
              elevation: 5,
            }}
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={item.place_id.toString()}
                className="px-4 py-3 border-b border-gray-100"
                onPress={() => {
                  console.log("TouchableOpacity pressed for:", item.display_name);
                  Keyboard.dismiss();
                  handleSelectPlace(item);
                }}
                activeOpacity={0.7}
              >
                <Text className="text-sm font-medium">{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default GoogleTextInput;