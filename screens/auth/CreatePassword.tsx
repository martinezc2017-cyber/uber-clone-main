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
    title: "Crea tu contraseña",
    subtitle: "Usa mínimo 8 caracteres con números y símbolos.",
    password: "Contraseña",
    confirm: "Confirmar contraseña",
    mismatch: "Las contraseñas no coinciden",
  },
  en: {
    title: "Create your password",
    subtitle: "Use at least 8 characters with numbers and symbols.",
    password: "Password",
    confirm: "Confirm password",
    mismatch: "Passwords do not match",
  },
};

const CreatePassword = ({ onContinue }: { onContinue?: () => void }) => {
  const [lang, setLang] = useState<Lang>("es");
  const [form, setForm] = useState({ password: "", confirm: "" });
  const t = COPY[lang];
  const mismatch = form.password && form.confirm && form.password !== form.confirm;

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
                  {t.password}
                </Text>
                <ToroInput
                  placeholder="********"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(password: string) =>
                    setForm({ ...form, password })
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
                  {t.confirm}
                </Text>
                <ToroInput
                  placeholder="********"
                  secureTextEntry
                  value={form.confirm}
                  onChangeText={(confirm: string) =>
                    setForm({ ...form, confirm })
                  }
                />
              </View>
            </View>

            {mismatch && (
              <Text
                style={{
                  color: ToroColors.gold,
                  marginTop: 10,
                  fontWeight: "600",
                }}
              >
                {t.mismatch}
              </Text>
            )}

            <View style={{ marginTop: 20 }}>
              <ToroButton
                title="Continue with Toro"
                onPress={() => {
                  if (mismatch) return;
                  onContinue?.();
                }}
              />
            </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default CreatePassword;
