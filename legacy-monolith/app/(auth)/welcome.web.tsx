import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants";
import { Link, router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { SwissColors } from '@/constants/theme';
import { SafeAreaView } from "react-native-safe-area-context";

const OnboardingWeb = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex >= onboarding.length - 1;
  const slide = useMemo(() => onboarding[activeIndex], [activeIndex]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="w-full flex-row justify-end p-5">
        <TouchableOpacity onPress={() => router.replace("/(auth)/sign-up")}>
          <Text className="text-black text-md font-JakartaBold">Skip</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 pb-8 items-center justify-center">
        <View className="w-full max-w-2xl items-center">
          <Image
            source={slide.image}
            className="w-full h-[320px]"
            resizeMode="contain"
          />

          <Text className="text-black text-3xl font-bold text-center mt-6">
            {slide.title}
          </Text>
          <Text className="text-lg font-JakartaSemiBold text-center text-[#858585] mt-3">
            {slide.description}
          </Text>

          <View className="flex-row items-center justify-center mt-6">
            {onboarding.map((_, idx) => (
              <View
                key={`dot-${idx}`}
                className={`h-[4px] w-[32px] mx-1 rounded-full ${
                  idx === activeIndex ? "bg-primary-500" : "bg-[SwissColors.textPrimary]"
                }`}
              />
            ))}
          </View>

          <View className="w-full flex-row items-center justify-between mt-8">
            <CustomButton
              title="Back"
              bgVariant="outline"
              textVariant="primary"
              className="flex-1 mr-3"
              onPress={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={activeIndex === 0}
            />
            <CustomButton
              title={isLastSlide ? "Get Started" : "Next"}
              className="flex-1 ml-3"
              onPress={() => {
                if (isLastSlide) {
                  router.replace("/(auth)/sign-up");
                } else {
                  setActiveIndex((i) => Math.min(onboarding.length - 1, i + 1));
                }
              }}
            />
          </View>

          <Link
            href="/(auth)/sign-in"
            className="text-lg text-center text-general-200 mt-6"
          >
            <Text>Already have an account? </Text>
            <Text className="text-primary-500">Sign In</Text>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingWeb;

