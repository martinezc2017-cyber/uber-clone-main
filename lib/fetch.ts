import Constants from "expo-constants";
import { Platform } from "react-native";
import { useState, useEffect, useCallback } from "react";

const normalizeBaseUrl = (url: string) => {
  if (!url) return url;

  // On Android emulator, localhost must be rewritten to host loopback
  if (Platform.OS === "android") {
    if (url.includes("localhost")) return url.replace("localhost", "10.0.2.2");
    if (url.includes("127.0.0.1")) return url.replace("127.0.0.1", "10.0.2.2");
  }

  return url;
};

const getBaseUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) return normalizeBaseUrl(apiUrl.replace(/\/$/, ""));

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return "";

  // hostUri examples:
  // - LAN: 192.168.0.10:8081
  // - Tunnel: dbttmha-martinezc2017-8081.exp.direct
  const cleanedHost = hostUri.replace(/^(https?:\/\/|exp:\/\/)/, "");
  const [host, port] = cleanedHost.split(":");

  if (!host) return "";

  // When using Expo tunnel (exp.direct / exp.host) use https (no port)
  if (/\.exp\.(direct|host)$/.test(host)) {
    return `https://${host}`;
  }

  return `http://${host}${port ? `:${port}` : ""}`;
};

export const fetchAPI = async (url: string, options?: RequestInit) => {
  const baseUrl = getBaseUrl();
  const isAbsolute = url.startsWith("http");
  const fullUrl = isAbsolute ? url : `${baseUrl}${url}`;

  if (!isAbsolute && !baseUrl) {
    throw new Error("Missing API base URL. Set EXPO_PUBLIC_API_URL to your server.");
  }

  try {
    const response = await fetch(fullUrl, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Fetch error:", error, {
      url: fullUrl,
      method: options?.method || "GET",
    });
    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        // Skip fetch if URL is empty or invalid
        if (!url || url.trim() === "") {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await fetchAPI(url, options);
            setData(result.data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [url, options]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {data, loading, error, refetch: fetchData};
};
