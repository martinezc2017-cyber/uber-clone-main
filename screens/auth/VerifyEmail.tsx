import React, { useState } from "react";
import {
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ToroButton from "../../components/ui/ToroButton";
import GlassCard from "../../components/ui/GlassCard";
import { ToroColors } from "../../theme/toroTheme";

const background = require("../../assets/images/backgrounds/dark-gradient.png");
const logo = require("../../assets/brand/toro-logo-gold.png");

type Lang = "es" | "en";

const COPY = {
  es: {
    title: "Verifica tu correo",
    subtitle: "Revisa tu bandeja de entrada y toca el enlace de verificación.",
    open: "Abrir app de correo",
    resend: "Reenviar correo",
  },
  en: {
    title: "Verify your email",
    subtitle: "Check your inbox and tap the verification link.",
    open: "Open mail app",
    resend: "Resend email",
  },
};

const VerifyEmail = ({ onContinue }: { onContinue?: () => void }) => {
  const [lang, setLang] = useState<Lang>("es");
  const t = COPY[lang];

  const handleOpenMail = () => {
    Linking.openURL("mailto:");
  };

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
            <Text
              style={{
                color: ToroColors.textPrimary,
                fontSize: 22,
                fontWeight: "700",
              }}
            >
              {t.title}
            </Text>
            <Text
              style={{
                color: ToroColors.textSecondary,
                marginTop: 6,
                marginBottom: 16,
              }}
            >
              {t.subtitle}
            </Text>

            <Pressable onPress={handleOpenMail}>
              <Text
                style={{
                  color: ToroColors.gold,
                  fontWeight: "700",
                  marginBottom: 16,
                }}
              >
                {t.open}
              </Text>
            </Pressable>

            <Pressable>
              <Text
                style={{
                  color: ToroColors.textSecondary,
                  fontWeight: "600",
                  marginBottom: 24,
                }}
              >
                {t.resend}
              </Text>
            </Pressable>

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

export default VerifyEmail;
