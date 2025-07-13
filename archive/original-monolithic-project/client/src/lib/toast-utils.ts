import { toast as toastFn } from "@/hooks/use-toast";
import { getMessage } from '@shared/utils/i18n-hierarchical';

/**
 * Unified toast utility with consistent defaults
 * Use this instead of calling toast() directly
 */

const DEFAULT_DURATION = 5000; // 5 seconds

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
  action?: React.ReactNode;
}

export const toast = {
  success(options: Omit<ToastOptions, "variant">) {
    toastFn({
      ...options,
      variant: "default",
      duration: options.duration ?? DEFAULT_DURATION,
    });
  },

  error(options: Omit<ToastOptions, "variant">) {
    toastFn({
      ...options,
      variant: "destructive",
      duration: options.duration ?? DEFAULT_DURATION,
    });
  },

  info(options: Omit<ToastOptions, "variant">) {
    toastFn({
      ...options,
      variant: "default",
      duration: options.duration ?? DEFAULT_DURATION,
    });
  },

  // For custom cases
  custom(options: ToastOptions) {
    toastFn({
      ...options,
      duration: options.duration ?? DEFAULT_DURATION,
    });
  }
};

// Common toast messages using i18n
export const toastMessages = {
  invitationsSent: (count: number) => ({
    title: getMessage('common.toast.invitations.sent'),
    description: getMessage('common.toast.invitations.sent_count', { count })
  }),
  
  invitationsFailed: (error: string) => ({
    title: getMessage('common.toast.invitations.failed'),
    description: error
  }),

  saveFailed: (error: string) => ({
    title: getMessage('common.toast.save.failed'),
    description: error
  }),

  saveSuccess: (item: string) => ({
    title: getMessage('common.toast.save.success'),
    description: getMessage('common.toast.save.success_item', { item })
  }),

  deleteFailed: (error: string) => ({
    title: getMessage('common.toast.delete.failed'), 
    description: error
  }),

  deleteSuccess: (item: string) => ({
    title: getMessage('common.toast.delete.success'),
    description: getMessage('common.toast.delete.success_item', { item })
  }),

  recordingStarted: () => ({
    title: getMessage('common.toast.recording.started'),
    description: getMessage('common.status.loading') // Using existing message for now
  }),

  recordingSaved: () => ({
    title: getMessage('common.toast.recording.saved'),
    description: getMessage('common.toast.recording.saved') // Using same message for now
  }),

  recordingFailed: (error: string) => ({
    title: getMessage('common.toast.recording.failed'),
    description: error
  }),

  videoGenerationStarted: () => ({
    title: getMessage('common.toast.video.generation_started'),
    description: getMessage('common.status.processing') // Using existing message for now
  }),

  videoGenerationComplete: () => ({
    title: getMessage('common.toast.video.generation_complete'),
    description: getMessage('common.toast.video.generation_complete') // Using same message for now
  }),

  videoGenerationFailed: (error: string) => ({
    title: getMessage('common.toast.video.generation_failed'),
    description: error
  }),

  narrationGenerating: () => ({
    title: getMessage('common.toast.narration.generating'),
    description: getMessage('common.status.processing') // Using existing message for now
  }),

  narrationComplete: () => ({
    title: getMessage('common.toast.narration.complete'),
    description: getMessage('common.toast.narration.complete') // Using same message for now
  }),

  narrationFailed: (error: string) => ({
    title: getMessage('common.toast.narration.failed'),
    description: error
  }),

  uploadComplete: (fileName: string) => ({
    title: getMessage('common.toast.upload.complete'),
    description: `${fileName} uploaded successfully`
  }),

  uploadFailed: (error: string) => ({
    title: getMessage('common.toast.upload.failed'),
    description: error
  }),

  loginRequired: () => ({
    title: getMessage('common.toast.auth.login_required'),
    description: getMessage('common.toast.auth.login_required') // Using same message for now
  }),

  permissionDenied: () => ({
    title: getMessage('common.toast.auth.permission_denied'),
    description: getMessage('common.toast.auth.permission_denied') // Using same message for now
  }),

  networkError: () => ({
    title: getMessage('common.toast.network.error'),
    description: getMessage('common.toast.network.error') // Using same message for now
  }),

  genericError: () => ({
    title: getMessage('common.errors.generic'),
    description: getMessage('common.errors.generic')
  }),

  copied: (text: string) => ({
    title: "Copied!", // Still hardcoded for now, can add to i18n later
    description: `${text} copied to clipboard`
  }),

  loading: (action: string) => ({
    title: getMessage('common.status.loading'),
    description: `${action} in progress`
  })
};