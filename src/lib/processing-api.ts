import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import {
  getProcessingApiBaseUrl,
  getProcessingThumbnailUrl,
  getSweepProcessingWithFetch,
  ProcessingApiError,
  uploadSweepWithDependencies,
  type UploadDiagnostic,
} from '@/lib/processing-api-core';

export {
  getProcessingApiBaseUrl,
  getProcessingThumbnailUrl,
  ProcessingApiError,
};

function logUploadDiagnostic(diagnostic: UploadDiagnostic) {
  console.warn('[Futurium] Sweep upload failed', diagnostic);
}

export function uploadSweepForProcessing(sweepId: number, videoUri: string) {
  return uploadSweepWithDependencies(sweepId, videoUri, {
    createFile: (uri) => new File(uri),
    fetch,
    isDevelopment: __DEV__,
    logDiagnostic: logUploadDiagnostic,
  });
}

export function getSweepProcessing(jobId: string) {
  return getSweepProcessingWithFetch(jobId, fetch);
}
