import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollManager = () => {
  const location = useLocation();
  const lastLocationRef = useRef(location);

  useEffect(() => {
    const lastLocation = lastLocationRef.current;

    // Check if the new path is a confession detail page.
    // We want the Index page to handle scrolling in this specific case.
    const isNavigatingToConfession = /^\/confessions\/.+/.test(location.pathname);

    // If it's a significant navigation change (pathname or search params) AND we are NOT navigating
    // to a specific confession, then scroll to the top of the page.
    if (
      (location.pathname !== lastLocation.pathname || location.search !== lastLocation.search) &&
      !isNavigatingToConfession
    ) {
      window.scrollTo(0, 0);
    }

    // Update the ref to the current location for the next render.
    lastLocationRef.current = location;
  }, [location]);

  return null;
};

export default ScrollManager;