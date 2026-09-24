import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProcessingApiBaseUrl,
  getProcessingThumbnailUrl,
  ProcessingApiError,
  uploadSweepWithDependencies,
  type LocalUploadFile,
  type ProcessingFetch,
  type UploadDependencies,
  type UploadDiagnostic,
} from '@/lib/processing-api-core';
import { parseProcessingManifest } from '@/types/processing';

const processingManifest = {
  createdAt: '2026-09-24T09:00:00Z',
  duration: 3,
  error: null,
  frames: [],
  jobId: '11111111-1111-4111-8111-111111111111',
  rejectedBlurCount: 0,
  rejectedDuplicateCount: 0,
  retainedFrameCount: 0,
  status: 'processing' as const,
  sweepId: 42,
  totalFramesSampled: 0,
};

class TestLocalFile extends Blob implements LocalUploadFile {
  readonly name = 'saved-memory.mov';

  constructor(
    contents: BlobPart[],
    readonly exists = true,
  ) {
    super(contents, { type: 'video/quicktime' });
  }
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

function restoreApiUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = value;
  }
}

function uploadDependencies(
  file: LocalUploadFile,
  fetchImplementation: ProcessingFetch,
  overrides: Partial<UploadDependencies> = {},
): UploadDependencies {
  return {
    createFile: () => file,
    fetch: fetchImplementation,
    isDevelopment: false,
    ...overrides,
  };
}

test('requires an explicit API base URL and never supplies localhost', () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  delete process.env.EXPO_PUBLIC_API_BASE_URL;

  try {
    assert.throws(
      () => getProcessingApiBaseUrl(),
      (error: unknown) =>
        error instanceof ProcessingApiError && error.code === 'api_url_missing',
    );
  } finally {
    restoreApiUrl(previous);
  }
});

test('normalizes the API URL and resolves only server-relative thumbnails', () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.1.25:8000/';

  try {
    assert.equal(getProcessingApiBaseUrl(), 'http://192.168.1.25:8000');
    assert.equal(
      getProcessingThumbnailUrl('/sweeps/job/thumbnails/frame_000001.jpg'),
      'http://192.168.1.25:8000/sweeps/job/thumbnails/frame_000001.jpg',
    );
    assert.throws(() => getProcessingThumbnailUrl('https://example.com/a.jpg'));
  } finally {
    restoreApiUrl(previous);
  }
});

test('rejects a missing local video before making a request', async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.0.2:8000';
  let requestCount = 0;

  try {
    await assert.rejects(
      uploadSweepWithDependencies(
        42,
        'file:///private/saved-memory.mov',
        uploadDependencies(new TestLocalFile([], false), async () => {
          requestCount += 1;
          return jsonResponse(processingManifest, 202);
        }),
      ),
      (error: unknown) =>
        error instanceof ProcessingApiError &&
        error.code === 'local_file_missing',
    );
    assert.equal(requestCount, 0);
  } finally {
    restoreApiUrl(previous);
  }
});

test('rejects a zero-byte local video before making a request', async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.0.2:8000';
  let requestCount = 0;

  try {
    await assert.rejects(
      uploadSweepWithDependencies(
        42,
        'file:///private/saved-memory.mov',
        uploadDependencies(new TestLocalFile([]), async () => {
          requestCount += 1;
          return jsonResponse(processingManifest, 202);
        }),
      ),
      (error: unknown) =>
        error instanceof ProcessingApiError &&
        error.code === 'local_file_empty',
    );
    assert.equal(requestCount, 0);
  } finally {
    restoreApiUrl(previous);
  }
});

test('creates multipart data with the real file and sweep ID', async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.0.2:8000';
  const localFile = new TestLocalFile(['room-video']);
  let requestUrl: string | URL | undefined;
  let requestInit: { body?: BodyInit | null; method?: string } | undefined;

  try {
    const result = await uploadSweepWithDependencies(
      42,
      'file:///private/saved-memory.mov',
      uploadDependencies(localFile, async (input, init) => {
        requestUrl = input;
        requestInit = init;
        return jsonResponse(processingManifest, 202);
      }),
    );

    assert.deepEqual(result, processingManifest);
    assert.equal(requestUrl, 'http://192.168.0.2:8000/sweeps');
    assert.equal(requestInit?.method, 'POST');
    assert.ok(requestInit?.body instanceof FormData);
    assert.equal(requestInit.body.get('sweep_id'), '42');
    const videoPart = requestInit.body.get('video');
    assert.ok(videoPart instanceof Blob);
    assert.equal(videoPart.size, localFile.size);
    assert.equal('name' in videoPart ? videoPart.name : null, 'room-sweep.mov');
    assert.equal('headers' in requestInit, false);
  } finally {
    restoreApiUrl(previous);
  }
});

test('network failure preserves its cause and safe development diagnostic', async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.0.2:8000';
  const rootCause = new TypeError('Network request failed');
  let diagnostic: UploadDiagnostic | undefined;

  try {
    await assert.rejects(
      uploadSweepWithDependencies(
        42,
        'file:///private/saved-memory.mov',
        uploadDependencies(
          new TestLocalFile(['room-video']),
          async () => {
            throw rootCause;
          },
          {
            isDevelopment: true,
            logDiagnostic: (value) => {
              diagnostic = value;
            },
          },
        ),
      ),
      (error: unknown) =>
        error instanceof ProcessingApiError &&
        error.code === 'network_error' &&
        error.cause === rootCause &&
        error.message === 'Upload failed: TypeError — Network request failed',
    );
    assert.deepEqual(diagnostic, {
      apiBaseUrl: 'http://192.168.0.2:8000',
      errorMessage: 'Network request failed',
      errorName: 'TypeError',
      localFileExists: true,
      localFileSize: 10,
    });
  } finally {
    restoreApiUrl(previous);
  }
});

test('preserves structured server error responses', async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.0.2:8000';

  try {
    await assert.rejects(
      uploadSweepWithDependencies(
        42,
        'file:///private/saved-memory.mov',
        uploadDependencies(new TestLocalFile(['room-video']), async () =>
          jsonResponse(
            {
              error: {
                code: 'upload_too_large',
                message: 'Video exceeds the 100 MiB limit.',
              },
            },
            413,
          ),
        ),
      ),
      (error: unknown) =>
        error instanceof ProcessingApiError &&
        error.code === 'upload_too_large' &&
        error.message === 'Video exceeds the 100 MiB limit.',
    );
  } finally {
    restoreApiUrl(previous);
  }
});

test('validates typed processing manifests and frame counts', () => {
  const value = {
    ...processingManifest,
    frames: [
      {
        frameId: 'frame_000001',
        thumbnailUrl: '/sweeps/job/thumbnails/frame_000001.jpg',
        timestamp: 0,
      },
    ],
    retainedFrameCount: 1,
    status: 'ready',
  };

  assert.deepEqual(parseProcessingManifest(value), value);
  assert.throws(() =>
    parseProcessingManifest({ ...value, retainedFrameCount: 2 }),
  );
});
