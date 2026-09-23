export const SWEEP_STATUSES = [
  'saved',
  'processing',
  'ready',
  'failed',
] as const;

export type SweepStatus = (typeof SWEEP_STATUSES)[number];

export type Sweep = {
  createdAt: string;
  durationSeconds: number;
  id: number;
  roomName: string;
  status: SweepStatus;
  videoUri: string;
};

export type CreateSweepInput = {
  createdAt?: string;
  durationSeconds: number;
  roomName: string;
  status?: SweepStatus;
  videoUri: string;
};

export type SweepRow = {
  createdAt: string;
  durationSeconds: number;
  id: number;
  roomName: string;
  status: string;
  videoUri: string;
};

export function isSweepStatus(value: string): value is SweepStatus {
  return SWEEP_STATUSES.some((status) => status === value);
}

export function mapSweepRow(row: SweepRow): Sweep {
  return {
    createdAt: row.createdAt,
    durationSeconds: Number(row.durationSeconds),
    id: Number(row.id),
    roomName: row.roomName,
    status: isSweepStatus(row.status) ? row.status : 'failed',
    videoUri: row.videoUri,
  };
}

export function normalizeCreateSweepInput(
  input: CreateSweepInput,
): Required<CreateSweepInput> {
  const roomName = input.roomName.trim();
  const videoUri = input.videoUri.trim();
  const durationSeconds = Math.round(input.durationSeconds);
  const createdAt = input.createdAt
    ? new Date(input.createdAt).toISOString()
    : new Date().toISOString();

  if (!roomName || roomName.length > 80) {
    throw new Error('Room name must contain between 1 and 80 characters.');
  }

  if (!videoUri) {
    throw new Error('A local video URI is required.');
  }

  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 0 ||
    durationSeconds > 30
  ) {
    throw new Error('Sweep duration must be between 0 and 30 seconds.');
  }

  return {
    createdAt,
    durationSeconds,
    roomName,
    status: input.status ?? 'saved',
    videoUri,
  };
}
