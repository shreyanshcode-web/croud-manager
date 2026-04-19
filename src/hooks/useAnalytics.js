/**
 * useAnalytics — Google Analytics 4 tracking hook
 * Wraps gtag() calls with safe guards (gtag may not be loaded yet).
 * 
 * Google Service: Google Analytics 4
 */

function gtag(...args) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

export function useAnalytics() {
  /**
   * Track a screen/page view.
   * @param {string} screenName - e.g. 'Home', 'AI Chat', 'Food'
   */
  const trackScreen = (screenName) => {
    gtag('event', 'screen_view', {
      screen_name: screenName,
      app_name:    'SV-Companion',
    });
  };

  /**
   * Track a user action event.
   * @param {string} eventName  - e.g. 'ai_query_sent'
   * @param {object} params     - extra dimensions
   */
  const trackEvent = (eventName, params = {}) => {
    gtag('event', eventName, {
      ...params,
      app_name: 'SV-Companion',
    });
  };

  /**
   * Track a search action (AI queries, nearby searches).
   */
  const trackSearch = (searchTerm) => {
    gtag('event', 'search', { search_term: searchTerm });
  };

  return { trackScreen, trackEvent, trackSearch };
}
