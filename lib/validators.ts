const MAX_INPUT_LENGTH = 10_000;
const HTML_TAG_PATTERN = /<[^>]*>/g;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Sanitize and validate raw decklist text input.
 * - Enforces max length
 * - Strips HTML tags
 * - Trims whitespace
 */
export function sanitizeDecklistInput(raw: string): string {
  if (raw.length > MAX_INPUT_LENGTH) {
    throw new ValidationError(
      `Input too long: ${raw.length} characters (max ${MAX_INPUT_LENGTH})`,
    );
  }

  // Strip any HTML tags
  const stripped = raw.replace(HTML_TAG_PATTERN, "");

  return stripped.trim();
}

/**
 * Validate that a URL string points to an allowed host.
 * Used as a generic SSRF guard for any server-side fetch.
 */
export function validateUrlHost(
  url: string,
  allowedHosts: string[],
): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError("Invalid URL format");
  }

  const isAllowed = allowedHosts.some(
    (host) =>
      parsed.hostname === host || parsed.hostname === `www.${host}`,
  );

  if (!isAllowed) {
    throw new ValidationError(
      `Host not allowed: ${parsed.hostname}`,
    );
  }

  if (parsed.protocol !== "https:") {
    throw new ValidationError("Only HTTPS URLs are allowed");
  }

  return parsed;
}
