import useSWR, { mutate } from "swr";
import { PromptHistoryItem } from "@/lib/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json();
  return json.data;
};

export function usePromptHistory() {
  const { data, error, isLoading } = useSWR<PromptHistoryItem[]>(
    "/api/prompt-history",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 1 minute
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

      if (!response.ok) throw new Error("Failed to save");

      // Revalidate cache
      mutate("/api/prompt-history");
    } catch (err) {
      console.error("Error saving prompt history:", err);
    }
  };

  const deletePromptHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/prompt-history?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      // Revalidate cache
      mutate("/api/prompt-history");
    } catch (err) {
      console.error("Error deleting prompt history:", err);
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
