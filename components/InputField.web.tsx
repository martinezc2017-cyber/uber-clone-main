import { InputFieldProps } from "@/types/type";
import {
  Image,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";

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
}: InputFieldProps) => (
  <View className="my-2 w-full">
    <Text className={`text-lg font-JakartaSemiBold mb-3 ${labelStyle}`}>
      {label}
    </Text>
    <View
      className={`flex flex-row justify-start items-center relative bg-neutral-100 rounded-full border border-neutral-100 focus:border-primary-500 ${containerStyle}`}
    >
      {icon && (
        <Image
          source={icon}
          className={`w-6 h-6 ml-4 ${iconStyle}`}
          style={{ width: 24, height: 24, marginLeft: 16 }}
        />
      )}
      <TextInput
        className={`rounded-full p-4 font-JakartaSemiBold text-[15px] flex-1 ${inputStyle} text-left`}
        style={{
          padding: 16,
          fontSize: 15,
          flex: 1,
          outline: 'none',
        } as any}
        secureTextEntry={secureTextEntry}
        {...props}
      />
    </View>
  </View>
);

export default InputField;
