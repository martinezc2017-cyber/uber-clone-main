import { useState } from "react";
import OAut from "@/components/OAuth";
import { Link, router } from "expo-router";
import { icons, images } from "@/constants";
import { useSignUp } from "@clerk/clerk-expo";
import InputField from "@/components/InputField";
import ReactNativeModal from "react-native-modal";
import CustomButton from "@/components/CustomButton";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { fetchAPI } from "@/lib/fetch";


const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [showSuccessModal, setshowSuccessModal] = useState(false);

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

      console.log("Sign-up verification status:", completeSignUp.status);

      if (completeSignUp.status === 'complete') {
        try {
          console.log("Creating user in database...");
          await fetchAPI('/(api)/user', {
            method : "POST",
            body: JSON.stringify({
              name: form.name,
              email: form.email,
              clerkId: completeSignUp.createdUserId,
            }),
          });
          console.log("User created in database successfully");
        } catch (dbErr) {
          console.error("Failed to create user in database:", dbErr);
          // Continue anyway - user is created in Clerk
        }

        console.log("Setting active session...");
        await setActive({ session: completeSignUp.createdSessionId })
        console.log("Setting verification state to success");
        setVerification({ ...verification, state: "success" })
        console.log("Verification complete!");
      } else {
        console.log("Verification failed, status:", completeSignUp.status);
        setVerification({ ...verification, error: "Verification Failed", state: "failed" })
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage || err?.message || "Verification failed. Please try again.";
      setVerification({ ...verification, error: message, state: "failed" })
    }
  }


  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 bg-white">
        <View className="relative w-full h-[250px]">
          <Image
            source={images.signUpCar} className="z-0 w-full h-[250px]" />
          <Text className="text-2xl text-black font-JakartaSemiBold absolute bottom-5 left-5">Create Your Account</Text>
        </View>
        <View className="p-5">
          <InputField
            label="Name"
            placeholder="Enter Your Name"
            icon={icons.person}
            value={form.name}
            onChangeText={(value) => setform({ ...form, name: value })}
          />
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

          <CustomButton
            title="Sign Up"
            onPress={onSignUpPress}
            className="mt-6"
          />

          <OAut />

          <Link
            href="/(auth)/sign-in"
            className="text-lg text-center text-general-200 mt-6"
          >
            <Text>Already have an account?{" "}</Text>
            <Text className="text-primary-500">LogIn</Text>
          </Link>
        </View>

        <ReactNativeModal
          isVisible={verification.state === "pending"}
          onModalHide={() =>{
            console.log("Verification modal hiding, state:", verification.state);
            if(verification.state === "success") {
              console.log("Setting success modal to true");
              setshowSuccessModal(true);
            }
          }}
        >
          <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
            <Text className="text-2xl font-JakartaExtraBold mb-2">
              verification
            </Text>
            <Text className="font-Jakarta mb-5">
              We've sent a verification code to {form.email}
            </Text>

            <InputField
              label="code"
              icon={icons.lock}
              placeholder="12345"
              value={verification.code}
              keyboardType="numeric"
              onChangeText={(code) => setVerification({ ...verification, code })
              }
            />

            {verification.error && (
              <Text className="text-red-500 text-sm mt-1">
                {verification.error}
              </Text>
            )}

            <CustomButton 
            title="Verify Email" 
            onPress={onPressVerify} 
            className="mt-5 bg-success-500" 
            />
          </View>
        </ReactNativeModal>
        <ReactNativeModal isVisible={showSuccessModal} onShow={() => console.log("Success modal showing!")}>

          <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
            <Image
              source={images.check}
              className="w-[110px] h-[110px] mx-auto my-5"
            />
            <Text className="text-3xl font-JakartaBold text-center">
              Verified
            </Text>
            <Text className="text-base text-gray-400 font-Jakarta text-center mt-2">
              You have successfully verified your account.
            </Text>

            <CustomButton
              title="Browse Home"
              onPress={() => {
                setshowSuccessModal(false);
                router.push("/(root)/(tabs)/home")}}
              className="mt-5"
            />

          </View>
        </ReactNativeModal>
      </View>
    </ScrollView>
  );
};

export default SignUp;
