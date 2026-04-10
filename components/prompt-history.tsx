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
        <h3 className="text-[9px] uppercase tracking-wider font-bold text-[#888] mb-3">
          Lich su tao ({items.length}/10)
        </h3>
      </div>

      {/* Horizontal scrolling container */}
      <div className="px-4 overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-min">
          <AnimatePresence>
            {items.map((item, index) => (
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
                    setTooltipContent(item.prompt.substring(0, 100));
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    setTooltipContent(null);
                  }}
                  onClick={() => onSelectHistory(item)}
                >
                  {/* Card */}
                  <div className="p-2 rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#F27D26]/50 hover:bg-[#111] transition-all w-20 h-20 flex flex-col items-center justify-center gap-1">
                    {/* Image thumbnails */}
                    <div className="flex gap-1">
                      {item.base_image_url && (
                        <div className="relative w-5 h-5 rounded overflow-hidden border border-[#222]">
                          <Image
                            src={item.base_image_url}
                            alt="Base"
                            fill
                            className="object-cover"
                            sizes="20px"
                            priority={false}
                          />
                        </div>
                      )}
                      {item.ref_image_url && (
                        <div className="relative w-5 h-5 rounded overflow-hidden border border-[#222]">
                          <Image
                            src={item.ref_image_url}
                            alt="Ref"
                            fill
                            className="object-cover"
                            sizes="20px"
                            priority={false}
                          />
                        </div>
                      )}
                    </div>

                    {/* Prompt preview */}
                    <p className="text-[7px] text-[#666] text-center line-clamp-2 max-w-full">
                      {item.prompt.substring(0, 20)}...
                    </p>
                  </div>

                  {/* Hover tooltip */}
                  {hoveredId === item.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-[#1A1A1A] border border-[#222] rounded-lg p-2 max-w-xs"
                    >
                      <p className="text-[9px] text-[#AAA] line-clamp-4">
                        {tooltipContent}
                      </p>
                      <div className="text-[7px] text-[#666] mt-1">
                        {new Date(item.created_at).toLocaleString("vi-VN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHistory(item.id);
                    }}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-600 p-1 rounded-full"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
