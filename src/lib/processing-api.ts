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
  console.warn('[FoundIt] Sweep upload failed', diagnostic);
}

async function logProcessingApiHealth() {
  try {
    const response = await fetch(`${getProcessingApiBaseUrl()}/health`);
    console.log(await response.text());
  } catch (error) {
    console.warn('[FoundIt] API health check failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
  }
}

export async function uploadSweepForProcessing(
  sweepId: number,
  videoUri: string,
) {
  if (__DEV__) {
    await logProcessingApiHealth();
  }

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
