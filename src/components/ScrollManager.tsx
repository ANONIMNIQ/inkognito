import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollManager = () => {
  const location = useLocation();

  useEffect(() => {
    const previousPath = sessionStorage.getItem('previousPathname');
    const isInfoPage = (path: string | null) => path ? ['/about-us', '/privacy-policy', '/terms-and-conditions'].includes(path) : false;

    // If we are coming from an info page and landing on the main list (not a specific confession)
    if (previousPath && isInfoPage(previousPath) && !location.pathname.startsWith('/confessions/')) {
      window.scrollTo(0, 0);
    }

    // Store the current pathname for the next navigation check.
    sessionStorage.setItem('previousPathname', location.pathname);

  }, [location.pathname]);

  return null;
};

export default ScrollManager;