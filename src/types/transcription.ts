export type TranscriptionResponse = {
  transcription: string;
};

export function parseTranscriptionResponse(
  value: unknown,
): TranscriptionResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('The transcription service returned an invalid response.');
  }

  const transcription = Reflect.get(value, 'transcription');
  if (
    typeof transcription !== 'string' ||
    transcription.trim().length === 0 ||
    transcription.length > 200
  ) {
    throw new Error('The transcription service returned an invalid response.');
  }

  return { transcription: transcription.trim() };
}
