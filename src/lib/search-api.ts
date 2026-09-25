import { fetch } from 'expo/fetch';

import { searchMemoriesWithFetch } from '@/lib/search-api-core';

export function searchMemories(query: string, jobIds: string[]) {
  return searchMemoriesWithFetch(query, jobIds, fetch);
}
