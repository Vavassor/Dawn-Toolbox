export const getBinaryFile = async (uri: string): Promise<ArrayBuffer> => {
  const response = await fetch(uri, {
    method: "GET",
  });
  return response.arrayBuffer();
};
