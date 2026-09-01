// Downscale and re-encode an uploaded image in the browser so payloads stay
// well under the serverless function body limit before they are sent as base64.
//
// The stored file is also the source the Netlify Image CDN reads every time it
// has to produce a size it has not cached yet, and that read happens through a
// function invocation and a Blobs fetch — so its size is not just an upload
// cost, it is paid again on every cold transform. Encoding WebP rather than JPEG
// cuts it by roughly a third at the same visual quality, which makes every one
// of those cold transforms quicker for the first visitor who triggers it.

/**
 * The longest edge anything is stored at. This is deliberately the same number
 * as MAX_SOURCE_WIDTH in src/lib/photos.js: the storefront never asks the Image
 * CDN for a width above it, because past this there is no more detail in the
 * file to serve and the CDN would just upscale.
 */
export const MAX_DIMENSION = 1600;

// Quality for the re-encode. The Image CDN re-encodes again on the way out, so
// this only needs to be high enough that the second pass has something clean to
// work from — visually lossless at the sizes the site actually displays.
const WEBP_QUALITY = 0.85;
const JPEG_QUALITY = 0.85;

/** Whether canvas can hand us WebP. True in every current browser. */
let webpSupport = null;
function canEncodeWebp() {
  if (webpSupport === null) {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    webpSupport = probe.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupport;
}

export async function fileToUpload(file, maxDim = MAX_DIMENSION, quality) {
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

  // WebP where the browser can produce it, JPEG otherwise. An explicit `quality`
  // argument still wins, so a caller that needs a particular one can say so.
  const webp = canEncodeWebp();
  const contentType = webp ? 'image/webp' : 'image/jpeg';
  const q = quality ?? (webp ? WEBP_QUALITY : JPEG_QUALITY);

  const blob = await toBlob(canvas, contentType, q);
  const base64 = (await readAsDataURL(blob)).split(',')[1];
  // The real type of what came back, in case toBlob ignored the request and
  // handed us a PNG — the row stores this and /api/photos/:id serves it back.
  return { dataBase64: base64, contentType: blob.type || contentType };
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
      type,
      quality,
    ),
  );
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
