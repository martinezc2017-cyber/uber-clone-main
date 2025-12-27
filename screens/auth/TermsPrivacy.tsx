import React, { useState } from "react";
import {
  Image,
  ImageBackground,
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
    title: "Términos y privacidad",
    subtitle: "Debes aceptar para continuar.",
    label: "Acepto los Términos de Servicio y la Política de Privacidad de Toro.",
  },
  en: {
    title: "Terms & Privacy",
    subtitle: "You must accept to continue.",
    label: "I accept Toro’s Terms of Service and Privacy Policy.",
  },
};

const TermsPrivacy = ({ onContinue }: { onContinue?: () => void }) => {
  const [lang, setLang] = useState<Lang>("es");
  const [accepted, setAccepted] = useState(false);
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

            <Pressable
              onPress={() => setAccepted((prev) => !prev)}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: ToroColors.gold,
                  backgroundColor: accepted ? ToroColors.gold : "transparent",
                }}
              />
              <Text
                style={{
                  color: ToroColors.textSecondary,
                  flex: 1,
                  lineHeight: 20,
                }}
              >
                {t.label}
              </Text>
            </Pressable>

            <View style={{ marginTop: 20 }}>
              <ToroButton
                title="Continue with Toro"
                onPress={() => {
                  if (!accepted) return;
                  onContinue?.();
                }}
              />
              {!accepted && (
                <Text
                  style={{
                    color: ToroColors.textSecondary,
                    marginTop: 10,
                    fontSize: 13,
                  }}
                >
                  {lang === "es"
                    ? "Debes aceptar los términos para avanzar."
                    : "You must accept the terms to proceed."}
                </Text>
              )}
            </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default TermsPrivacy;
