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

type ResponseLike = {
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
};

export type ProcessingFetch = (
  input: string | URL,
  init?: {
    body?: BodyInit | null;
    method?: string;
  },
) => Promise<ResponseLike>;

export type LocalUploadFile = Blob & {
  exists: boolean;
  name: string;
  size: number;
};

export type UploadDiagnostic = {
  apiBaseUrl: string;
  errorMessage: string;
  errorName: string;
  localFileExists: boolean;
  localFileSize: number;
};

export type UploadDependencies = {
  createFile(uri: string): LocalUploadFile;
  fetch: ProcessingFetch;
  isDevelopment: boolean;
  logDiagnostic?(diagnostic: UploadDiagnostic): void;
};

export class ProcessingApiError extends Error {
  constructor(
    message: string,
    readonly code = 'request_failed',
    options?: ErrorOptions,
  ) {
    super(message, options);
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
  } catch (error) {
    throw new ProcessingApiError(
      'EXPO_PUBLIC_API_BASE_URL must be a valid HTTP or HTTPS URL.',
      'api_url_invalid',
      { cause: error },
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

function getUploadFilename(videoUri: string) {
  const cleanUri = videoUri.toLowerCase().split(/[?#]/, 1)[0] ?? '';

  if (cleanUri.endsWith('.mov')) {
    return 'room-sweep.mov';
  }
  if (cleanUri.endsWith('.webm')) {
    return 'room-sweep.webm';
  }
  if (cleanUri.endsWith('.m4v')) {
    return 'room-sweep.m4v';
  }
  return 'room-sweep.mp4';
}

function safeErrorDetails(error: unknown, privateUri: string) {
  const name = error instanceof Error ? error.name : 'UnknownError';
  const rawMessage = error instanceof Error ? error.message : String(error);
  const messageWithoutExactUri = rawMessage.replaceAll(
    privateUri,
    '[local file]',
  );
  const message = messageWithoutExactUri.replace(
    /file:\/\/\/[^\s"')]+/gi,
    '[local file]',
  );

  return { message, name };
}

function createUploadDiagnostic(
  error: unknown,
  apiBaseUrl: string,
  videoUri: string,
  localFileExists: boolean,
  localFileSize: number,
): UploadDiagnostic {
  const details = safeErrorDetails(error, videoUri);
  return {
    apiBaseUrl,
    errorMessage: details.message,
    errorName: details.name,
    localFileExists,
    localFileSize,
  };
}

async function readApiError(response: ResponseLike) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (
      typeof payload.error?.code === 'string' &&
      typeof payload.error.message === 'string'
    ) {
      return new ProcessingApiError(payload.error.message, payload.error.code);
    }
  } catch (error) {
    return new ProcessingApiError(
      `The processing service returned HTTP ${response.status}.`,
      'http_error',
      { cause: error },
    );
  }

  return new ProcessingApiError(
    `The processing service returned HTTP ${response.status}.`,
    'http_error',
  );
}

async function readManifest(response: ResponseLike) {
  if (!response.ok) {
    throw await readApiError(response);
  }

  return parseProcessingManifest(await response.json());
}

export async function uploadSweepWithDependencies(
  sweepId: number,
  videoUri: string,
  dependencies: UploadDependencies,
): Promise<ProcessingManifest> {
  const apiBaseUrl = getProcessingApiBaseUrl();
  let localFile: LocalUploadFile;

  try {
    localFile = dependencies.createFile(videoUri);
  } catch (error) {
    const diagnostic = createUploadDiagnostic(
      error,
      apiBaseUrl,
      videoUri,
      false,
      0,
    );
    if (dependencies.isDevelopment) {
      dependencies.logDiagnostic?.(diagnostic);
    }
    throw new ProcessingApiError(
      dependencies.isDevelopment
        ? `Local video unavailable: ${diagnostic.errorName} — ${diagnostic.errorMessage}`
        : 'The saved video could not be opened on this device.',
      'local_file_unavailable',
      { cause: error },
    );
  }

  const localFileExists = localFile.exists;
  const localFileSize = localFile.size;

  if (!localFileExists) {
    throw new ProcessingApiError(
      'The saved video is no longer available on this device.',
      'local_file_missing',
    );
  }

  if (!Number.isFinite(localFileSize) || localFileSize <= 0) {
    throw new ProcessingApiError(
      'The saved video is empty and cannot be uploaded.',
      'local_file_empty',
    );
  }

  const formData = new FormData();
  formData.append('sweep_id', String(sweepId));
  formData.append('video', localFile, getUploadFilename(videoUri));

  let response: ResponseLike;
  try {
    response = await dependencies.fetch(`${apiBaseUrl}/sweeps`, {
      body: formData,
      method: 'POST',
    });
  } catch (error) {
    const diagnostic = createUploadDiagnostic(
      error,
      apiBaseUrl,
      videoUri,
      localFileExists,
      localFileSize,
    );
    if (dependencies.isDevelopment) {
      dependencies.logDiagnostic?.(diagnostic);
    }

    throw new ProcessingApiError(
      dependencies.isDevelopment
        ? `Upload failed: ${diagnostic.errorName} — ${diagnostic.errorMessage}`
        : 'The processing service could not be reached. Confirm the phone and server are on the same network, then try again.',
      'network_error',
      { cause: error },
    );
  }

  return readManifest(response);
}

export async function getSweepProcessingWithFetch(
  jobId: string,
  fetchImplementation: ProcessingFetch,
): Promise<ProcessingManifest> {
  let response: ResponseLike;
  try {
    response = await fetchImplementation(
      `${getProcessingApiBaseUrl()}/sweeps/${encodeURIComponent(jobId)}`,
    );
  } catch (error) {
    throw new ProcessingApiError(
      'The processing service could not be reached. Processing can be checked again when the service is available.',
      'network_error',
      { cause: error },
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
