import {
  getProcessingApiBaseUrl,
  ProcessingApiError,
  readApiError,
  type ProcessingFetch,
} from '@/lib/processing-api-core';
import { parseSearchResponse, type SearchResponse } from '@/types/search';

export async function searchMemoriesWithFetch(
  query: string,
  jobIds: string[],
  fetchImplementation: ProcessingFetch,
): Promise<SearchResponse> {
  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  if (!normalizedQuery || normalizedQuery.length > 200) {
    throw new ProcessingApiError(
      'Enter a search between 1 and 200 characters.',
      'invalid_search_query',
    );
  }
  const uniqueJobIds = [...new Set(jobIds.filter(Boolean))];
  if (uniqueJobIds.length === 0) {
    throw new ProcessingApiError(
      'Prepare at least one saved memory before searching.',
      'no_ready_memories',
    );
  }

  let response;
  try {
    response = await fetchImplementation(
      `${getProcessingApiBaseUrl()}/search`,
      {
        body: JSON.stringify({
          jobIds: uniqueJobIds,
          query: normalizedQuery,
          resultLimit: 3,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      },
    );
  } catch (error) {
    throw new ProcessingApiError(
      'Search could not reach the processing service. Check the connection and try again.',
      'network_error',
      { cause: error },
    );
  }

  if (!response.ok) {
    throw await readApiError(response);
  }
  return parseSearchResponse(await response.json());
}
