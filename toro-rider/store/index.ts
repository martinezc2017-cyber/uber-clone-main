import { DriverStore, LocationStore, MarkerData } from "@/types/type";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type DestinationHistory = {
    id: string;
    address: string;
    latitude: number;
    longitude: number;
    timestamp: number;
};

type LocationStoreWithHistory = LocationStore & {
    destinationHistory: DestinationHistory[];
    addToHistory: (location: { latitude: number; longitude: number; address: string }) => void;
    removeFromHistory: (id: string) => void;
    clearHistory: () => void;
};

export const useLocationStore = create<LocationStoreWithHistory>()(
    persist(
        (set, get) => ({
            userAddress: null,
            userLatitude: null,
            userLongitude: null,
            destinationAddress: null,
            destinationLatitude: null,
            destinationLongitude: null,
            clearDestinationLocation: () => {
                set(() => ({
                    destinationAddress: null,
                    destinationLatitude: null,
                    destinationLongitude: null,
                }));
            },
            destinationHistory: [],
            setUserLocation: ({
                latitude, longitude, address
            }: {
                    latitude : number, longitude : number, address : string
                }) => {
                    set(() => ({
                        userLatitude: latitude,
                        userLongitude: longitude,
                        userAddress: address,
                    }));
            },
            setDestinationLocation: ({
                latitude, longitude, address
            }: {
                    latitude : number, longitude : number, address : string
                }) => {
                    set((state) => {
                        // Add to history
                        const now = Date.now();
                        const newHistoryItem: DestinationHistory = {
                            id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
                            address,
                            latitude,
                            longitude,
                            timestamp: now,
                        };

                        // Keep only last 10 destinations, avoiding duplicates
                        const filteredHistory = state.destinationHistory.filter(
                            (item) => item.address !== address
                        );
                        const updatedHistory = [newHistoryItem, ...filteredHistory].slice(0, 10);

                        return {
                            destinationLatitude: latitude,
                            destinationLongitude: longitude,
                            destinationAddress: address,
                            destinationHistory: updatedHistory,
                        };
                    });
            },
            addToHistory: (location) => {
                set((state) => {
                    const now = Date.now();
                    const newHistoryItem: DestinationHistory = {
                        id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
                        address: location.address,
                        latitude: location.latitude,
                        longitude: location.longitude,
                        timestamp: now,
                    };

                    const filteredHistory = state.destinationHistory.filter(
                        (item) => item.address !== location.address
                    );
                    const updatedHistory = [newHistoryItem, ...filteredHistory].slice(0, 10);

                    return {
                        destinationHistory: updatedHistory,
                    };
                });
            },
            removeFromHistory: (id) => {
                set((state) => ({
                    destinationHistory: state.destinationHistory.filter((item) => item.id !== id),
                }));
            },
            clearHistory: () => {
                set(() => ({
                    destinationHistory: [],
                }));
            },
        }),
        {
            name: "location-storage",
            storage: createJSONStorage(() => AsyncStorage),
            // Clean up duplicate IDs on rehydration (migration for old data)
            onRehydrateStorage: () => (state) => {
                if (state && state.destinationHistory) {
                    const seenIds = new Set<string>();
                    const cleanedHistory = state.destinationHistory.filter((item) => {
                        if (seenIds.has(item.id)) {
                            return false; // Remove duplicate
                        }
                        seenIds.add(item.id);
                        return true;
                    });
                    // Update state if we removed duplicates
                    if (cleanedHistory.length !== state.destinationHistory.length) {
                        useLocationStore.setState({ destinationHistory: cleanedHistory });
                    }
                }
            },
        }
    )
);

export const useDriverStore = create<DriverStore>((set) => ({
    drivers: [] as MarkerData[],
    selectedDriver: null,
    setSelectedDriver: (driverId: number) => 
        set(() => ({ selectedDriver : driverId })),
    setDrivers: (drivers: MarkerData[]) => set(() => ({ drivers: drivers })),
    clearSelectedDriver: () => set (() => ({ selectedDriver: null }))

}))
