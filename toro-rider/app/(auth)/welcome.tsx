import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";

import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants";
import { useLocationStore } from "@/store";

const { width } = Dimensions.get("window");

const Onboarding = () => {
    const swiperRef = useRef<Swiper>(null);
    const [activeIndex, setactiveIndex] = useState(0);
    const isLastSlide = activeIndex === onboarding.length - 1;
    const { setUserLocation } = useLocationStore();

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") {
                    return;
                }

                const location = await Location.getCurrentPositionAsync({});
                const address = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    address: `${address?.[0]?.name ?? "Ubicación"}, ${address?.[0]?.region ?? ""}`.trim(),
                });
            } catch (err) {
                console.warn("welcome location error", err);
            }
        })();
    }, [setUserLocation]);

    const handleNext = () => {
        if (isLastSlide) {
            router.replace("/(auth)/sign-up");
        } else {
            swiperRef.current?.scrollBy(1);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#0D0E12" }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header with Skip */}
                <View style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingTop: 10,
                }}>
                    <TouchableOpacity
                        onPress={() => router.replace("/(root)/(tabs)/home")}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                        }}
                    >
                        <Text style={{
                            color: "#C9A55C",
                            fontSize: 16,
                            fontFamily: "Jakarta-Bold"
                        }}>
                            Driver
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.replace("/(auth)/sign-up")}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                        }}
                    >
                        <Text style={{
                            color: "#C9A55C",
                            fontSize: 16,
                            fontFamily: "Jakarta-Bold"
                        }}>
                            Omitir
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Swiper Content */}
                <View style={{ flex: 1 }}>
                    <Swiper
                        ref={swiperRef}
                        loop={false}
                        dot={
                            <View style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                marginHorizontal: 4,
                                backgroundColor: "rgba(201, 165, 92, 0.3)",
                            }} />
                        }
                        activeDot={
                            <View style={{
                                width: 24,
                                height: 8,
                                borderRadius: 4,
                                marginHorizontal: 4,
                                backgroundColor: "#C9A55C",
                            }} />
                        }
                        onIndexChanged={(index) => setactiveIndex(index)}
                        paginationStyle={{ bottom: 20 }}
                    >
                        {onboarding.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.9}
                                onPress={handleNext}
                                style={{
                                    flex: 1,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    paddingHorizontal: 24,
                                }}
                            >
                                {/* Logo Container */}
                                <View style={{
                                    width: width - 80,
                                    height: width - 80,
                                    backgroundColor: "#141619",
                                    borderRadius: 32,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderWidth: 1,
                                    borderColor: "rgba(201, 165, 92, 0.2)",
                                    shadowColor: "#C9A55C",
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.35,
                                    shadowRadius: 24,
                                    elevation: 12,
                                }}>
                                    <Image
                                        source={item.image}
                                        style={{
                                            width: width - 120,
                                            height: width - 120,
                                        }}
                                        resizeMode="contain"
                                    />
                                </View>

                                {/* Title */}
                                <Text style={{
                                    color: "#FFFFFF",
                                    fontSize: 28,
                                    fontFamily: "Jakarta-Bold",
                                    textAlign: "center",
                                    marginTop: 40,
                                    paddingHorizontal: 16,
                                }}>
                                    {item.title}
                                </Text>

                                {/* Description */}
                                <Text style={{
                                    color: "rgba(255, 255, 255, 0.6)",
                                    fontSize: 16,
                                    fontFamily: "Jakarta-Medium",
                                    textAlign: "center",
                                    marginTop: 16,
                                    paddingHorizontal: 24,
                                    lineHeight: 24,
                                }}>
                                    {item.description}
                                </Text>

                                {/* Tap hint */}
                                <Text style={{
                                    color: "rgba(201, 165, 92, 0.6)",
                                    fontSize: 12,
                                    fontFamily: "Jakarta-Medium",
                                    textAlign: "center",
                                    marginTop: 32,
                                }}>
                                    Toca para continuar
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </Swiper>
                </View>

                {/* Bottom Button - Only on last slide */}
                {isLastSlide && (
                    <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
                        <TouchableOpacity
                            onPress={() => router.replace("/(auth)/sign-up")}
                            style={{
                                backgroundColor: "#C9A55C",
                                borderRadius: 16,
                                paddingVertical: 18,
                                alignItems: "center",
                                shadowColor: "#C9A55C",
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.4,
                                shadowRadius: 16,
                                elevation: 8,
                            }}
                        >
                            <Text style={{
                                color: "#1A1A1A",
                                fontSize: 18,
                                fontFamily: "Jakarta-Bold",
                            }}>
                                Comenzar
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
};

export default Onboarding;
