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
const car = require("../../assets/images/auth/signup-car-dark.png");

type Lang = "es" | "en";

const COPY = {
  es: {
    title: "Crea tu cuenta",
    subtitle: "Ingresa tus datos para continuar",
    name: "Nombre completo",
    email: "Correo",
    phone: "Teléfono",
  },
  en: {
    title: "Create your account",
    subtitle: "Enter your details to continue",
    name: "Full name",
    email: "Email",
    phone: "Phone",
  },
};

const SignUpAccount = ({ onContinue }: { onContinue?: () => void }) => {
  const [lang, setLang] = useState<Lang>("es");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
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
              {(["es", "en"] as Lang[]).map((code) => {
                const active = lang === code;
                return (
                  <Text
                    key={code}
                    onPress={() => setLang(code)}
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
                    {code.toUpperCase()}
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
                marginBottom: 18,
                marginTop: 6,
              }}
            >
              {t.subtitle}
            </Text>

            <View style={{ gap: 10 }}>
              <View>
                <Text
                  style={{
                    color: ToroColors.textSecondary,
                    marginBottom: 6,
                    fontSize: 14,
                  }}
                >
                  {t.name}
                </Text>
                <ToroInput
                  placeholder={t.name}
                  value={form.name}
                  onChangeText={(name: string) => setForm({ ...form, name })}
                />
              </View>
              <View>
                <Text
                  style={{
                    color: ToroColors.textSecondary,
                    marginBottom: 6,
                    fontSize: 14,
                  }}
                >
                  {t.email}
                </Text>
                <ToroInput
                  placeholder={t.email}
                  value={form.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(email: string) => setForm({ ...form, email })}
                />
              </View>
              <View>
                <Text
                  style={{
                    color: ToroColors.textSecondary,
                    marginBottom: 6,
                    fontSize: 14,
                  }}
                >
                  {t.phone}
                </Text>
                <ToroInput
                  placeholder="+52 55 0000 0000"
                  value={form.phone}
                  keyboardType="phone-pad"
                  onChangeText={(phone: string) => setForm({ ...form, phone })}
                />
              </View>
            </View>

            <View style={{ marginVertical: 18 }}>
              <Image
                source={car}
                style={{ width: "100%", height: 140 }}
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

export default SignUpAccount;
