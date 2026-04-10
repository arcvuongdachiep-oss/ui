import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Trash2 } from "lucide-react";
import Image from "next/image";
import { PromptHistoryItem } from "@/lib/types";

interface PromptHistoryProps {
  items: PromptHistoryItem[];
  onSelectHistory: (item: PromptHistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  isLoading: boolean;
}

export function PromptHistory({
  items,
  onSelectHistory,
  onDeleteHistory,
  isLoading,
}: PromptHistoryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="py-4 px-4 text-center text-[11px] text-[#666]">
        Dang tai lich su...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-4 px-4 text-center text-[11px] text-[#666]">
        Khong co lich su nao. Hay tao mot prompt de bat dau!
      </div>
    );
  }

  return (
    <div className="space-y-3 py-4">
      <div className="px-4">
        <h3 className="text-[10px] uppercase tracking-wider font-bold text-[#888] mb-3">
          LICH SU TAO ({items.length}/10)
        </h3>
      </div>

      {/* Horizontal scrolling container */}
      <div className="px-4 overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-min">
          <AnimatePresence>
            {(items || []).map((item, index) => {
              // Null check to prevent crashes
              if (!item || !item.id) return null;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex-shrink-0"
                >
                  <div
                    className="relative group cursor-pointer"
                    onMouseEnter={() => {
                      setHoveredId(item.id);
                      setTooltipContent(item.prompt?.substring(0, 150) || "");
                    }}
                    onMouseLeave={() => {
                      setHoveredId(null);
                      setTooltipContent(null);
                    }}
                    onClick={() => {
                      if (!item) return;
                      onSelectHistory(item);
                    }}
                  >
                    {/* Card - increased size to 100x120px */}
                    <div className="p-3 rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#F27D26] hover:bg-[#111] hover:scale-105 transition-all duration-200 w-[100px] flex flex-col items-center gap-2">
                      {/* Image thumbnails - increased to 60x60px */}
                      <div className="flex gap-2">
                        {item.base_image_url ? (
                          <div className="relative w-[60px] h-[60px] rounded-lg overflow-hidden border border-[#333] hover:border-[#F27D26]/50 transition-colors">
                            <Image
                              src={item.base_image_url}
                              alt="Base"
                              fill
                              className="object-cover"
                              sizes="60px"
                              priority={false}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[6px] text-center py-0.5 text-[#999]">
                              BASE
                            </div>
                          </div>
                        ) : (
                          <div className="w-[60px] h-[60px] rounded-lg border border-dashed border-[#333] flex items-center justify-center">
                            <span className="text-[8px] text-[#555]">No img</span>
                          </div>
                        )}
                      </div>

                      {/* Prompt preview - truncated text */}
                      <p className="text-[8px] text-[#888] text-center line-clamp-2 w-full px-1 leading-tight">
                        {item.prompt ? (item.prompt.length > 30 ? item.prompt.substring(0, 30) + "..." : item.prompt) : "No prompt"}
                      </p>
                      
                      {/* Timestamp */}
                      <p className="text-[7px] text-[#555]">
                        {item.created_at ? new Date(item.created_at).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : ""}
                      </p>
                    </div>

                    {/* Hover tooltip */}
                    {hoveredId === item.id && tooltipContent && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-[#1A1A1A] border border-[#333] rounded-lg p-3 max-w-[250px] shadow-xl"
                      >
                        <p className="text-[10px] text-[#CCC] line-clamp-5 leading-relaxed">
                          {tooltipContent}
                        </p>
                        <div className="text-[8px] text-[#666] mt-2 pt-2 border-t border-[#333]">
                          Click de dien lai vao form
                        </div>
                      </motion.div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.id) onDeleteHistory(item.id);
                      }}
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-600 p-1.5 rounded-full shadow-lg"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
