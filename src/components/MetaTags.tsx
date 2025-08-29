import React from 'react';
import { Helmet } from 'react-helmet-async';

interface MetaTagsProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  type?: string; // e.g., 'website', 'article'
}

const DEFAULT_TITLE = "Инкогнито Online";
const DEFAULT_DESCRIPTION = "Сподели своите тайни анонимно. Място за откровения, подкрепа и разбиране.";
const DEFAULT_IMAGE_URL = `${window.location.origin}/images/logomini.png`; // Ensure absolute URL
const DEFAULT_TYPE = "website";

const MetaTags: React.FC<MetaTagsProps> = ({
  title,
  description,
  imageUrl,
  url,
  type,
}) => {
  const currentTitle = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
  const currentDescription = description || DEFAULT_DESCRIPTION;
  const currentImageUrl = imageUrl || DEFAULT_IMAGE_URL;
  const currentUrl = url || window.location.href;
  const currentType = type || DEFAULT_TYPE;

  return (
    <Helmet>
      <title>{currentTitle}</title>
      <meta name="description" content={currentDescription} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook / LinkedIn */}
      <meta property="og:type" content={currentType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={currentTitle} />
      <meta property="og:description" content={currentDescription} />
      <meta property="og:image" content={currentImageUrl} />
      <meta property="og:image:width" content="1200" /> {/* Recommended size */}
      <meta property="og:image:height" content="630" /> {/* Recommended size */}

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={currentTitle} />
      <meta property="twitter:description" content={currentDescription} />
      <meta property="twitter:image" content={currentImageUrl} />
    </Helmet>
  );
};

export default MetaTags;