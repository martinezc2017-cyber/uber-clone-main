import React, { useState } from "react";
import {
  Image,
  ImageBackground,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ToroButton from "../../components/ui/ToroButton";
import GlassCard from "../../components/ui/GlassCard";
import { ToroColors } from "../../theme/toroTheme";

const background = require("../../assets/images/backgrounds/dark-gradient.png");
const logo = require("../../assets/brand/toro-logo-gold.png");
const car = require("../../assets/images/auth/signup-car-dark.png");

type Lang = "es" | "en";

const COPY = {
  es: {
    title: "Bienvenido a Toro",
    subtitle: "Tu cuenta está lista. Comienza con la experiencia premium.",
  },
  en: {
    title: "Welcome to Toro",
    subtitle: "Your account is ready. Start the premium experience.",
  },
};

const SignUpSuccess = ({ onContinue }: { onContinue?: () => void }) => {
  const [lang, setLang] = useState<Lang>("es");
  const t = COPY[lang];

  return (
    <ImageBackground source={background} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Image
              source={logo}
              style={{ width: 70, height: 70 }}
              resizeMode="contain"
            />
            <View
              style={{
                flexDirection: "row",
                backgroundColor: ToroColors.surface,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: ToroColors.goldSoft,
              }}
            >
              {(["es", "en"] as Lang[]).map((codeLang) => {
                const active = lang === codeLang;
                return (
                  <Text
                    key={codeLang}
                    onPress={() => setLang(codeLang)}
                    style={{
                      color: active
                        ? ToroColors.background
                        : ToroColors.textSecondary,
                      backgroundColor: active ? ToroColors.gold : "transparent",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontWeight: "700",
                    }}
                  >
                    {codeLang.toUpperCase()}
                  </Text>
                );
              })}
            </View>
          </View>

          <GlassCard>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Image
                source={car}
                style={{ width: "100%", height: 160 }}
                resizeMode="contain"
              />
            </View>

            <Text
              style={{
                color: ToroColors.textPrimary,
                fontSize: 24,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              {t.title}
            </Text>
            <Text
              style={{
                color: ToroColors.textSecondary,
                marginTop: 8,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {t.subtitle}
            </Text>

            <ToroButton
              title="Continue with Toro"
              onPress={() => onContinue?.()}
            />
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default SignUpSuccess;
