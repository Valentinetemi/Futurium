import type { SweepStatus } from '@/database/sweep-model';

export function formatSweepDuration(durationSeconds: number) {
  const safeDuration = Math.max(0, Math.round(durationSeconds));
  const minutes = Math.floor(safeDuration / 60);
  const seconds = safeDuration % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatSweepDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatSweepTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable';
  }

  return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(
    date,
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatSweepDay(createdAt: string, now = new Date()) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return 'Undated';
  }

  const dayDifference = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );

  if (dayDifference === 0) {
    return 'Today';
  }

  if (dayDifference === 1) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  }).format(date);
}

export function getSweepStatusLabel(status: SweepStatus) {
  const labels: Record<SweepStatus, string> = {
    failed: 'Needs attention',
    processing: 'Preparing',
    ready: 'Moments ready',
    saved: 'Saved',
    uploading: 'Sending',
  };

  return labels[status];
}

// Display only: stored room names are never rewritten.
export function formatRoomName(roomName: string) {
  const trimmed = roomName.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return 'Untitled room';
  }

  const hasLowercase = trimmed !== trimmed.toUpperCase();
  const base = hasLowercase ? trimmed : trimmed.toLowerCase();

  return base.charAt(0).toUpperCase() + base.slice(1);
}
