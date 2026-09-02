let widgetLoader;

export function loadCloudinaryUploadWidget() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Upload widget unavailable'));
  if (window.cloudinary?.createUploadWidget) return Promise.resolve(window.cloudinary);
  if (widgetLoader) return widgetLoader;

  widgetLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-reeky-cloudinary-widget]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.cloudinary), { once: true });
      existing.addEventListener('error', () => reject(new Error('Upload widget failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;
    script.dataset.reekyCloudinaryWidget = 'true';
    script.onload = () => {
      if (window.cloudinary?.createUploadWidget) resolve(window.cloudinary);
      else reject(new Error('Upload widget loaded without its API'));
    };
    script.onerror = () => reject(new Error('Upload widget failed to load'));
    document.head.appendChild(script);
  }).catch(error => {
    widgetLoader = null;
    throw error;
  });

  return widgetLoader;
}
