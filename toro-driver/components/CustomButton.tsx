/**
 * CustomButton - Premium TORO styled button
 * Gold & Fire Design System
 */

import { ButtonProps } from "@/types/type";
import { Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

const CustomButton = ({
    onPress,
    title,
    bgVariant = "primary",
    textVariant = "default",
    IconLeft,
    IconRight,
    className,
    containerStyles,
    textStyles,
    disabled,
    loading,
    ...props
}: ButtonProps & { disabled?: boolean; loading?: boolean }) => {
    const { activeTheme } = useThemeStore();
    const colors = themeColors[activeTheme];
    const isDark = activeTheme === "dark";

    const getBgStyle = () => {
        switch (bgVariant) {
            case "secondary":
                return {
                    backgroundColor: isDark ? "rgba(201, 165, 92, 0.12)" : "rgba(166, 124, 61, 0.1)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(201, 165, 92, 0.3)" : "rgba(166, 124, 61, 0.25)",
                };
            case "danger":
                return {
                    backgroundColor: isDark ? colors.dangerLight : "#FEE2E2",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(220, 38, 38, 0.25)",
                };
            case "success":
                return {
                    backgroundColor: isDark ? colors.successLight : "#DCFCE7",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(34, 197, 94, 0.3)" : "rgba(22, 163, 74, 0.25)",
                };
            case "outline":
                return {
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(201, 165, 92, 0.3)" : "rgba(166, 124, 61, 0.25)",
                };
            default: // primary
                return {
                    backgroundColor: colors.gold,
                    shadowColor: colors.gold,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    elevation: 8,
                };
        }
    };

    const getTextColor = () => {
        switch (bgVariant) {
            case "secondary":
            case "outline":
                return colors.gold;
            case "danger":
                return colors.danger;
            case "success":
                return colors.success;
            default: // primary
                return "#1A1A1A";
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                {
                    width: "100%",
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    opacity: disabled ? 0.5 : 1,
                },
                getBgStyle(),
            ]}
            className={className}
            {...props}
        >
            {loading ? (
                <ActivityIndicator size="small" color={getTextColor()} />
            ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {IconLeft && <IconLeft />}
                    <Text
                        style={{
                            fontSize: 17,
                            fontWeight: "700",
                            color: getTextColor(),
                            fontFamily: "Jakarta-Bold",
                        }}
                        className={textStyles}
                    >
                        {title}
                    </Text>
                    {IconRight && <IconRight />}
                </View>
            )}
        </TouchableOpacity>
    );
};

export default CustomButton;
