// Downscale and re-encode an uploaded image in the browser so payloads stay
// well under the serverless function body limit before they are sent as base64.
export async function fileToUpload(file, maxDim = 1600, quality = 0.85) {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  const base64 = (await readAsDataURL(blob)).split(',')[1];
  return { dataBase64: base64, contentType: 'image/jpeg' };
}

function readAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
