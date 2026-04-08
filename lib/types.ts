import type { ReactNode } from 'react';

export type ModeId = 'strict' | 'creative' | 'cinematic' | 'random';

export type TabId = 'ai-prompt' | 'd5-tutorial' | 'showcase' | 'library';

export interface ModeConfig {
  id: ModeId;
  title: string;
  subtitle: string;
  description: string;
  icon: ReactNode;
  color: string;
}

export interface PromptResult {
  baseImage: string;
  prompt: string;
  vietnamese: string;
  label?: string;
}
