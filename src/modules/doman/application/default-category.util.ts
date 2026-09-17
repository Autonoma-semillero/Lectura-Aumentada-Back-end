export type StudentCategoryCount = {
  categoryId: string;
  count: number;
};

export function selectDefaultCategoryId(
  counts: StudentCategoryCount[],
): string | null {
  return (
    [...counts].sort(
      (left, right) =>
        right.count - left.count || left.categoryId.localeCompare(right.categoryId),
    )[0]?.categoryId ?? null
  );
}
