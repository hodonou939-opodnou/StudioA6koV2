export const fileToBase64 = (file: File, maxDimension: number = 1024, quality: number = 0.85): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    // If it's not an image (or is SVG/GIF which we shouldn't rasterize/resize with Canvas), use standard FileReader
    if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const [mimeTypePart, base64] = result.split(',');
        if (!mimeTypePart || !base64) {
          return reject(new Error("Invalid file format"));
        }
        resolve({
          base64,
          mimeType: mimeTypePart.split(':')[1].split(';')[0],
        });
      };
      reader.onerror = (error) => reject(error);
      return;
    }

    // It's a standard image (JPEG, PNG, WEBP, etc.). Resize if it exceeds maxDimension or for size optimizations
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.src = result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original Base64 if canvas context fails
          const [mimeTypePart, base64] = result.split(',');
          if (mimeTypePart && base64) {
            resolve({
              base64,
              mimeType: mimeTypePart.split(':')[1].split(';')[0],
            });
          } else {
            reject(new Error("Invalid file format"));
          }
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Preserve PNG transparency; otherwise use JPEG for size optimizations
        const formatMimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(formatMimeType, quality);
        const [mimeTypePart, base64] = compressedDataUrl.split(',');
        if (!mimeTypePart || !base64) {
          // Fallback
          const [origMimePart, origBase64] = result.split(',');
          resolve({
            base64: origBase64,
            mimeType: origMimePart.split(':')[1].split(';')[0],
          });
          return;
        }

        resolve({
          base64,
          mimeType: mimeTypePart.split(':')[1].split(';')[0],
        });
      };
      img.onerror = () => {
        // Fallback to original Base64
        const [mimeTypePart, base64] = result.split(',');
        if (mimeTypePart && base64) {
          resolve({
            base64,
            mimeType: mimeTypePart.split(':')[1].split(';')[0],
          });
        } else {
          reject(new Error("Invalid file format"));
        }
      };
    };
    reader.onerror = (error) => reject(error);
  });
};
