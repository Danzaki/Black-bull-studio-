export function exportImage(imageUrl: string) {
  console.log("Export image:", imageUrl);

  return {
    success: true,
    url: imageUrl,
  };
}
