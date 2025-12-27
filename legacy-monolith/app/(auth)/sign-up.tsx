import { useState } from "react";
import OAut from "@/components/OAuth";
import { Link, router } from "expo-router";
import { icons, images } from "@/constants";
import { useSignUp } from "@clerk/clerk-expo";
import ReactNativeModal from "react-native-modal";
import CustomButton from "@/components/CustomButton";
import { Alert, Image, ScrollView, Text, View, TextInput } from "react-native";
import Screen from "@/components/layout/Screen";
import { fetchAPI } from "@/lib/fetch";
import { useGlassStyle } from "@/components/layout/GlassCard";
import { useThemeStore, themeColors } from "@/store/themeStore";


const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [showSuccessModal, setshowSuccessModal] = useState(false);
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const glassStyle = useGlassStyle();

  const [form, setform] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [verification, setVerification] = useState({
    state: "default",
    error: "",
    code: ""
  });

  // Custom input style for better spacing
  const inputContainerStyle = {
    backgroundColor: activeTheme === "dark" ? "rgba(255,255,255,0.08)" : "#F5F5F5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: activeTheme === "dark" ? "rgba(255,255,255,0.12)" : "#E0E0E0",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    height: 56,
  };

  const inputStyle = {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontFamily: "Jakarta-Medium",
    marginLeft: 12,
  };

  const onSignUpPress = async () => {
    if (!isLoaded) {
      return
    }

    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
        firstName: form.name,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      setVerification({
        ...verification,
        state: "pending"
      })
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage || err?.message || "Unable to sign up. Please try again.";
      Alert.alert("Error", message);
    }
  }

  const onPressVerify = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp
        .attemptEmailAddressVerification({
          code: verification.code,
        });

      if (completeSignUp.status === 'complete') {
        try {
          await fetchAPI('/api/user', {
            method : "POST",
            body: JSON.stringify({
              name: form.name,
              email: form.email,
              clerkId: completeSignUp.createdUserId,
            }),
          });
        } catch (dbErr) {
          console.error("Failed to create user in database:", dbErr);
        }

        await setActive({ session: completeSignUp.createdSessionId })
        setVerification({ ...verification, state: "success" })
      } else {
        setVerification({ ...verification, error: "Verification Failed", state: "failed" })
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage || err?.message || "Verification failed. Please try again.";
      setVerification({ ...verification, error: message, state: "failed" })
    }
  }


  return (
    <Screen>
    <ScrollView style={{ flex: 1, backgroundColor: "#000000" }}>
      <View style={{ flex: 1 }}>
        {/* Header with Toro Logo */}
        <View style={{
          backgroundColor: "#000000",
          paddingTop: 60,
          paddingBottom: 30,
          alignItems: "center",
        }}>
          <View style={{
            width: 120,
            height: 120,
            borderRadius: 24,
            backgroundColor: "#0a0a0a",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(139, 106, 63, 0.3)",
            shadowColor: "#8B6A3F",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 8,
          }}>
            <Image
              source={images.toroLogo}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
          </View>
          <Text style={{
            color: "#FFFFFF",
            fontSize: 28,
            fontFamily: "Jakarta-Bold",
            marginTop: 20,
          }}>
            Crear Cuenta
          </Text>
          <Text style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            fontFamily: "Jakarta-Medium",
            marginTop: 8,
          }}>
            Regístrate para comenzar
          </Text>
        </View>

        {/* Form Container */}
        <View style={{
          backgroundColor: colors.bg,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 40,
          minHeight: 500,
        }}>
          {/* Name Field */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              color: colors.text,
              fontSize: 14,
              fontFamily: "Jakarta-SemiBold",
              marginBottom: 10,
              marginLeft: 4,
            }}>
              Nombre
            </Text>
            <View style={inputContainerStyle}>
              <Image source={icons.person} style={{ width: 22, height: 22, tintColor: colors.muted }} />
              <TextInput
                style={inputStyle}
                placeholder="Ingresa tu nombre"
                placeholderTextColor={colors.muted}
                value={form.name}
                onChangeText={(value) => setform({ ...form, name: value })}
              />
            </View>
          </View>

          {/* Email Field */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              color: colors.text,
              fontSize: 14,
              fontFamily: "Jakarta-SemiBold",
              marginBottom: 10,
              marginLeft: 4,
            }}>
              Email
            </Text>
            <View style={inputContainerStyle}>
              <Image source={icons.email} style={{ width: 22, height: 22, tintColor: colors.muted }} />
              <TextInput
                style={inputStyle}
                placeholder="Ingresa tu email"
                placeholderTextColor={colors.muted}
                value={form.email}
                onChangeText={(value) => setform({ ...form, email: value })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{
              color: colors.text,
              fontSize: 14,
              fontFamily: "Jakarta-SemiBold",
              marginBottom: 10,
              marginLeft: 4,
            }}>
              Contraseña
            </Text>
            <View style={inputContainerStyle}>
              <Image source={icons.lock} style={{ width: 22, height: 22, tintColor: colors.muted }} />
              <TextInput
                style={inputStyle}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor={colors.muted}
                value={form.password}
                onChangeText={(value) => setform({ ...form, password: value })}
                secureTextEntry
              />
            </View>
          </View>

          {/* Sign Up Button */}
          <CustomButton
            title="Registrarse"
            onPress={onSignUpPress}
            className="mb-4"
          />

          <OAut />

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24 }}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>
              ¿Ya tienes cuenta?{" "}
            </Text>
            <Link href="/(auth)/sign-in">
              <Text style={{ color: "#8B6A3F", fontSize: 15, fontFamily: "Jakarta-SemiBold" }}>
                Iniciar Sesión
              </Text>
            </Link>
          </View>
        </View>

        {/* Verification Modal */}
        <ReactNativeModal
          isVisible={verification.state === "pending"}
          onModalHide={() =>{
            if(verification.state === "success") {
              setshowSuccessModal(true);
            }
          }}
        >
          <View style={[glassStyle, { paddingHorizontal: 28, paddingVertical: 36, minHeight: 300 }]}>
            <Text style={{ color: colors.text, fontSize: 24, marginBottom: 8, fontFamily: "Jakarta-ExtraBold" }}>
              Verificación
            </Text>
            <Text style={{ color: colors.muted, marginBottom: 20, fontFamily: "Jakarta-Regular" }}>
              Enviamos un código de verificación a {form.email}
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{
                color: colors.text,
                fontSize: 14,
                fontFamily: "Jakarta-SemiBold",
                marginBottom: 10,
                marginLeft: 4,
              }}>
                Código
              </Text>
              <View style={inputContainerStyle}>
                <Image source={icons.lock} style={{ width: 22, height: 22, tintColor: colors.muted }} />
                <TextInput
                  style={inputStyle}
                  placeholder="12345"
                  placeholderTextColor={colors.muted}
                  value={verification.code}
                  onChangeText={(code) => setVerification({ ...verification, code })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {verification.error && (
              <Text style={{ color: colors.danger, fontSize: 14, marginTop: 4, marginBottom: 8 }}>
                {verification.error}
              </Text>
            )}

            <CustomButton
              title="Verificar Email"
              onPress={onPressVerify}
              className="mt-4"
            />
          </View>
        </ReactNativeModal>

        {/* Success Modal */}
        <ReactNativeModal isVisible={showSuccessModal}>
          <View style={[glassStyle, { paddingHorizontal: 28, paddingVertical: 36, minHeight: 300 }]}>
            <Image
              source={images.check}
              style={{ width: 110, height: 110, alignSelf: "center", marginVertical: 20 }}
            />
            <Text style={{ color: colors.text, fontSize: 28, textAlign: "center", fontFamily: "Jakarta-Bold" }}>
              Verificado
            </Text>
            <Text style={{ color: colors.muted, fontSize: 16, textAlign: "center", marginTop: 8, fontFamily: "Jakarta-Regular" }}>
              Tu cuenta ha sido verificada exitosamente.
            </Text>

            <CustomButton
              title="Continuar"
              onPress={() => {
                setshowSuccessModal(false);
                router.push("/(root)/(tabs)/home")
              }}
              className="mt-6"
            />
          </View>
        </ReactNativeModal>
      </View>
    </ScrollView>
    </Screen>
  );
};

export default SignUp;
