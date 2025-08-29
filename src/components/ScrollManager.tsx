import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollManager = () => {
  const location = useLocation();
  const lastLocationRef = useRef(location);

  useEffect(() => {
    const lastLocation = lastLocationRef.current;

    // Check if the navigation is from a confession page back to the root list.
    const wasOnConfessionPage = /^\/confessions\/.+/.test(lastLocation.pathname);
    const isNowOnRootPage = location.pathname === '/';
    const isCollapsingConfession = wasOnConfessionPage && isNowOnRootPage;

    // Check if we are navigating TO a confession page.
    const isNavigatingToConfession = /^\/confessions\/.+/.test(location.pathname);

    // Scroll to top only on significant page changes, but NOT when expanding or collapsing a confession.
    if (
      (location.pathname !== lastLocation.pathname || location.search !== lastLocation.search) &&
      !isNavigatingToConfession &&
      !isCollapsingConfession
    ) {
      window.scrollTo(0, 0);
    }

    // Update the ref to the current location for the next render.
    lastLocationRef.current = location;
  }, [location]);

  return null;
};

export default ScrollManager;