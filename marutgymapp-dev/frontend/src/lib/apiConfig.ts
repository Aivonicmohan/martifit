// frontend/src/lib/apiConfig.ts

/** API base URL used by browser and server-side requests. */

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Use relative URLs so browser requests stay on the current origin.
    return "";
  }

  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return "http://localhost:5000";
}


/**
 * Current API base URL.
 */
export const API_BASE_URL = getApiBaseUrl();


/**
 * Build a complete API URL.
 *
 * Examples:
 *
 * getApiUrl("/api/v1/auth/login")
 *      => /api/v1/auth/login
 *
 * getApiUrl("api/v1/auth/login")
 *      => /api/v1/auth/login
 *
 * Server-side requests:
 *
 * NEXT_PUBLIC_API_URL=http://localhost:5000
 *
 * getApiUrl("/api/v1/auth/login")
 *      => http://localhost:5000/api/v1/auth/login
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const baseUrl = getApiBaseUrl();

  return `${baseUrl}${cleanPath}`;
}


/**
 * Authenticated API fetch helper.
 *
 * Automatically adds:
 *
 * Authorization: Bearer <token>
 *
 * when a token exists in localStorage.
 */
export async function authFetch(
  path: string,
  options: RequestInit = {},
  retries = 6
): Promise<Response> {
  const url = getApiUrl(path);

  /*
   * Get JWT token from browser storage.
   */
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  /*
   * Build headers safely.
   */
  const headers = new Headers(
    options.headers || {}
  );

  /*
   * Add Authorization header if token exists.
   */
  if (
    token &&
    !headers.has("Authorization")
  ) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  /*
   * Determine HTTP method.
   */
  const method = (
    options.method || "GET"
  ).toUpperCase();

  /*
   * Mutating requests should NOT be automatically retried.
   *
   * Otherwise a POST/PUT/PATCH/DELETE could potentially
   * be submitted more than once.
   */
  const isMutation =
    method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE";

  const maxRetries = isMutation
    ? 1
    : retries;

  /*
   * Perform request.
   */
  for (
    let attempt = 0;
    attempt < maxRetries;
    attempt++
  ) {
    try {
      const response = await fetch(
        url,
        {
          ...options,
          headers,
          cache:
            options.cache || "no-store",
        }
      );

      /*
       * Retry temporary upstream errors
       * for read-only requests.
       */
      if (
        !isMutation &&
        (
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504
        ) &&
        attempt < maxRetries - 1
      ) {
        const delay =
          (attempt + 1) * 1500;

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              delay
            )
        );

        continue;
      }

      return response;

    } catch (error) {

      /*
       * Retry network failures for
       * read-only requests.
       */
      if (
        !isMutation &&
        attempt < maxRetries - 1
      ) {
        const delay =
          (attempt + 1) * 1500;

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              delay
            )
        );

        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Request failed: ${method} ${url}`
  );
}
