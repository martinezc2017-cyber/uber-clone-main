import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAut from "@/components/OAuth";
import { icons, images } from "@/constants";
import { Link, useRouter} from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { useSignIn } from '@clerk/clerk-expo'
import Screen from "@/components/layout/Screen";
import { useGlassStyle } from "@/components/layout/GlassCard";
import { useThemeStore, themeColors } from "@/store/themeStore";



const SignIn = ()  => {
    const { signIn, setActive, isLoaded } = useSignIn()
    const router = useRouter()
    const { activeTheme } = useThemeStore();
    const colors = themeColors[activeTheme];
    const glassStyle = useGlassStyle();

    const [form, setform] = useState({
        email:'',
        password:'',
    });

    const onSignInPress = useCallback(async () => {
        if (!isLoaded) {
          return
        }

        try {
          const signInAttempt = await signIn.create({
            identifier: form.email,
            password: form.password,
          })

          if (signInAttempt.status === 'complete') {
            await setActive({ session: signInAttempt.createdSessionId })
            router.replace('/')
          } else {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error(JSON.stringify(signInAttempt, null, 2))
          }
        } catch (err: any) {
          const message = err?.errors?.[0]?.longMessage || err?.message || "Unable to sign in. Please try again.";
          console.error(JSON.stringify(err, null, 2))
          Alert.alert("Error", message);
        }
      }, [isLoaded, form.email, form.password])

    return(
        <Screen>
        <ScrollView className="flex-1" style={{ backgroundColor: colors.bg }}>
            <View className="flex-1">
                <View style={{ position: "relative", width: "100%", height: 250 }}>
                    <Image
                        source={images.signUpCar}
                        style={{ width: "100%", height: 250 }}
                    />
                    <View style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 80,
                        backgroundColor: colors.bg,
                        opacity: 0.9,
                    }} />
                    <Text style={{ color: colors.text, fontSize: 24, position: "absolute", bottom: 20, left: 20 }} className="font-JakartaSemiBold">Welcome</Text>
                </View>
                <View style={{ padding: 20 }}>
                    <View style={[glassStyle, { marginBottom: 20 }]}>
                        <InputField
                            label="Email"
                            placeholder="Enter Your Email"
                            icon={icons.email}
                            value={form.email}
                            onChangeText={(value) => setform({ ...form, email: value })}
                        />
                        <InputField
                            label="Password"
                            placeholder="Enter Your Password"
                            icon={icons.lock}
                            secureTextEntry={true}
                            value={form.password}
                            onChangeText={(value) => setform({ ...form, password: value })}
                        />
                    </View>

                    <CustomButton
                    title="Sign In"
                    onPress={onSignInPress}
                    className="mt-2"
                    />

                    <OAut />

                    <Link
                    href="/(auth)/sign-up"
                    style={{ marginTop: 40, textAlign: "center" }}
                    >
                        <Text style={{ color: colors.muted, fontSize: 16 }}>Don't have an account?{" "}</Text>
                        <Text style={{ color: colors.accent, fontSize: 16 }}>Sign Up</Text>
                    </Link>
                </View>

                {/* Verification modal */}
            </View>
        </ScrollView>
        </Screen>
    );
};

export default SignIn;
