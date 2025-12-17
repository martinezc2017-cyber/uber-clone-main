import Constants from "expo-constants";
import { useState, useEffect, useCallback } from "react";

const getBaseUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) return apiUrl.replace(/\/$/, "");

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return "";

  const cleanedHost = hostUri.replace(/^(https?:\/\/|exp:\/\/)/, "");
  const [host, port] = cleanedHost.split(":");

  if (!host) return "";

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
    console.error("Fetch error:", error);
    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
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
