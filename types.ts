
export type Resolution = '1K' | '2K' | '4K';

export interface ColoringPage {
  id: string;
  url: string;
  description: string;
}

export interface ColoringBook {
  theme: string;
  childName: string;
  resolution: Resolution;
  pages: ColoringPage[];
  coverUrl: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
