import { useEffect } from "react";

let hasHydrated = false;

export function useAuthHydration(isLoading: boolean) {
  useEffect(() => {
    if (!isLoading && !hasHydrated) {
      hasHydrated = true;
    }
  }, [isLoading]);

  return isLoading && !hasHydrated;
}
