import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { makeRedirectUri } from "expo-auth-session";

import { fetchAPI } from "@/lib/fetch";

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      console.error("SecureStore get item error: ", error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export const googleOAuth = async (startOAuthFlow: any) => {
  try {
    // Use makeRedirectUri for Expo Go + dev clients; falls back to the scheme on device.
    const redirectUrl =
      makeRedirectUri({
        scheme: "myapp",
        path: "/--/sso-callback",
      }) || Linking.createURL("/--/sso-callback", { scheme: "myapp" });

    console.log("Starting OAuth with redirectUrl:", redirectUrl);

    const { createdSessionId, setActive, signUp, signIn, authSessionResult } = await startOAuthFlow({
      redirectUrl,
    });

    // Log OAuth flow results for debugging
    console.log("OAuth Flow Result:", {
      createdSessionId,
      hasSetActive: !!setActive,
      hasSignUp: !!signUp,
      hasSignIn: !!signIn,
      authSessionType: authSessionResult?.type || "none",
      authSessionError: authSessionResult?.error || "none"
    });

    const sessionId =
      createdSessionId ??
      signIn?.createdSessionId ??
      signUp?.createdSessionId ??
      authSessionResult?.sessionId ??
      authSessionResult?.createdSessionId ??
      authSessionResult?.data?.sessionId ??
      authSessionResult?.data?.createdSessionId;

    if (sessionId && setActive) {
      await setActive({ session: sessionId });

      if (signUp?.createdUserId) {
        try {
          await fetchAPI("/(api)/user", {
            method: "POST",
            body: JSON.stringify({
              name: `${signUp.firstName ?? ""} ${signUp.lastName ?? ""}`.trim(),
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId,
            }),
          });
        } catch (dbErr) {
          console.error("Failed to sync user record after Google sign-in:", dbErr);
        }
      }

      return {
        success: true,
        code: "success",
        message: "You have successfully signed in with Google",
      };
    }

    const raw = JSON.stringify(
      { authSessionResult, signIn, signUp, createdSessionId },
      null,
      2,
    );
    const message =
      authSessionResult?.error ||
      "No session returned. Revisa las Redirect URLs y Bundle IDs en Clerk.";
    return {
      success: false,
      code: authSessionResult?.errorCode || "no_session",
      message,
      raw,
    };

    return {
      success: false,
      message: "An error occurred while signing in with Google",
    };
  } catch (err: any) {
    console.error(err);
    const asString =
      typeof err === "string"
        ? err
        : err?.errors?.[0]?.longMessage ||
          err?.message ||
          JSON.stringify(err, null, 2) ||
          "An error occurred while signing in with Google";
    const message =
      err?.errors?.[0]?.longMessage ||
      err?.message ||
      asString ||
      "An error occurred while signing in with Google";
    return {
      success: false,
      code: err?.code,
      message,
      raw: asString,
    };
  }
};
