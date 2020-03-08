export const createZeroArray = (count: number): number[] => {
  const array: number[] = [];
  for (let i = 0; i < count; i++) {
    array[i] = 0;
  }
  return array;
};

export const range = (start: number, stop: number, step: number) => {
  return Array.from(
    { length: (stop - start) / step + 1 },
    (_, index) => step * index + start
  );
};

/**
 * Call a function a given number of times and return the results of every call.
 *
 * @param count - how many times to call the function
 * @param timesFunction - the function to call
 * @returns an array of return values from each call of the function
 */
export function times<T>(
  count: number,
  timesFunction: (index: number) => T
): T[] {
  const values: T[] = [];
  for (let i = 0; i < count; i++) {
    const value = timesFunction(i);
    values.push(value);
  }
  return values;
}
