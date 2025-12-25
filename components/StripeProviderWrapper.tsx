import { StripeProvider } from "@stripe/stripe-react-native";
import React from "react";

const StripeProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.com.rydo"
      urlScheme="rydo"
    >
      {children as any}
    </StripeProvider>
  );
};

export default StripeProviderWrapper;
