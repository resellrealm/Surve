import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
}

interface ToastState {
  current: ToastItem | null;
  queue: ToastItem[];
}

interface ToastActions {
  show: (item: Omit<ToastItem, 'id'>) => void;
  dismiss: () => void;
  _advance: () => void;
}

let nextId = 0;

export const useToastStore = create<ToastState & ToastActions>((set, get) => ({
  current: null,
  queue: [],

  show: (item) => {
    const toast: ToastItem = { ...item, id: String(++nextId) };
    const { current } = get();
    if (!current) {
      set({ current: toast });
    } else {
      set((s) => ({ queue: [...s.queue, toast] }));
    }
  },

  dismiss: () => {
    get()._advance();
  },

  _advance: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ current: next, queue: rest });
    } else {
      set({ current: null });
    }
  },
}));

export const toast = {
  success: (message: string, duration = 3000, action?: ToastAction) =>
    useToastStore.getState().show({ message, variant: 'success', duration, action }),
  error: (message: string, duration = 4000, action?: ToastAction) =>
    useToastStore.getState().show({ message, variant: 'error', duration, action }),
  warning: (message: string, duration = 3500, action?: ToastAction) =>
    useToastStore.getState().show({ message, variant: 'warning', duration, action }),
  info: (message: string, duration = 3000, action?: ToastAction) =>
    useToastStore.getState().show({ message, variant: 'info', duration, action }),
};
