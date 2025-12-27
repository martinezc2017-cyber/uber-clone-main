import React, { useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
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
    title: "Elige tu idioma",
    desc: "Configura Toro en tu idioma preferido antes de continuar.",
    options: ["Español", "English"],
  },
  en: {
    title: "Choose your language",
    desc: "Set Toro to your preferred language before continuing.",
    options: ["Español", "English"],
  },
};

const LanguageSelect = ({ onContinue }: { onContinue?: () => void }) => {
  const [lang, setLang] = useState<Lang>("es");
  const t = COPY[lang];

  return (
    <ImageBackground source={background} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
          <View style={{ alignItems: "center", marginTop: 12, marginBottom: 24 }}>
            <Image
              source={logo}
              style={{ width: 120, height: 120, marginBottom: 14 }}
              resizeMode="contain"
            />
            <Text
              style={{
                color: ToroColors.textPrimary,
                fontSize: 24,
                fontWeight: "700",
              }}
            >
              Toro Rideshare
            </Text>
          </View>

          <GlassCard>
            <Text
              style={{
                color: ToroColors.textPrimary,
                fontSize: 22,
                fontWeight: "700",
                marginBottom: 8,
              }}
            >
              {t.title}
            </Text>
            <Text
              style={{
                color: ToroColors.textSecondary,
                fontSize: 15,
                marginBottom: 20,
              }}
            >
              {t.desc}
            </Text>

            <View style={{ gap: 12, marginBottom: 16 }}>
              {["es", "en"].map((code) => {
                const label =
                  code === "es" ? COPY[lang].options[0] : COPY[lang].options[1];
                const active = lang === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setLang(code as Lang)}
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: active
                        ? ToroColors.gold
                        : ToroColors.goldSoft,
                      backgroundColor: active
                        ? "rgba(201,162,77,0.14)"
                        : ToroColors.surface,
                      padding: 14,
                    }}
                  >
                    <Text
                      style={{
                        color: ToroColors.textPrimary,
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      style={{
                        color: ToroColors.textSecondary,
                        marginTop: 6,
                      }}
                    >
                      {code === "es"
                        ? "Recomendado para Latinoamérica"
                        : "Recommended for English speakers"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Image
                source={car}
                style={{ width: "100%", height: 160 }}
                resizeMode="contain"
              />
            </View>

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

export default LanguageSelect;
