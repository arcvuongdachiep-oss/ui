"use client";

import { motion } from "motion/react";
import { Zap, TrendingDown } from "lucide-react";
import type { TokenEstimate } from "@/lib/image-optimizer";
import { formatTokens } from "@/lib/image-optimizer";

interface TokenDisplayProps {
  estimate: TokenEstimate | null;
  savings: number;
  isOptimizing: boolean;
}

export function TokenDisplay({ estimate, savings, isOptimizing }: TokenDisplayProps) {
  if (!estimate && !isOptimizing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-3 rounded-xl bg-black/50 border border-[#1A1A1A]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#F27D26]/10">
            <Zap className="w-3.5 h-3.5 text-[#F27D26]" />
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-[#666] font-bold">
              Token Estimate
            </p>
            {isOptimizing ? (
              <p className="text-[11px] font-bold text-[#888]">Optimizing...</p>
            ) : estimate ? (
              <p className="text-[12px] font-black text-[#E4E3E0]">
                ~{formatTokens(estimate.totalTokens)} tokens
              </p>
            ) : null}
          </div>
        </div>

        {savings > 0 && !isOptimizing && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <TrendingDown className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400">
              -{savings}%
            </span>
          </div>
        )}
      </div>

      {estimate && !isOptimizing && (
        <div className="mt-2 pt-2 border-t border-[#1A1A1A] grid grid-cols-2 gap-2">
          <div>
            <p className="text-[7px] uppercase tracking-wider text-[#555]">Images</p>
            <p className="text-[10px] font-bold text-[#888]">
              {formatTokens(estimate.imageTokens)}
            </p>
          </div>
          <div>
            <p className="text-[7px] uppercase tracking-wider text-[#555]">Prompt</p>
            <p className="text-[10px] font-bold text-[#888]">
              {formatTokens(estimate.promptTokens)}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}