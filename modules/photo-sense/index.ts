import { requireOptionalNativeModule } from 'expo';

/** One thing ML Kit sees in the photo ("Dog", "Selfie", "Screenshot"...). */
export interface SenseLabel {
  text: string;
  confidence: number;
}

/** A face box, as fractions of the photo (0..1). */
export interface SenseFace {
  x: number;
  y: number;
  w: number;
  h: number;
  smile?: number | null;
}

/** How much text sits on the photo and where (never the words themselves). */
export interface SenseText {
  chars: number;
  lines: number;
  blocks: number;
  /** Share of the picture covered by text blocks. */
  coverage: number;
  /** Share of the text in the top third / bottom third (meme captions). */
  top: number;
  bottom: number;
}

export interface SenseResult {
  ok: boolean;
  w?: number;
  h?: number;
  /** Null when that model wasn't ready on the phone yet. */
  labels?: SenseLabel[] | null;
  faces?: SenseFace[] | null;
  text?: SenseText | null;
}

export interface CameraInfo {
  ok: boolean;
  camera?: boolean;
  front?: boolean;
}

interface PhotoSenseNative {
  prepare(): Promise<boolean>;
  analyze(uri: string): Promise<SenseResult>;
  camera(uri: string): Promise<CameraInfo>;
}

/**
 * On-device photo reading (Android, ML Kit via Play services). Null anywhere
 * else (an older build, iOS, web, tests): the game then reads the caption and
 * the file's details instead.
 */
export const PhotoSense = requireOptionalNativeModule<PhotoSenseNative>('PhotoSense');
