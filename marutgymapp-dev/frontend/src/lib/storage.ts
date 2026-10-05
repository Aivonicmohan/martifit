export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`localStorage quota exceeded for key "${key}". Attempting cache cleanup...`, err);
    try {
      // Clear large cache keys if quota is exceeded
      localStorage.removeItem("cached_members");
      localStorage.removeItem("cached_memberships");
      localStorage.removeItem("cached_plans");
      localStorage.setItem(key, value);
      return true;
    } catch {
      // Ignore if browser storage remains full; app will function normally from memory / API response
      return false;
    }
  }
}
