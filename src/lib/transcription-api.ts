import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { transcribeVoiceWithDependencies } from '@/lib/transcription-api-core';

export function transcribeVoiceQuery(audioUri: string) {
  return transcribeVoiceWithDependencies(audioUri, {
    createFile: (uri) => new File(uri),
    fetch,
  });
}

export function deleteTemporaryVoiceRecording(audioUri: string) {
  try {
    const file = new File(audioUri);
    if (file.exists) file.delete();
  } catch {
    // The cache file may already have been released by the native recorder.
  }
}
