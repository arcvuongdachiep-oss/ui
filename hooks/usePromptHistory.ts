import useSWR, { mutate } from "swr";
import { PromptHistoryItem } from "@/lib/types";

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    const json = await res.json();
    
    // Always return data array, even if fetch failed
    if (!res.ok) {
      console.warn("Prompt history fetch failed:", res.status);
      return [];
    }
    
    return json.data || [];
  } catch (err) {
    console.warn("Prompt history fetcher error:", err);
    return [];
  }
};

export function usePromptHistory() {
  const { data, error, isLoading } = useSWR<PromptHistoryItem[]>(
    "/api/prompt-history",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 1 minute
      onError: (err) => {
        console.warn("SWR error:", err);
      }
    }
  );

  const savePromptHistory = async (
    prompt: string,
    base_image_url?: string | null,
    ref_image_url?: string | null
  ) => {
    try {
      const response = await fetch("/api/prompt-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          base_image_url: base_image_url || null,
          ref_image_url: ref_image_url || null,
        }),
      });

      if (!response.ok) {
        console.warn("Failed to save prompt history:", response.status);
      }

      // Revalidate cache regardless of success/failure
      mutate("/api/prompt-history");
    } catch (err) {
      console.warn("Error saving prompt history:", err);
      // Silently fail - don't crash frontend
    }
  };

  const deletePromptHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/prompt-history?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        console.warn("Failed to delete prompt history:", response.status);
      }

      // Revalidate cache regardless of success/failure
      mutate("/api/prompt-history");
    } catch (err) {
      console.warn("Error deleting prompt history:", err);
      // Silently fail - don't crash frontend
    }
  };

  return {
    items: data || [],
    isLoading,
    error,
    savePromptHistory,
    deletePromptHistory,
  };
}
