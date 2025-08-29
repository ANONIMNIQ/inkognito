import React from 'react';
import { Helmet } from 'react-helmet-async';

interface MetaTagsProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
}

const DEFAULT_TITLE = "Инкогнито Online";
const DEFAULT_DESCRIPTION = "Сподели своите тайни анонимно. Място за откровения, подкрепа и разбиране.";
const DEFAULT_OG_IMAGE = "https://inkognito.online/images/logo-main.jpg"; // Using logo-main.jpg as the default
const DEFAULT_OG_URL = "https://inkognito.online";

const MetaTags: React.FC<MetaTagsProps> = ({
  title,
  description,
  ogImage,
  ogUrl,
  ogType = "website",
}) => {
  const finalTitle = title ? `${DEFAULT_TITLE} - ${title}` : DEFAULT_TITLE;
  const finalDescription = description || DEFAULT_DESCRIPTION;
  const finalOgImage = ogImage || DEFAULT_OG_IMAGE;
  const finalOgUrl = ogUrl || DEFAULT_OG_URL;

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:url" content={finalOgUrl} />
      <meta property="og:type" content={ogType} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalOgImage} />
    </Helmet>
  );
};

export default MetaTags;