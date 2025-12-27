import { useState, useEffect } from "react";
import { fetchAPI } from "./fetch";
import { Ride } from "@/types/type";

export const useActiveRide = (userId: string | undefined) => {
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkActiveRide = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetchAPI(`/api/ride/active?clerk_id=${userId}`);
        if (res?.data) {
          setActiveRide(res.data);
        } else {
          setActiveRide(null);
        }
      } catch (e) {
        console.warn("Error checking active ride:", e);
        setError("Failed to check active ride");
      } finally {
        setLoading(false);
      }
    };

    checkActiveRide();
  }, [userId]);

  return { activeRide, loading, error };
};
