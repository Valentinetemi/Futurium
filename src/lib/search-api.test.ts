import assert from 'node:assert/strict';
import test from 'node:test';

import { searchMemoriesWithFetch } from '@/lib/search-api-core';
import { ProcessingApiError } from '@/lib/processing-api-core';
import { parseSearchResponse } from '@/types/search';

const searchResponse = {
  confidenceThreshold: 0.23,
  confidentMatch: true,
  matches: [
    {
      frameId: 'frame_000002',
      jobId: '11111111-1111-4111-8111-111111111111',
      similarity: 0.62,
      sweepId: 42,
      thumbnailUrl:
        '/sweeps/11111111-1111-4111-8111-111111111111/thumbnails/frame_000002.jpg',
      timestamp: 1.5,
    },
  ],
  searchedFrameCount: 3,
  searchedJobCount: 1,
  unindexedJobIds: [],
};

function restoreApiUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = value;
  }
}

test('parses a typed semantic search response', () => {
  assert.deepEqual(parseSearchResponse(searchResponse), searchResponse);
  assert.throws(() =>
    parseSearchResponse({
      ...searchResponse,
      matches: [{ ...searchResponse.matches[0], similarity: 2 }],
    }),
  );
  assert.throws(() =>
    parseSearchResponse({
      ...searchResponse,
      confidentMatch: true,
      matches: [],
    }),
  );
});

test('posts a normalized query and ready job IDs', async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test/';
  let requestUrl: string | URL | undefined;
  let requestBody: unknown;

  try {
    const result = await searchMemoriesWithFetch(
      '  Where   are my glasses? ',
      [
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
      ],
      async (input, init) => {
        requestUrl = input;
        requestBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify(searchResponse));
      },
    );

    assert.deepEqual(result, searchResponse);
    assert.equal(requestUrl, 'https://api.example.test/search');
    assert.deepEqual(requestBody, {
      jobIds: ['11111111-1111-4111-8111-111111111111'],
      query: 'Where are my glasses?',
      resultLimit: 3,
    });
  } finally {
    restoreApiUrl(previous);
  }
});

test('requires a query and at least one ready memory', async () => {
  await assert.rejects(
    searchMemoriesWithFetch('   ', ['job'], async () => new Response()),
    (error: unknown) =>
      error instanceof ProcessingApiError &&
      error.code === 'invalid_search_query',
  );
  await assert.rejects(
    searchMemoriesWithFetch('glasses', [], async () => new Response()),
    (error: unknown) =>
      error instanceof ProcessingApiError && error.code === 'no_ready_memories',
  );
});

test('preserves structured search errors', async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';

  try {
    await assert.rejects(
      searchMemoriesWithFetch(
        'keys',
        ['missing'],
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 'search_job_not_found',
                message: 'A requested processing job was not found.',
              },
            }),
            { status: 404 },
          ),
      ),
      (error: unknown) =>
        error instanceof ProcessingApiError &&
        error.code === 'search_job_not_found',
    );
  } finally {
    restoreApiUrl(previous);
  }
});
