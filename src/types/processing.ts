export type ProcessingStatus = 'processing' | 'ready' | 'failed';

export type RetainedFrame = {
  frameId: string;
  thumbnailUrl: string;
  timestamp: number;
};

export type ProcessingError = {
  code: string;
  message: string;
};

export type ProcessingManifest = {
  createdAt: string;
  duration: number;
  error: ProcessingError | null;
  frames: RetainedFrame[];
  jobId: string;
  rejectedBlurCount: number;
  rejectedDuplicateCount: number;
  retainedFrameCount: number;
  status: ProcessingStatus;
  sweepId: number;
  totalFramesSampled: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
}

function parseFrame(value: unknown): RetainedFrame {
  if (
    !isRecord(value) ||
    typeof value.frameId !== 'string' ||
    !isNonNegativeNumber(value.timestamp) ||
    typeof value.thumbnailUrl !== 'string'
  ) {
    throw new Error('The processing service returned an invalid frame.');
  }

  return {
    frameId: value.frameId,
    thumbnailUrl: value.thumbnailUrl,
    timestamp: value.timestamp,
  };
}

export function parseProcessingManifest(value: unknown): ProcessingManifest {
  if (!isRecord(value)) {
    throw new Error('The processing service returned an invalid response.');
  }

  const status = value.status;
  const error = value.error;
  if (
    (status !== 'processing' && status !== 'ready' && status !== 'failed') ||
    typeof value.createdAt !== 'string' ||
    !isNonNegativeNumber(value.duration) ||
    !Array.isArray(value.frames) ||
    typeof value.jobId !== 'string' ||
    !isNonNegativeInteger(value.rejectedBlurCount) ||
    !isNonNegativeInteger(value.rejectedDuplicateCount) ||
    !isNonNegativeInteger(value.retainedFrameCount) ||
    !isNonNegativeInteger(value.sweepId) ||
    value.sweepId <= 0 ||
    !isNonNegativeInteger(value.totalFramesSampled) ||
    !(
      error === null ||
      (isRecord(error) &&
        typeof error.code === 'string' &&
        typeof error.message === 'string')
    )
  ) {
    throw new Error('The processing service returned an invalid response.');
  }

  const frames = value.frames.map(parseFrame);
  if (value.retainedFrameCount !== frames.length) {
    throw new Error('The processing frame count is inconsistent.');
  }

  return {
    createdAt: value.createdAt,
    duration: value.duration,
    error:
      error === null
        ? null
        : {
            code: error.code as string,
            message: error.message as string,
          },
    frames,
    jobId: value.jobId,
    rejectedBlurCount: value.rejectedBlurCount,
    rejectedDuplicateCount: value.rejectedDuplicateCount,
    retainedFrameCount: value.retainedFrameCount,
    status,
    sweepId: value.sweepId,
    totalFramesSampled: value.totalFramesSampled,
  };
}
