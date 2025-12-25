import { router } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";
import { useRef, useState } from "react";
import { onboarding } from "@/constants";
import CustomButton from "@/components/CustomButton";

const Onboarding = ()  => {
    const swiperRef = useRef<Swiper>(null);
    const [activeIndex, setactiveIndex] = useState(0);
    const isLastSlide = activeIndex === onboarding.length - 1;
    return(
        <SafeAreaView className="flex h-full items-center justify-between bg-white">
            <View className="w-full flex flex-row justify-between items-center p-5">
                <View className="flex flex-row gap-2">
                    <TouchableOpacity
                        onPress={() => router.push("/(root)/(tabs)/home")}
                        className="bg-primary-500 px-3 py-2 rounded-lg"
                    >
                        <Text className="text-white text-xs font-JakartaBold">Cliente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push("/driver")}
                        className="bg-primary-700 px-3 py-2 rounded-lg"
                    >
                        <Text className="text-white text-xs font-JakartaBold">Driver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push("/admin")}
                        className="bg-secondary-800 px-3 py-2 rounded-lg"
                    >
                        <Text className="text-white text-xs font-JakartaBold">Admin</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        router.replace("/(auth)/sign-up");
                    }}
                >
                    <Text className="text-black text-md font-JakartaBold">Skip</Text>
                </TouchableOpacity>
            </View>
            <Swiper 
            ref={swiperRef}
            loop={false}
            dot={<View className="w-[32px] h-[4px] mx-1 bg-[#E2E8F0] rounded-full"/>}
            activeDot={<View className="w-[32px] h-[4px] mx-1 bg-[#0286FF] rounded-full"/>}
            onIndexChanged={(index) => setactiveIndex(index)}
            >
                {onboarding.map((item) => (
                    <View key={item.id} className="flex items-center justify-center p-5">
                        <Image 
                        source={item.image}
                        className="w-full h-[300px]"
                        resizeMode="contain"
                        />
                    <View className="flex flex-row items-center justify-center w-full mt-10">
                        <Text className="text-black text-3xl font-bold mx-10 text-center">{item.title}</Text>
                    </View>
                    <Text className="text-lg fonr-JakartaSemiBold text-center text-[#858585] mx-10 mt-3">{item.description}</Text>
                    </View>
                ))}
            </Swiper>

            <CustomButton 
            title={isLastSlide ? "Get Started" : "Next"}
            onPress={()=> isLastSlide 
                ? router.replace('/(auth)/sign-up') 
                : swiperRef.current?.scrollBy(1)} 
            className="w-11/12 mt-10" 
            />
        </SafeAreaView>
    );
};

export default Onboarding;
