import assert from 'node:assert/strict';
import test from 'node:test';

import {
  transcribeVoiceWithDependencies,
  type TranscriptionDependencies,
} from '@/lib/transcription-api-core';
import {
  ProcessingApiError,
  type LocalUploadFile,
} from '@/lib/processing-api-core';
import { parseTranscriptionResponse } from '@/types/transcription';

class TestAudioFile extends Blob implements LocalUploadFile {
  exists: boolean;
  name: string;

  constructor(contents: BlobPart[], exists = true) {
    super(contents, { type: 'audio/m4a' });
    this.exists = exists;
    this.name = 'private-device-recording.m4a';
  }
}

function restoreApiUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = value;
  }
}

function dependencies(
  file: LocalUploadFile,
  fetchImplementation: TranscriptionDependencies['fetch'],
): TranscriptionDependencies {
  return { createFile: () => file, fetch: fetchImplementation };
}

test('parses a concise transcription response', () => {
  assert.deepEqual(
    parseTranscriptionResponse({ transcription: '  glasses  ' }),
    {
      transcription: 'glasses',
    },
  );
  assert.throws(() => parseTranscriptionResponse({ transcription: '   ' }));
  assert.throws(() => parseTranscriptionResponse({ transcription: 42 }));
});

test('rejects missing and zero-byte local audio', async () => {
  await assert.rejects(
    transcribeVoiceWithDependencies(
      'file:///private/query.m4a',
      dependencies(
        new TestAudioFile([new Uint8Array([1])], false),
        async () => {
          throw new Error('fetch should not run');
        },
      ),
    ),
    (error: unknown) =>
      error instanceof ProcessingApiError &&
      error.code === 'local_audio_missing',
  );

  await assert.rejects(
    transcribeVoiceWithDependencies(
      'file:///private/query.m4a',
      dependencies(new TestAudioFile([]), async () => {
        throw new Error('fetch should not run');
      }),
    ),
    (error: unknown) =>
      error instanceof ProcessingApiError && error.code === 'local_audio_empty',
  );
});

test('uploads a real multipart audio field without setting its boundary', async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test/';
  let submittedBody: BodyInit | null | undefined;
  let submittedHeaders: Record<string, string> | undefined;

  try {
    const result = await transcribeVoiceWithDependencies(
      'file:///private/query.m4a',
      dependencies(
        new TestAudioFile([new Uint8Array([1, 2, 3])]),
        async (_input, init) => {
          submittedBody = init?.body;
          submittedHeaders = init?.headers;
          return new Response(
            JSON.stringify({ transcription: 'Where are my glasses?' }),
          );
        },
      ),
    );

    assert.deepEqual(result, { transcription: 'Where are my glasses?' });
    assert.ok(submittedBody instanceof FormData);
    assert.ok(submittedBody.get('audio') instanceof Blob);
    assert.equal(submittedHeaders, undefined);
  } finally {
    restoreApiUrl(previous);
  }
});

test('preserves network causes and structured server errors', async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const networkCause = new TypeError('connection closed');

  try {
    await assert.rejects(
      transcribeVoiceWithDependencies(
        'file:///private/query.m4a',
        dependencies(new TestAudioFile(['voice']), async () => {
          throw networkCause;
        }),
      ),
      (error: unknown) =>
        error instanceof ProcessingApiError &&
        error.code === 'network_error' &&
        error.cause === networkCause,
    );

    await assert.rejects(
      transcribeVoiceWithDependencies(
        'file:///private/query.m4a',
        dependencies(
          new TestAudioFile(['voice']),
          async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: 'transcription_failed',
                  message: 'The voice query could not be transcribed.',
                },
              }),
              { status: 503 },
            ),
        ),
      ),
      (error: unknown) =>
        error instanceof ProcessingApiError &&
        error.code === 'transcription_failed',
    );
  } finally {
    restoreApiUrl(previous);
  }
});
