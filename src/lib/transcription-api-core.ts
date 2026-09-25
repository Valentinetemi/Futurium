import {
  getProcessingApiBaseUrl,
  ProcessingApiError,
  readApiError,
  type LocalUploadFile,
  type ProcessingFetch,
} from '@/lib/processing-api-core';
import {
  parseTranscriptionResponse,
  type TranscriptionResponse,
} from '@/types/transcription';

export type TranscriptionDependencies = {
  createFile(uri: string): LocalUploadFile;
  fetch: ProcessingFetch;
};

function audioFilename(uri: string) {
  const cleanUri = uri.toLowerCase().split(/[?#]/, 1)[0] ?? '';
  return cleanUri.endsWith('.webm') ? 'voice-query.webm' : 'voice-query.m4a';
}

export async function transcribeVoiceWithDependencies(
  audioUri: string,
  dependencies: TranscriptionDependencies,
): Promise<TranscriptionResponse> {
  let localFile: LocalUploadFile;
  try {
    localFile = dependencies.createFile(audioUri);
  } catch (error) {
    throw new ProcessingApiError(
      'The voice recording could not be opened on this device.',
      'local_audio_unavailable',
      { cause: error },
    );
  }

  if (!localFile.exists) {
    throw new ProcessingApiError(
      'The voice recording is no longer available on this device.',
      'local_audio_missing',
    );
  }
  if (!Number.isFinite(localFile.size) || localFile.size <= 0) {
    throw new ProcessingApiError(
      'The voice recording is empty. Please record it again.',
      'local_audio_empty',
    );
  }

  const formData = new FormData();
  formData.append('audio', localFile, audioFilename(audioUri));

  let response;
  try {
    response = await dependencies.fetch(
      `${getProcessingApiBaseUrl()}/transcriptions`,
      { body: formData, method: 'POST' },
    );
  } catch (error) {
    throw new ProcessingApiError(
      'Voice transcription could not reach the processing service. Check the connection and try again.',
      'network_error',
      { cause: error },
    );
  }

  if (!response.ok) {
    throw await readApiError(response);
  }
  return parseTranscriptionResponse(await response.json());
}
