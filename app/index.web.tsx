import { useAuth, useUser } from "@clerk/clerk-expo";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { SwissColors } from '@/constants/theme';
import DriverWaitlistForm from "@/components/DriverWaitlistForm";

type LinkButtonVariant = "primary" | "secondary" | "outline";

const LinkButton = ({
  href,
  title,
  variant = "primary",
}: {
  href: string;
  title: string;
  variant?: LinkButtonVariant;
}) => {
  const base =
    "w-full rounded-full p-3 flex flex-row justify-center items-center shadow-md shadow-neutral-700/40 cursor-pointer select-none transition-transform duration-150 active:scale-[0.99]";

  const bg =
    variant === "outline"
      ? "bg-transparent border-[#2da86a] border-[0.5px]"
      : variant === "secondary"
        ? "bg-[#0f2a1b]"
        : "bg-[#12c46b]";

  const text =
    variant === "outline" || variant === "secondary"
      ? "text-white"
      : "text-[SwissColors.background]";

  const handleClick = (e: any) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.location.href = href;
    }
  };

  return (
    <a href={href} onClick={handleClick} className={`${base} ${bg}`}>
      <span className={`text-lg font-bold ${text}`}>{title}</span>
    </a>
  );
};

const IndexWeb = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const statusText = useMemo(() => {
    if (!isLoaded) return "Loading authentication (Clerk)...";
    if (!isSignedIn) return "You are not signed in.";
    return `Signed in: ${user?.primaryEmailAddress?.emailAddress ?? "Unknown user"}`;
  }, [isLoaded, isSignedIn, user]);

  return (
    <View className="flex-1 items-center justify-center bg-[SwissColors.background] p-6">
      <View className="w-full max-w-2xl bg-[#0d2015] rounded-2xl border border-[#183728] p-6 shadow-md shadow-neutral-900/40">
        <Text className="text-3xl font-JakartaExtraBold text-primary-400">
          Rydo
        </Text>
        <Text className="text-sm font-JakartaRegular text-white/70 mt-1">
          Web demo - App + Admin
        </Text>

        <View className="mt-5 bg-[#0f2a1b] rounded-2xl p-4 border border-[#183728]">
          <Text className="text-xs font-JakartaSemiBold text-primary-300">
            Estado
          </Text>
          <Text className="text-sm font-JakartaSemiBold text-white mt-2">
            {statusText}
          </Text>
        </View>

        <View className="mt-6 gap-y-3">
          <LinkButton title="Go to Admin Dashboard" href="/admin-dev/drivers" />
          <LinkButton title="Open app (user)" variant="outline" href="/(auth)/welcome" />
          <LinkButton title="Sign in" variant="secondary" href="/(auth)/sign-in" />
        </View>

        <View style={{ marginTop: 20 }}>
          <Text className="text-lg font-JakartaBold text-white mb-3">
            Drivers: únete a la lista de espera
          </Text>
          <View
            style={{
              backgroundColor: "#0b1510",
              borderColor: "#1f4030",
              borderWidth: 1,
              borderRadius: 16,
            }}
          >
            <DriverWaitlistForm variant="dark" source="web-landing" compact />
          </View>
        </View>
      </View>
    </View>
  );
};

export default IndexWeb;

