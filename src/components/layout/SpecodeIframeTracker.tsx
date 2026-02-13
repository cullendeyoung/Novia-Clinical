import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Tracks pathname changes when running inside Specode AI Coder iframe.
 * Posts messages to parent window so the preview toolbar stays in sync.
 * Do not remove while running inside the AI Coder.
 */
export function SpecodeIframeTracker() {
  const location = useLocation();

  useEffect(() => {
    // Only run when inside an iframe
    if (window.parent === window) return;

    const fullPath = location.pathname + location.search;

    window.parent.postMessage(
      {
        type: "specode:path-update",
        path: fullPath,
        pathname: location.pathname,
        search: location.search,
        origin: window.location.origin,
      },
      "*"
    );
  }, [location]);

  return null;
}
