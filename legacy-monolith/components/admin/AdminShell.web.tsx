// @ts-nocheck
import { useAuth, useUser } from "@clerk/clerk-expo";
import { usePathname } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const NavLink = ({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) => {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: "11px 12px",
        borderRadius: 10,
        backgroundColor: active ? "#19212d" : "transparent",
        color: active ? "#fff" : "#cbd5e1",
        textDecoration: "none",
        fontSize: 13,
        fontFamily: active
          ? "Jakarta-Bold, system-ui, sans-serif"
          : "Jakarta-Medium, system-ui, sans-serif",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: active ? "#60a5fa" : "#475569",
        }}
      />
      <span>{label}</span>
    </a>
  );
};

const AdminShell = ({
  children,
  basePath = "/admin",
}: {
  children: React.ReactNode;
  basePath?: string;
}) => {
  const { user } = useUser();
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const email = user?.primaryEmailAddress?.emailAddress;
  const base = basePath.replace(/\/$/, "");

  const navItems = [
    { href: `${base}`, label: "Dashboard" },
    { href: `${base}/pricing`, label: "Pricing" },
    { href: `${base}/rides`, label: "Rides" },
    { href: `${base}/messages`, label: "Messages" },
    { href: `${base}/clients`, label: "Clients" },
    { href: `${base}/drivers`, label: "Drivers" },
    { href: `${base}/waitlist`, label: "Driver waitlist" },
    { href: `${base}/live-map`, label: "Live map" },
    { href: `${base}/branches`, label: "Branches" },
    { href: `${base}/moderators`, label: "Moderators" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        minHeight: "100vh",
        backgroundColor: "#d9d9d9",
      }}
    >
      <View
        style={{
          width: 240,
          backgroundColor: "#0f1218",
          paddingTop: 24,
          paddingHorizontal: 16,
          paddingBottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Futuristic glow bubble */}
        <View
          style={{
            position: "absolute",
            right: -50,
            top: 60,
            width: 160,
            height: 160,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 30% 30%, rgba(96,165,250,0.3), rgba(55,65,81,0.05))",
            filter: "blur(12px)",
            opacity: 0.9,
          }}
        />
        {/* Floating pill CTA */}
        <View
          style={{
            position: "absolute",
            right: -20,
            top: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            background:
              "linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #fcd34d 100%)",
            borderRadius: 999,
            boxShadow: "0 10px 30px rgba(168,85,247,0.35)",
            transform: "rotate(-8deg)",
          }}
        >
          <Text
            style={{
              color: "#0f1218",
              fontSize: 12,
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            Synced live
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#0f1218",
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: "#1f2937",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#111827",
              alignItems: "center",
              justifyContent: "center",
              display: "flex",
              borderWidth: 1,
              borderColor: "#1f2937",
            }}
          >
            <Text
              style={{
                color: "#f8fafc",
              fontSize: 12,
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            C
          </Text>
        </View>
        <View>
          <Text
            style={{
              color: "#f8fafc",
              fontSize: 13,
              fontFamily: "Jakarta-Bold, system-ui, sans-serif",
            }}
          >
            Hola Carlos
          </Text>
          <Text
            style={{
              color: "#94a3b8",
              fontSize: 11,
                fontFamily: "Jakarta-Regular, system-ui, sans-serif",
              }}
            >
              Administrator
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 6 }}>
          <Text
            style={{
              color: "#94a3b8",
              fontSize: 11,
              marginBottom: 8,
              fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
            }}
          >
            MAIN MENU
          </Text>
          <View style={{ display: "flex", gap: 6 }}>
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                }
              />
            ))}
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <View
          style={{
            backgroundColor: "#0f1218",
            borderWidth: 1,
            borderColor: "#1f2937",
            borderRadius: 12,
            padding: 12,
            gap: 6,
          }}
        >
          <Text
            style={{
              color: "#94a3b8",
              fontSize: 11,
              fontFamily: "Jakarta-Regular, system-ui, sans-serif",
            }}
          >
            {isLoaded && isSignedIn ? "Signed in" : "Dev mode"}
          </Text>
          <Text
            style={{
              color: "#e2e8f0",
              fontSize: 12,
              fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
            }}
          >
            {isLoaded && isSignedIn ? email ?? "User" : "No session"}
          </Text>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: "#f5f5f7",
          padding: 20,
          overflowY: "auto",
        }}
      >
        {children}
      </View>
    </View>
  );
};

export default AdminShell;
