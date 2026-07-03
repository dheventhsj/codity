import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface AppState {
  token: string | null;
  user: { id: string; email: string; name: string } | null;
  organization: Organization | null;
  project: Project | null;
  notifications: Notification[];
  commandPaletteOpen: boolean;
  setAuth: (token: string, user: AppState['user'], org?: Organization | null) => void;
  setOrganization: (org: Organization | null) => void;
  setProject: (project: Project | null) => void;
  logout: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      organization: null,
      project: null,
      notifications: [],
      commandPaletteOpen: false,
      setAuth: (token, user, org) =>
        set({ token, user, organization: org ?? null }),
      setOrganization: (organization) => set({ organization }),
      setProject: (project) => set({ project }),
      logout: () =>
        set({
          token: null,
          user: null,
          organization: null,
          project: null,
          notifications: [],
        }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      addNotification: (n) =>
        set((s) => ({ notifications: [n, ...s.notifications].slice(0, 50) })),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
    }),
    { name: 'codity-app' }
  )
);
