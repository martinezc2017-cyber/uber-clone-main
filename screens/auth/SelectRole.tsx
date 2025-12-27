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
const car = require("../../assets/images/auth/signup-car-dark.png");

type Lang = "es" | "en";
type Role = "passenger" | "driver";

const COPY = {
  es: {
    title: "Selecciona tu rol",
    subtitle: "Define cómo usarás Toro.",
    passengerTitle: "Pasajero",
    passengerDesc: "Viajes premium, soporte 24/7, pagos seguros.",
    driverTitle: "Conductor",
    driverDesc: "Gana más con viajes premium y seguridad Toro.",
  },
  en: {
    title: "Select your role",
    subtitle: "Choose how you'll use Toro.",
    passengerTitle: "Passenger",
    passengerDesc: "Premium rides, 24/7 support, secure payments.",
    driverTitle: "Driver",
    driverDesc: "Earn more with premium trips and Toro safety.",
  },
};

const SelectRole = ({ onContinue }: { onContinue?: () => void }) => {
  const [lang, setLang] = useState<Lang>("es");
  const [role, setRole] = useState<Role>("passenger");
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
              {([
                {
                  key: "passenger" as Role,
                  title: t.passengerTitle,
                  desc: t.passengerDesc,
                },
                {
                  key: "driver" as Role,
                  title: t.driverTitle,
                  desc: t.driverDesc,
                },
              ] as const).map((item) => {
                const active = role === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setRole(item.key)}
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: active
                        ? ToroColors.gold
                        : ToroColors.goldSoft,
                      backgroundColor: active
                        ? "rgba(201,162,77,0.14)"
                        : ToroColors.surface,
                      padding: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: ToroColors.textPrimary,
                        fontSize: 18,
                        fontWeight: "700",
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        color: ToroColors.textSecondary,
                        marginTop: 6,
                      }}
                    >
                      {item.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginVertical: 20 }}>
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

export default SelectRole;
