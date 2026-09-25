export type SearchMatch = {
  frameId: string;
  jobId: string;
  similarity: number;
  sweepId: number;
  thumbnailUrl: string;
  timestamp: number;
};

export type SearchResponse = {
  confidenceThreshold: number;
  confidentMatch: boolean;
  matches: SearchMatch[];
  searchedFrameCount: number;
  searchedJobCount: number;
  unindexedJobIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && Number.isInteger(value);
}

function parseSearchMatch(value: unknown): SearchMatch {
  if (
    !isRecord(value) ||
    typeof value.frameId !== 'string' ||
    typeof value.jobId !== 'string' ||
    !isFiniteNumber(value.similarity) ||
    value.similarity < -1 ||
    value.similarity > 1 ||
    !isNonNegativeInteger(value.sweepId) ||
    value.sweepId <= 0 ||
    typeof value.thumbnailUrl !== 'string' ||
    !isFiniteNumber(value.timestamp) ||
    value.timestamp < 0
  ) {
    throw new Error('The search service returned an invalid match.');
  }

  return {
    frameId: value.frameId,
    jobId: value.jobId,
    similarity: value.similarity,
    sweepId: value.sweepId,
    thumbnailUrl: value.thumbnailUrl,
    timestamp: value.timestamp,
  };
}

export function parseSearchResponse(value: unknown): SearchResponse {
  if (
    !isRecord(value) ||
    typeof value.confidentMatch !== 'boolean' ||
    !isFiniteNumber(value.confidenceThreshold) ||
    value.confidenceThreshold < -1 ||
    value.confidenceThreshold > 1 ||
    !Array.isArray(value.matches) ||
    value.matches.length > 3 ||
    !isNonNegativeInteger(value.searchedFrameCount) ||
    !isNonNegativeInteger(value.searchedJobCount) ||
    !Array.isArray(value.unindexedJobIds) ||
    !value.unindexedJobIds.every((jobId) => typeof jobId === 'string')
  ) {
    throw new Error('The search service returned an invalid response.');
  }

  const matches = value.matches.map(parseSearchMatch);
  if (value.confidentMatch && matches.length === 0) {
    throw new Error('The search confidence result is inconsistent.');
  }

  return {
    confidenceThreshold: value.confidenceThreshold,
    confidentMatch: value.confidentMatch,
    matches,
    searchedFrameCount: value.searchedFrameCount,
    searchedJobCount: value.searchedJobCount,
    unindexedJobIds: value.unindexedJobIds,
  };
}
