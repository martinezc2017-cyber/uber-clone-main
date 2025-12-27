import React from "react";
import { Pressable, Text, View } from "react-native";
import { SwissColors } from '@/constants/theme';

import { ButtonProps } from "@/types/type";

const getBgVariantStyle = (variant: ButtonProps["bgVariant"]) => {
  switch (variant) {
    case "secondary":
      return "bg-grey-500";
    case "danger":
      return "bg-red-500";
    case "success":
      return "bg-green-500";
    case "outline":
      return "bg-transparent border-neutral-300 border-[0.5px]";
    default:
      return "bg-[SwissColors.primary]";
  }
};

const getTextVariantStyle = (variant: ButtonProps["textVariant"]) => {
  switch (variant) {
    case "primary":
      return "text-black";
    case "secondary":
      return "text-grey-100";
    case "danger":
      return "bg-red-100";
    case "success":
      return "bg-green-100";
    default:
      return "text-white";
  }
};

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  IconLeft,
  IconRight,
  className,
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      role="button"
      style={({ pressed }) => [
        { opacity: disabled ? 0.55 : pressed ? 0.85 : 1 },
      ]}
      {...(props as any)}
    >
      <View
        className={`w-full rounded-full p-3 flex flex-row justify-center items-center shadow-md shadow-neutral-400/70 ${getBgVariantStyle(bgVariant)} ${className}`}
      >
        {IconLeft ? <IconLeft /> : null}
        <Text className={`text-lg font-bold ${getTextVariantStyle(textVariant)}`}>
          {title}
        </Text>
        {IconRight ? <IconRight /> : null}
      </View>
    </Pressable>
  );
};

export default CustomButton;

