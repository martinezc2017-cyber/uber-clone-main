import {TextInputProps, TouchableOpacityProps} from "react-native";

declare interface Driver {
    id?: number;
    driver_id?: number;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
    car_image_url?: string;
    car_seats: number;
    rating?: number;
    phone_number?: string;
    allow_calls?: boolean;
    allow_messages?: boolean;
    latitude?: number | null;
    longitude?: number | null;
}

declare interface DriverWaitlistEntry {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    city?: string | null;
    vehicle?: string | null;
    experience_years?: number | null;
    status?: "pending" | "approved" | "rejected";
    source?: string | null;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
}

declare interface MarkerData {
    latitude: number | null;
    longitude: number | null;
    id: number;
    title: string;
    profile_image_url?: string;
    car_image_url?: string;
    car_seats: number;
    rating?: number;
    first_name: string;
    last_name: string;
    distance?: string;
    time?: number;
    price?: string;
    fareBreakdown?: any;
}

declare interface MapProps {
    destinationLatitude?: number;
    destinationLongitude?: number;
    onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void;
    selectedDriver?: number | null;
    onMapReady?: () => void;
}

declare interface Ride {
    ride_id: number;
    user_id?: number | null;
    user_name?: string | null;
    user_email?: string | null;
    clerk_id?: string | null;
    origin_address: string;
    destination_address: string;
    origin_latitude: number | string;
    origin_longitude: number | string;
    destination_latitude: number | string;
    destination_longitude: number | string;
    ride_time?: number | null;
    fare_price?: number | string | null;
    payment_status?: string;
    driver_id?: number | null;
    ride_status?: string | null;
    created_at?: string;
    driver?: Driver | null;
}

declare interface ButtonProps extends TouchableOpacityProps {
    title: string;
    bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
    textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
    IconLeft?: React.ComponentType<any>;
    IconRight?: React.ComponentType<any>;
    className?: string;
    containerStyles?: string;
    textStyles?: string;
}

declare interface GoogleInputProps {
    icon?: string;
    initialLocation?: string | null;
    containerStyle?: string;
    textInputBackgroundColor?: string;
    handlePress: ({
                      latitude,
                      longitude,
                      address,
                  }: {
        latitude: number;
        longitude: number;
        address: string;
    }) => void;
}

declare interface InputFieldProps extends TextInputProps {
    label: string;
    icon?: any;
    secureTextEntry?: boolean;
    labelStyle?: string;
    containerStyle?: string;
    inputStyle?: string;
    iconStyle?: string;
    className?: string;
}

declare interface PaymentProps {
    fullName: string;
    email: string;
    amount: string;
    driverId: number;
    rideTime: number;
}

declare interface LocationStore {
    userLatitude: number | null;
    userLongitude: number | null;
    userAddress: string | null;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    destinationAddress: string | null;
    destinationHistory?: {
        id: string;
        address: string;
        latitude: number;
        longitude: number;
        timestamp: number;
    }[];
    setUserLocation: ({
                          latitude,
                          longitude,
                          address,
                      }: {
        latitude: number;
        longitude: number;
        address: string;
    }) => void;
    setDestinationLocation: ({
                                 latitude,
                                 longitude,
                                 address,
                             }: {
        latitude: number;
        longitude: number;
        address: string;
    }) => void;
    clearDestinationLocation: () => void;
    addToHistory?: (location: { latitude: number; longitude: number; address: string }) => void;
    removeFromHistory?: (id: string) => void;
    clearHistory?: () => void;
}

declare interface DriverStore {
    drivers: MarkerData[];
    selectedDriver: number | null;
    setSelectedDriver: (driverId: number) => void;
    setDrivers: (drivers: MarkerData[]) => void;
    clearSelectedDriver: () => void;
}

declare interface DriverCardProps {
    item: MarkerData;
    selected: number;
    setSelected: () => void;
}
