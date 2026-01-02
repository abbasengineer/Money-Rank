import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that updates og:image, twitter:image, og:url, and canonical URL meta tags
 * to point to the app's opengraph image and URLs with the correct deployment domain.
 * Supports Replit, Render, and custom BASE_URL environment variable.
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      const baseUrl = getDeploymentUrl();
      if (!baseUrl) {
        log('[meta-images] no deployment domain found, skipping meta tag updates');
        return html;
      }

      // Check if opengraph image exists in public directory
      const publicDir = path.resolve(process.cwd(), 'client', 'public');
      const opengraphPngPath = path.join(publicDir, 'opengraph.png');
      const opengraphJpgPath = path.join(publicDir, 'opengraph.jpg');
      const opengraphJpegPath = path.join(publicDir, 'opengraph.jpeg');

      let imageExt: string | null = null;
      if (fs.existsSync(opengraphPngPath)) {
        imageExt = 'png';
      } else if (fs.existsSync(opengraphJpgPath)) {
        imageExt = 'jpg';
      } else if (fs.existsSync(opengraphJpegPath)) {
        imageExt = 'jpeg';
      }

      if (!imageExt) {
        log('[meta-images] OpenGraph image not found, skipping meta tag updates');
        return html;
      }

      const imageUrl = `${baseUrl}/opengraph.${imageExt}`;

      log('[meta-images] updating meta tags with base URL:', baseUrl);

      // Update og:image
      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g,
        `<meta property="og:image" content="${imageUrl}" />`
      );

      // Update twitter:image
      html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g,
        `<meta name="twitter:image" content="${imageUrl}" />`
      );

      // Update og:url if it exists, otherwise add it
      if (html.includes('property="og:url"')) {
        html = html.replace(
          /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/g,
          `<meta property="og:url" content="${baseUrl}/" />`
        );
      } else {
        // Insert after og:site_name or before closing head tag
        html = html.replace(
          /(<meta\s+property="og:site_name"[^>]*\/>)/,
          `$1\n    <meta property="og:url" content="${baseUrl}/" />`
        );
      }

      // Add canonical URL if it doesn't exist
      if (!html.includes('rel="canonical"')) {
        html = html.replace(
          /(<link\s+rel="icon"[^>]*\/>)/,
          `$1\n    <link rel="canonical" href="${baseUrl}/" />`
        );
      } else {
        html = html.replace(
          /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/g,
          `<link rel="canonical" href="${baseUrl}/" />`
        );
      }

      return html;
    },
  };
}

function getDeploymentUrl(): string | null {
  // Priority 1: Custom BASE_URL (for Render or any custom domain)
  if (process.env.BASE_URL) {
    const url = process.env.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    log('[meta-images] using BASE_URL:', url);
    return url;
  }

  // Priority 2: Replit internal app domain (production)
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    const url = `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
    log('[meta-images] using Replit internal app domain:', url);
    return url;
  }

  // Priority 3: Replit dev domain (development)
  if (process.env.REPLIT_DEV_DOMAIN) {
    const url = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    log('[meta-images] using Replit dev domain:', url);
    return url;
  }

  // Priority 4: Render URL (if RENDER_EXTERNAL_URL is set)
  if (process.env.RENDER_EXTERNAL_URL) {
    const url = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
    log('[meta-images] using Render external URL:', url);
    return url;
  }

  return null;
}

function log(...args: any[]): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(...args);
  }
}
