import { useUser } from "@clerk/clerk-expo";
import { Image, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import InputField from "@/components/InputField";
import Screen from "@/components/layout/Screen";
import { GlassCard, useGlassStyle } from "@/components/layout/GlassCard";
import { CoinDisplay } from "@/components/shop";
import ThemeToggle from "@/components/ThemeToggle";
import { useThemeStore, themeColors } from "@/store/themeStore";

const Profile = () => {
  const { user } = useUser();
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const glassStyle = useGlassStyle();

  return (
    <Screen>
      <SafeAreaView className="flex-1">
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="flex-row justify-between items-center my-5">
          <Text style={{ color: colors.text, fontSize: 24 }} className="font-JakartaBold">My profile</Text>
          <CoinDisplay />
        </View>

        <View style={[glassStyle, { alignItems: "center", justifyContent: "center", padding: 24, marginBottom: 20 }]}>
          <Image
            source={{
              uri: user?.externalAccounts[0]?.imageUrl ?? user?.imageUrl,
            }}
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              borderWidth: 3,
              borderColor: colors.accent,
            }}
          />
          <Text style={{ color: colors.text, fontSize: 20, marginTop: 16 }} className="font-JakartaBold">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
            {user?.primaryEmailAddress?.emailAddress}
          </Text>
        </View>

        {/* Theme Toggle */}
        <View style={[glassStyle, { marginBottom: 20 }]}>
          <Text style={{ color: colors.text, fontSize: 16, marginBottom: 12 }} className="font-JakartaSemiBold">
            Appearance
          </Text>
          <ThemeToggle />
        </View>

        {/* Shop Button */}
        <TouchableOpacity
          onPress={() => router.push("/shop")}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <View className="flex-row items-center">
            <Text className="text-2xl mr-3">🛍️</Text>
            <View>
              <Text style={{ color: "#1A1A1A", fontSize: 16 }} className="font-JakartaBold">Tienda de Skins</Text>
              <Text style={{ color: "rgba(0,0,0,0.6)", fontSize: 12 }}>Personaliza tu experiencia</Text>
            </View>
          </View>
          <Text style={{ color: "#1A1A1A", fontSize: 20, fontWeight: "700" }}>›</Text>
        </TouchableOpacity>

        <View style={[glassStyle, { gap: 8 }]}>
          <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }} className="font-JakartaSemiBold">
            Account Details
          </Text>
          <View className="flex flex-col items-start justify-start w-full">
            <InputField
              label="First name"
              placeholder={user?.firstName || "Not Found"}
              containerStyle="w-full"
              inputStyle="p-3.5"
              editable={false}
            />

            <InputField
              label="Last name"
              placeholder={user?.lastName || "Not Found"}
              containerStyle="w-full"
              inputStyle="p-3.5"
              editable={false}
            />

            <InputField
              label="Email"
              placeholder={
                user?.primaryEmailAddress?.emailAddress || "Not Found"
              }
              containerStyle="w-full"
              inputStyle="p-3.5"
              editable={false}
            />

            <InputField
              label="Phone"
              placeholder={user?.primaryPhoneNumber?.phoneNumber || "Not Found"}
              containerStyle="w-full"
              inputStyle="p-3.5"
              editable={false}
            />
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    </Screen>
  );
};

export default Profile;
