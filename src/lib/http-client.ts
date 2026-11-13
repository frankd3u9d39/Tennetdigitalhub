// Client-side fetch helper. Reads the response as text and parses JSON defensively, so when the server (or the
// hosting platform) returns a non-JSON body — e.g. Vercel's plain "An error occurred" page on a function timeout or
// crash — the user sees a clear message instead of a raw "Unexpected token 'A'… is not valid JSON" parse error.

export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok || data === null) {
    const serverMsg = (data as { error?: string } | null)?.error;
    const fallback =
      res.status === 408 || res.status === 504
        ? "This is taking too long. If no result was shown you were not charged — please try again."
        : res.status >= 500
          ? "The service is temporarily unavailable. If no result was shown you were not charged — please try again shortly."
          : "Something went wrong. Please try again.";
    throw new Error(serverMsg || fallback);
  }
  return data as T;
}
