/**
 * Image picker.
 *
 * Reads an image file the user picked from disk, resizes it on a canvas, and
 * returns two data URLs: a "full" one and a small "thumbnail" one. The grid
 * uses the small one (fast); the lightbox uses the full one (crisp). Without
 * resizing, db.json grows fast every time someone drops in a phone photo.
 */
export async function readPicture(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Pick an image file (JPG, PNG, WebP, or GIF).');
  }

  const dataUrl = await asDataUrl(file);
  const bitmap = await asImage(dataUrl);

  return {
    url: shrink(bitmap, 800),
    thumbnailUrl: shrink(bitmap, 240),
  };
}

function asDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

function asImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't open that image."));
    img.src = src;
  });
}

function shrink(image, longestSide) {
  const ratio = Math.min(1, longestSide / Math.max(image.width, image.height));
  const w = Math.round(image.width * ratio);
  const h = Math.round(image.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(image, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}
