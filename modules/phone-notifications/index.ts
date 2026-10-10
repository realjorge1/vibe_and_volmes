import { requireOptionalNativeModule } from 'expo';

export interface ChannelSpec {
  id: string;
  name: string;
  description: string;
}

/** A bundled photo (asset uri + subject) or a drawn monogram. */
export interface ImageSpec {
  uri?: string;
  focusX?: number;
  focusY?: number;
  text?: string;
  bg?: string;
  fg?: string;
}

export interface NotificationSpec {
  id: number;
  channelId: string;
  smallIcon: 'chirp' | 'vibegram' | 'toktalk' | 'pulsenews' | 'career';
  color?: string;
  title: string;
  body: string;
  subText?: string;
  largeIcon?: ImageSpec;
  picture?: ImageSpec;
  group?: string;
  link: string;
  whenMs?: number;
  summaryId?: number;
  summaryTitle?: string;
  summaryLines?: string[];
  summaryLink?: string;
}

interface PhoneNotificationsNative {
  areEnabled(): boolean;
  ensureChannels(channels: ChannelSpec[]): void;
  post(spec: NotificationSpec): Promise<void>;
  cancel(ids: number[]): void;
  cancelAll(): void;
}

/**
 * The native side is Android-only and needs a dev build that includes it.
 * Null anywhere else (an older build, iOS, web, tests): callers fall back to
 * the in-app banner.
 */
export const PhoneNotifications = requireOptionalNativeModule<PhoneNotificationsNative>('PhoneNotifications');
