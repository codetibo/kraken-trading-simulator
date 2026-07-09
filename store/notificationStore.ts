import { create } from 'zustand';
import { toast } from 'sonner';

export type NotificationType =
  | 'order_filled'
  | 'order_cancelled'
  | 'position_closed'
  | 'position_liquidated'
  | 'margin_call'
  | 'stop_loss_triggered'
  | 'take_profit_triggered'
  | 'info'
  | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  timestamp: number;
}

interface NotificationState {
  /** History of recent notifications (up to 50). */
  history: Notification[];

  /** Add a notification and display it as a Sonner toast. */
  notify: (type: NotificationType, title: string, description?: string) => void;

  /** Clear all notification history. */
  clearHistory: () => void;
}

const TYPE_STYLES: Record<NotificationType, { variant: 'success' | 'error' | 'info' | 'warning'; icon: string }> = {
  order_filled: { variant: 'success', icon: '✅' },
  order_cancelled: { variant: 'info', icon: '❌' },
  position_closed: { variant: 'info', icon: '📊' },
  position_liquidated: { variant: 'error', icon: '💀' },
  margin_call: { variant: 'warning', icon: '⚠️' },
  stop_loss_triggered: { variant: 'warning', icon: '🛑' },
  take_profit_triggered: { variant: 'success', icon: '💰' },
  info: { variant: 'info', icon: 'ℹ️' },
  error: { variant: 'error', icon: '🚨' },
};

let counter = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  history: [],

  notify: (type, title, description) => {
    counter += 1;
    const notification: Notification = {
      id: `notif-${counter}-${Date.now()}`,
      type,
      title,
      description,
      timestamp: Date.now(),
    };

    // Add to history, keep last 50
    set((state) => ({
      history: [notification, ...state.history].slice(0, 50),
    }));

    // Show Sonner toast
    const style = TYPE_STYLES[type];
    const displayTitle = `${style.icon} ${title}`;

    switch (style.variant) {
      case 'success':
        toast.success(displayTitle, { description });
        break;
      case 'error':
        toast.error(displayTitle, { description });
        break;
      case 'warning':
        toast.warning(displayTitle, { description });
        break;
      case 'info':
      default:
        toast.info(displayTitle, { description });
        break;
    }
  },

  clearHistory: () => set({ history: [] }),
}));
