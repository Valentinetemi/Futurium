import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProcessingApiBaseUrl,
  getProcessingThumbnailUrl,
  ProcessingApiError,
} from '@/lib/processing-api';
import { parseProcessingManifest } from '@/types/processing';

function restoreApiUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = value;
  }
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

test('validates typed processing manifests and frame counts', () => {
  const value = {
    createdAt: '2026-09-23T12:00:00Z',
    duration: 3,
    error: null,
    frames: [
      {
        frameId: 'frame_000001',
        thumbnailUrl: '/sweeps/job/thumbnails/frame_000001.jpg',
        timestamp: 0,
      },
    ],
    jobId: 'job',
    rejectedBlurCount: 1,
    rejectedDuplicateCount: 1,
    retainedFrameCount: 1,
    status: 'ready',
    sweepId: 4,
    totalFramesSampled: 3,
  };

  assert.deepEqual(parseProcessingManifest(value), value);
  assert.throws(() =>
    parseProcessingManifest({ ...value, retainedFrameCount: 2 }),
  );
});
