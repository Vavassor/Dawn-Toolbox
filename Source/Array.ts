export const createZeroArray = (count: number): number[] => {
  const array: number[] = [];
  for (let i = 0; i < count; i++) {
    array[i] = 0;
  }
  return array;
};
