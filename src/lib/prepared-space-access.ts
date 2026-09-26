export const FREE_PREPARED_SPACE_LIMIT = 1;

export function canPrepareSpace({
  isPlusActive,
  preparedSpaceCount,
}: {
  isPlusActive: boolean;
  preparedSpaceCount: number;
}): boolean {
  return (
    isPlusActive || Math.max(0, preparedSpaceCount) < FREE_PREPARED_SPACE_LIMIT
  );
}
