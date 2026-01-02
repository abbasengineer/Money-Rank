import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
}

/**
 * SEO component for dynamic page titles and meta tags
 * Updates document title and meta tags based on current page
 */
export function SEO({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  canonical,
  noindex = false,
}: SEOProps) {
  const [location] = useLocation();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Default values
  const defaultTitle = 'MoneyRank - Daily Financial Decision Game | Test Your Money Skills';
  const defaultDescription = 'Play MoneyRank: a daily financial decision game. Rank 4 money options, get scored instantly, and see how you compare to others. Build your financial literacy skills with fun daily challenges.';
  const defaultKeywords = 'financial literacy, money game, personal finance, financial education, money decisions, financial quiz, daily challenge, money ranking';

  const pageTitle = title ? `${title} | MoneyRank` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = keywords || defaultKeywords;
  const pageOgTitle = ogTitle || title || 'MoneyRank - Daily Financial Decision Game';
  const pageOgDescription = ogDescription || description || defaultDescription;
  const pageOgImage = ogImage || `${baseUrl}/opengraph.jpg`;
  const pageCanonical = canonical || `${baseUrl}${location}`;

  useEffect(() => {
    // Update document title
    document.title = pageTitle;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update description
    updateMetaTag('description', pageDescription);
    
    // Update keywords
    updateMetaTag('keywords', pageKeywords);

    // Update Open Graph tags
    updateMetaTag('og:title', pageOgTitle, true);
    updateMetaTag('og:description', pageOgDescription, true);
    updateMetaTag('og:image', pageOgImage, true);
    updateMetaTag('og:url', pageCanonical, true);

    // Update Twitter tags
    updateMetaTag('twitter:title', pageOgTitle);
    updateMetaTag('twitter:description', pageOgDescription);
    updateMetaTag('twitter:image', pageOgImage);

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', pageCanonical);

    // Handle robots/noindex
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }
  }, [pageTitle, pageDescription, pageKeywords, pageOgTitle, pageOgDescription, pageOgImage, pageCanonical, noindex]);

  return null; // This component doesn't render anything
}

