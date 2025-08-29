import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollManager = () => {
  const location = useLocation();
  const lastLocationRef = useRef(location);

  useEffect(() => {
    const lastLocation = lastLocationRef.current;

    // Check if it's a significant navigation change (pathname or search params).
    // We ignore hash changes, as they are for in-page navigation (like opening comments).
    if (location.pathname !== lastLocation.pathname || location.search !== lastLocation.search) {
      window.scrollTo(0, 0);
    }

    // Update the ref to the current location for the next render.
    lastLocationRef.current = location;
  }, [location]);

  return null;
};

export default ScrollManager;