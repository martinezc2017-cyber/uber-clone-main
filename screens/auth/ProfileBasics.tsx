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
import ToroInput from "../../components/ui/ToroInput";
import GlassCard from "../../components/ui/GlassCard";
import { ToroColors } from "../../theme/toroTheme";

const background = require("../../assets/images/backgrounds/dark-gradient.png");
const logo = require("../../assets/brand/toro-logo-gold.png");

type Lang = "es" | "en";

const COPY = {
  es: {
    title: "Datos básicos",
    subtitle: "Completa tu perfil para personalizar tu experiencia.",
    city: "Ciudad",
    country: "País",
    referral: "Código de referido (opcional)",
  },
  en: {
    title: "Basic details",
    subtitle: "Complete your profile to personalize your experience.",
    city: "City",
    country: "Country",
    referral: "Referral code (optional)",
  },
};

const ProfileBasics = ({ onContinue }: { onContinue?: () => void }) => {
  const [lang, setLang] = useState<Lang>("es");
  const [form, setForm] = useState({ city: "", country: "", referral: "" });
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

            <View style={{ gap: 12 }}>
              <View>
                <Text
                  style={{
                    color: ToroColors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  {t.city}
                </Text>
                <ToroInput
                  placeholder={t.city}
                  value={form.city}
                  onChangeText={(city: string) => setForm({ ...form, city })}
                />
              </View>

              <View>
                <Text
                  style={{
                    color: ToroColors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  {t.country}
                </Text>
                <ToroInput
                  placeholder={t.country}
                  value={form.country}
                  onChangeText={(country: string) =>
                    setForm({ ...form, country })
                  }
                />
              </View>

              <View>
                <Text
                  style={{
                    color: ToroColors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  {t.referral}
                </Text>
                <ToroInput
                  placeholder="TORO123"
                  value={form.referral}
                  onChangeText={(referral: string) =>
                    setForm({ ...form, referral })
                  }
                />
              </View>
            </View>

            <View style={{ marginTop: 20 }}>
              <ToroButton
                title="Continue with Toro"
                onPress={() => onContinue?.()}
              />
            </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default ProfileBasics;
