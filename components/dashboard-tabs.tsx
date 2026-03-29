"use client";

import { motion } from "motion/react";
import { Zap, BookOpen, Images } from "lucide-react";

interface DashboardTabsProps {
  activeTab: "architect" | "academy" | "showcase";
  onTabChange: (tab: "architect" | "academy" | "showcase") => void;
}

const TABS = [
  {
    id: "architect",
    label: "AI Architect",
    icon: Zap,
    description: "Tạo prompt AI cho kiến trúc",
  },
  {
    id: "academy",
    label: "D5 Academy",
    icon: BookOpen,
    description: "Làm chủ D5 Render cùng Hiep",
  },
  {
    id: "showcase",
    label: "Showcase",
    icon: Images,
    description: "Sản phẩm tiêu biểu D5-AI",
  },
] as const;

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="flex gap-2 md:gap-4 border-b border-[#1A1A1A] sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-40 px-4 md:px-6 py-3 md:py-4">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onTabChange(tab.id as "architect" | "academy" | "showcase")}
            className={`relative flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg font-semibold text-sm md:text-base transition-all ${
              isActive
                ? "text-[#F27D26]"
                : "text-[#666] hover:text-[#888]"
            }`}
            title={tab.description}
          >
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#F27D26] to-yellow-500"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
