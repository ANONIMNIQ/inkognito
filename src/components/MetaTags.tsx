import React, { useEffect } from 'react';

interface MetaTagsProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

const SITE_NAME = "Инкогнито Online";
const DEFAULT_IMAGE = `${window.location.origin}/images/logo-main.jpg?v=2`; // Cache bust

const MetaTags: React.FC<MetaTagsProps> = ({
  title,
  description,
  image = DEFAULT_IMAGE,
  url = window.location.href,
}) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to create or update a meta tag
    const updateMetaTag = (name: string, content: string, attribute: 'name' | 'property' = 'name') => {
      let tag = document.head.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // General SEO meta tags
    updateMetaTag('description', description);

    // Open Graph (Facebook, LinkedIn, etc.)
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:image', image, 'property');
    updateMetaTag('og:url', url, 'property');
    updateMetaTag('og:type', 'website', 'property');
    updateMetaTag('og:site_name', SITE_NAME, 'property');

    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);
    // You might want to add twitter:site and twitter:creator if you have a Twitter handle
    // updateMetaTag('twitter:site', '@yourtwitterhandle');
    // updateMetaTag('twitter:creator', '@yourtwitterhandle');

    // Clean up function to reset to default if needed, though usually not necessary for SPA
    return () => {
      // Optionally reset to default meta tags or remove dynamic ones
      // For simplicity, we'll let new MetaTags components override previous ones
    };
  }, [title, description, image, url]);

  return null; // This component doesn't render anything to the DOM
};

export default MetaTags;