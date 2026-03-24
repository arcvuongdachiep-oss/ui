"use client";

import { motion } from "motion/react";
import { ShieldCheck, Zap, Film, ArrowRight } from "lucide-react";
import type { ModeId, ModeConfig } from "@/lib/types";

export const MODES: ModeConfig[] = [
  {
    id: "strict",
    title: "STRICT MODE",
    subtitle: "LOCK FORM ABSOLUTELY",
    description:
      "Preserve 100% massing and camera angle from Sketchup/Revit. Only apply materials and lighting.",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "#10B981",
  },
  {
    id: "creative",
    title: "CREATIVE MODE",
    subtitle: "CONTROLLED TRANSFORMATION",
    description:
      "Keep the original spirit but allow geometry cleanup and facade optimization.",
    icon: <Zap className="w-6 h-6" />,
    color: "#F59E0B",
  },
  {
    id: "cinematic",
    title: "CINEMATIC MODE",
    subtitle: "DRAMATIC TRANSFORMATION",
    description:
      "Transform the building into a cinematic film still with storytelling lighting.",
    icon: <Film className="w-6 h-6" />,
    color: "#EF4444",
  },
];

interface ModeSelectorProps {
  onSelectMode: (mode: ModeId) => void;
}

export function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto py-12 md:py-20 space-y-12 px-4"
    >
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic text-balance">
            Select Your Vision
          </h2>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[#666] uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs font-bold"
        >
          Choose a scientific script before configuring assets
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {MODES.map((mode, index) => (
          <motion.button
            key={mode.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
            onClick={() => onSelectMode(mode.id)}
            className="group relative bg-[#0A0A0A] border border-[#1A1A1A] p-6 md:p-8 rounded-2xl text-left hover:border-[#F27D26]/50 transition-all hover:translate-y-[-4px] flex flex-col h-full"
          >
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${mode.color}10 0%, transparent 70%)`,
              }}
            />
            <div
              className="relative mb-6 p-4 rounded-xl bg-black border border-[#1A1A1A] w-fit group-hover:scale-110 transition-transform duration-300"
              style={{ color: mode.color }}
            >
              {mode.icon}
            </div>
            <div className="relative space-y-2 flex-1">
              <h3 className="text-lg md:text-xl font-black tracking-tighter uppercase italic">
                {mode.title}
              </h3>
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">
                {mode.subtitle}
              </p>
              <p className="text-sm text-[#666] leading-relaxed pt-4">
                {mode.description}
              </p>
            </div>
            <div className="relative mt-6 md:mt-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F27D26] opacity-0 group-hover:opacity-100 transition-opacity">
              Select Mode <ArrowRight size={12} />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}