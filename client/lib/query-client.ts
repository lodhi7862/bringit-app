import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  // If host already includes protocol, use it as-is
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return host.endsWith('/') ? host.slice(0, -1) : host;
  }

  // Default to http:// for localhost or IP addresses, https:// for domains
  const protocol = host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host.split(':')[0])
    ? 'http://'
    : 'https://';
  
  let url = new URL(`${protocol}${host}`);

  return url.href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export async function uploadImage(localUri: string): Promise<string> {
  const baseUrl = getApiUrl();
  const url = new URL("/api/upload-image", baseUrl);

  const formData = new FormData();
  
  const filename = localUri.split("/").pop() || "image.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("image", {
    uri: localUri,
    name: filename,
    type,
  } as any);

  const res = await fetch(url.toString(), {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upload image: ${text}`);
  }

  const data = await res.json();
  return data.url;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
