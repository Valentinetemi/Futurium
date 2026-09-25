import { getProcessingThumbnailUrl } from '@/lib/processing-api';

export function safeThumbnailUrl(path: string) {
  try {
    return getProcessingThumbnailUrl(path);
  } catch {
    return null;
  }
}

export function formatMomentTime(timestamp: number) {
  const wholeSeconds = Math.max(0, Math.floor(timestamp));
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
