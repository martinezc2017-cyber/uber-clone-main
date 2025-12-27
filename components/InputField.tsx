/**
 * InputField - Premium themed input component
 * TORO Design System
 */

import { InputFieldProps } from "@/types/type";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

const InputField = ({
  label,
  labelStyle,
  icon,
  secureTextEntry,
  containerStyle,
  inputStyle,
  iconStyle,
  className,
  ...props
}: InputFieldProps) => {
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const isDark = activeTheme === "dark";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="my-2 w-full">
          <Text
            style={{ color: colors.text }}
            className={`text-lg font-JakartaSemiBold mb-3 ${labelStyle}`}
          >
            {label}
          </Text>
          <View
            style={{
              backgroundColor: isDark ? colors.surface : "#F5F5F5",
              borderColor: isDark ? colors.border : "#E5E5E5",
              borderWidth: 1,
              borderRadius: 14,
            }}
            className={`flex flex-row justify-start items-center relative ${containerStyle}`}
          >
            {icon && (
              <Image
                source={icon}
                style={{ tintColor: colors.muted }}
                className={`w-6 h-6 ml-4 ${iconStyle}`}
              />
            )}
            <TextInput
              style={{
                color: colors.text,
              }}
              placeholderTextColor={colors.muted}
              className={`p-4 font-JakartaSemiBold text-[15px] flex-1 ${inputStyle} text-left`}
              secureTextEntry={secureTextEntry}
              {...props}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default InputField;
