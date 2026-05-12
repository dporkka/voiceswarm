"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  theme: "dark" | "light" | "system";
  activeModal: string | null;
  terminalOpen: boolean;
  chatOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelContent: "chat" | "terminal" | "details" | null;
  toggleSidebar: () => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setTerminalOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setRightPanel: (open: boolean, content?: UIState["rightPanelContent"]) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: "dark",
      activeModal: null,
      terminalOpen: false,
      chatOpen: false,
      rightPanelOpen: false,
      rightPanelContent: null,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),
      setTerminalOpen: (open) => set({ terminalOpen: open }),
      setChatOpen: (open) => set({ chatOpen: open }),
      setRightPanel: (open, content) =>
        set({ rightPanelOpen: open, rightPanelContent: content }),
    }),
    {
      name: "aasop-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
