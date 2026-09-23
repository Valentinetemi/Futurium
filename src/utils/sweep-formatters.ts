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

export function getSweepStatusLabel(status: SweepStatus) {
  const labels: Record<SweepStatus, string> = {
    failed: 'Needs attention',
    processing: 'Processing',
    ready: 'Ready',
    saved: 'Saved memory',
    uploading: 'Uploading',
  };

  return labels[status];
}
