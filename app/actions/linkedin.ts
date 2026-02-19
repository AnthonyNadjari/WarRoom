"use server";

export type LinkedInProfile = {
  firstName: string | null;
  lastName: string | null;
  exactTitle: string | null;
  companyGuess: string | null;
};

/**
 * Fetch a LinkedIn profile page and parse the og:title & og:description
 * meta tags to extract name, title, and company.
 *
 * LinkedIn og:title format: "FirstName LastName - Title - Company | LinkedIn"
 * LinkedIn og:description: "... Experience: Title at Company ..."
 *
 * This is a best-effort parser — LinkedIn may block server-side fetches
 * or change their HTML structure at any time.
 */
export async function parseLinkedInProfile(
  url: string
): Promise<{ ok: true; profile: LinkedInProfile } | { ok: false; error: string }> {
  // Validate URL
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a LinkedIn URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, error: "Invalid URL format." };
  }

  if (!parsed.hostname.includes("linkedin.com")) {
    return { ok: false, error: "URL must be a LinkedIn profile link." };
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `Could not fetch profile (HTTP ${res.status}). Please fill manually.`,
      };
    }

    const html = await res.text();

    // Extract og:title and og:description
    const ogTitle = extractMeta(html, "og:title");
    const ogDescription = extractMeta(html, "og:description");

    if (!ogTitle) {
      return {
        ok: false,
        error: "Could not parse profile. Please fill manually.",
      };
    }

    const profile = parseOgData(ogTitle, ogDescription);
    return { ok: true, profile };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "Request timed out. Please fill manually."
        : "Could not fetch profile. Please fill manually.";
    return { ok: false, error: message };
  }
}

function extractMeta(html: string, property: string): string | null {
  // Match both property="og:title" and name="og:title" variants
  const patterns = [
    new RegExp(
      `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*?)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*?)["'][^>]*property=["']${property}["']`,
      "i"
    ),
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * Parse og:title like "Jane Smith - VP Structuring - BNP Paribas | LinkedIn"
 * and og:description like "Experience: VP at BNP Paribas. Education: ..."
 */
function parseOgData(
  ogTitle: string,
  ogDescription: string | null
): LinkedInProfile {
  let firstName: string | null = null;
  let lastName: string | null = null;
  let exactTitle: string | null = null;
  let companyGuess: string | null = null;

  // Remove " | LinkedIn" suffix
  const cleaned = ogTitle.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();

  // Split by " - " which LinkedIn uses as delimiter
  const parts = cleaned.split(/\s+-\s+/);

  if (parts.length >= 1) {
    // First part is always the name
    const nameParts = parts[0].trim().split(/\s+/);
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    } else if (nameParts.length === 1) {
      firstName = nameParts[0];
    }
  }

  if (parts.length >= 2) {
    // Second part is usually the title
    exactTitle = parts[1].trim();
  }

  if (parts.length >= 3) {
    // Third part is usually the company
    companyGuess = parts[2].trim();
  }

  // If we only got 2 parts and the second looks like "Title at Company"
  if (parts.length === 2 && exactTitle) {
    const atMatch = exactTitle.match(/^(.+?)\s+(?:at|@|chez)\s+(.+)$/i);
    if (atMatch) {
      exactTitle = atMatch[1].trim();
      companyGuess = atMatch[2].trim();
    }
  }

  // Try to extract from og:description as fallback
  if (ogDescription && (!exactTitle || !companyGuess)) {
    // Pattern: "... Title at Company ..."
    const descMatch = ogDescription.match(
      /(?:Experience|Current):\s*(.+?)\s+(?:at|@|chez)\s+([^.·|]+)/i
    );
    if (descMatch) {
      if (!exactTitle) exactTitle = descMatch[1].trim();
      if (!companyGuess) companyGuess = descMatch[2].trim();
    }
  }

  return { firstName, lastName, exactTitle, companyGuess };
}
