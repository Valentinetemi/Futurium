import {
  parseProcessingManifest,
  type ProcessingManifest,
} from '@/types/processing';

type ApiErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

export class ProcessingApiError extends Error {
  constructor(
    message: string,
    readonly code = 'request_failed',
  ) {
    super(message);
    this.name = 'ProcessingApiError';
  }
}

export function getProcessingApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!configuredUrl) {
    throw new ProcessingApiError(
      'Set EXPO_PUBLIC_API_BASE_URL before uploading. On a physical phone, use your Mac’s LAN IP address.',
      'api_url_missing',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new ProcessingApiError(
      'EXPO_PUBLIC_API_BASE_URL must be a valid HTTP or HTTPS URL.',
      'api_url_invalid',
    );
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new ProcessingApiError(
      'EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS.',
      'api_url_invalid',
    );
  }

  return parsedUrl.toString().replace(/\/$/, '');
}

function getUploadMetadata(videoUri: string) {
  const cleanUri = videoUri.toLowerCase().split(/[?#]/, 1)[0] ?? '';

  if (cleanUri.endsWith('.mov')) {
    return { name: 'room-sweep.mov', type: 'video/quicktime' };
  }
  if (cleanUri.endsWith('.webm')) {
    return { name: 'room-sweep.webm', type: 'video/webm' };
  }
  if (cleanUri.endsWith('.m4v')) {
    return { name: 'room-sweep.m4v', type: 'video/x-m4v' };
  }
  return { name: 'room-sweep.mp4', type: 'video/mp4' };
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (
      typeof payload.error?.code === 'string' &&
      typeof payload.error.message === 'string'
    ) {
      return new ProcessingApiError(payload.error.message, payload.error.code);
    }
  } catch {
    // Fall through to a status-based message if the service did not return JSON.
  }

  return new ProcessingApiError(
    `The processing service returned HTTP ${response.status}.`,
    'http_error',
  );
}

async function readManifest(response: Response) {
  if (!response.ok) {
    throw await readApiError(response);
  }

  return parseProcessingManifest((await response.json()) as unknown);
}

export async function uploadSweepForProcessing(
  sweepId: number,
  videoUri: string,
): Promise<ProcessingManifest> {
  const formData = new FormData();
  const upload = { uri: videoUri, ...getUploadMetadata(videoUri) };
  formData.append('sweep_id', String(sweepId));
  formData.append('video', upload as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${getProcessingApiBaseUrl()}/sweeps`, {
      body: formData,
      method: 'POST',
    });
  } catch {
    throw new ProcessingApiError(
      'The processing service could not be reached. On a physical phone, confirm the API uses your Mac’s LAN IP and both devices share a network.',
      'network_error',
    );
  }

  return readManifest(response);
}

export async function getSweepProcessing(
  jobId: string,
): Promise<ProcessingManifest> {
  let response: Response;
  try {
    response = await fetch(
      `${getProcessingApiBaseUrl()}/sweeps/${encodeURIComponent(jobId)}`,
    );
  } catch {
    throw new ProcessingApiError(
      'The processing service could not be reached. Processing can be checked again when the service is available.',
      'network_error',
    );
  }

  return readManifest(response);
}

export function getProcessingThumbnailUrl(thumbnailPath: string) {
  if (!thumbnailPath.startsWith('/') || thumbnailPath.startsWith('//')) {
    throw new ProcessingApiError(
      'The processing service returned an invalid thumbnail URL.',
      'thumbnail_url_invalid',
    );
  }

  return `${getProcessingApiBaseUrl()}${thumbnailPath}`;
}
