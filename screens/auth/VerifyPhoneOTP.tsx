import React, { useEffect, useState } from "react";
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
import ToroInput from "../../components/ui/ToroInput";
import GlassCard from "../../components/ui/GlassCard";
import { ToroColors } from "../../theme/toroTheme";

const background = require("../../assets/images/backgrounds/dark-gradient.png");
const logo = require("../../assets/brand/toro-logo-gold.png");

type Lang = "es" | "en";

const COPY = {
  es: {
    title: "Verifica tu teléfono",
    subtitle: "Enviamos un código de 6 dígitos vía SMS.",
    resend: "Reenviar código",
    timer: "Reenviar en",
  },
  en: {
    title: "Verify your phone",
    subtitle: "We sent a 6-digit code via SMS.",
    resend: "Resend code",
    timer: "Resend in",
  },
};

const VerifyPhoneOTP = ({ onContinue }: { onContinue?: () => void }) => {
  const [lang, setLang] = useState<Lang>("es");
  const [code, setCode] = useState("");
  const [timer, setTimer] = useState(60);
  const t = COPY[lang];

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleResend = () => {
    setTimer(60);
    setCode("");
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

            <ToroInput
              placeholder="••••••"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(value: string) => setCode(value)}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
              }}
            >
              <Text style={{ color: ToroColors.textSecondary }}>
                {t.timer}: {timer > 0 ? `${timer}s` : "00s"}
              </Text>
              <Pressable
                disabled={timer > 0}
                onPress={handleResend}
                style={{ opacity: timer > 0 ? 0.4 : 1 }}
              >
                <Text style={{ color: ToroColors.gold, fontWeight: "700" }}>
                  {t.resend}
                </Text>
              </Pressable>
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

export default VerifyPhoneOTP;
