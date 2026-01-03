
import { toast } from '@/components/ui/use-toast';

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    quality = 0.8,
    onProgress
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    if (onProgress) onProgress(10);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        if (onProgress) onProgress(40);
        
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        if (onProgress) onProgress(80);

        canvas.toBlob(
          (blob) => {
            if (onProgress) onProgress(100);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas is empty'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = (error) => reject(error);
    };
    
    reader.onerror = (error) => reject(error);
  });
}

export default { compressImage };
