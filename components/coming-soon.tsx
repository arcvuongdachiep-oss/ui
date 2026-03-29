"use client";

import { motion } from "motion/react";
import { Clock } from "lucide-react";

export function ComingSoonTab({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", damping: 20 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F27D26]/20 to-yellow-500/20 border border-[#F27D26]/30 flex items-center justify-center"
        >
          <Clock className="w-12 h-12 text-[#F27D26]" />
        </motion.div>

        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-3 bg-gradient-to-r from-[#F27D26] to-yellow-400 bg-clip-text text-transparent">
          Coming Soon
        </h2>

        <p className="text-lg md:text-xl font-bold text-white/90 mb-2">
          {title}
        </p>

        <p className="text-sm text-[#888] leading-relaxed mb-8">
          {description}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A]">
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-[#F27D26]"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 1,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-widest text-[#666] font-bold">
            Dang phat trien
          </span>
        </div>
      </div>
    </motion.div>
  );
}
