"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Copy, Check, Calendar, Grid3x3, List } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface SavedPrompt {
  id: string;
  mode: string;
  prompt_en: string;
  prompt_vi: string;
  base_images: string[];
  ref_image: string;
  created_at: string;
}

interface MyLibraryProps {
  user: User | null;
}

export function MyLibrary({ user }: MyLibraryProps) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load user prompts on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadPrompts = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("user_prompts")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[v0] Error loading prompts:", error);
        } else {
          setPrompts(data || []);
        }
      } catch (err) {
        console.error("[v0] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPrompts();
  }, [user]);

  const deletePrompt = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_prompts")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[v0] Error deleting prompt:", error);
      } else {
        setPrompts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("[v0] Error:", err);
    }
  };

  const copyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-[#F27D26]/10 flex items-center justify-center mb-6">
          <List className="w-10 h-10 text-[#F27D26]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">My Library</h2>
        <p className="text-[#666] max-w-md mb-4">
          Dang nhap de xem lich su prompt cua ban
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#F27D26] border-t-transparent" />
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-[#F27D26]/10 flex items-center justify-center mb-6">
          <List className="w-10 h-10 text-[#F27D26]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">My Library</h2>
        <p className="text-[#666] max-w-md">
          Chua co prompt nao duoc luu. Hay tao prompt dau tien!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">My Library</h2>
          <p className="text-[#666] text-sm mt-1">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""} da luu
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#1A1A1A] rounded-lg p-1 border border-[#2A2A2A]">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded transition-colors ${
              viewMode === "grid"
                ? "bg-[#F27D26] text-white"
                : "text-[#666] hover:text-white"
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded transition-colors ${
              viewMode === "list"
                ? "bg-[#F27D26] text-white"
                : "text-[#666] hover:text-white"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid/List View */}
      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {prompts.map((prompt, idx) => (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl overflow-hidden hover:border-[#F27D26]/30 transition-all group"
              >
                {/* Image preview */}
                {prompt.ref_image && (
                  <div className="relative w-full h-40 overflow-hidden bg-[#1A1A1A]">
                    <img
                      src={prompt.ref_image}
                      alt="Prompt"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Mode and date */}
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 bg-[#F27D26]/10 text-[#F27D26] text-[10px] font-bold uppercase rounded">
                      {prompt.mode}
                    </span>
                    <div className="flex items-center gap-1 text-[#666] text-[10px]">
                      <Calendar className="w-3 h-3" />
                      {new Date(prompt.created_at).toLocaleDateString("vi-VN")}
                    </div>
                  </div>

                  {/* Prompt text */}
                  <p className="text-sm text-[#AAA] line-clamp-2">
                    {prompt.prompt_en}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => copyPrompt(prompt.prompt_en, prompt.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1A1A1A] text-[#888] text-xs font-medium rounded hover:bg-[#F27D26]/20 hover:text-[#F27D26] transition-colors"
                    >
                      {copiedId === prompt.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Da sao chep</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deletePrompt(prompt.id)}
                      className="px-3 py-2 bg-red-500/10 text-red-500 text-xs font-medium rounded hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {prompts.map((prompt, idx) => (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 hover:border-[#F27D26]/30 transition-all group flex items-start gap-4"
              >
                {/* Thumbnail */}
                {prompt.ref_image && (
                  <img
                    src={prompt.ref_image}
                    alt="Prompt"
                    className="w-20 h-20 rounded object-cover flex-shrink-0"
                  />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-[#F27D26]/10 text-[#F27D26] text-[10px] font-bold uppercase rounded">
                      {prompt.mode}
                    </span>
                    <span className="text-[#666] text-xs">
                      {new Date(prompt.created_at).toLocaleDateString("vi-VN")}{" "}
                      {new Date(prompt.created_at).toLocaleTimeString("vi-VN")}
                    </span>
                  </div>
                  <p className="text-sm text-[#AAA] line-clamp-2">
                    {prompt.prompt_en}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => copyPrompt(prompt.prompt_en, prompt.id)}
                    className="p-2 bg-[#1A1A1A] text-[#888] rounded hover:bg-[#F27D26]/20 hover:text-[#F27D26] transition-colors"
                  >
                    {copiedId === prompt.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deletePrompt(prompt.id)}
                    className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
