"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function CompanyLogo({
  name,
  logoUrl,
  websiteDomain,
  size = 32,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  websiteDomain?: string | null;
  size?: number;
  className?: string;
}) {
  // Priority: custom logoUrl → unavatar.io (aggregates Google, DuckDuckGo, etc.) → initials
  const src = logoUrl
    ? logoUrl
    : websiteDomain
      ? `https://unavatar.io/${websiteDomain}?fallback=false`
      : null;

  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset state when src changes (e.g. company edited)
  useEffect(() => {
    setImgError(false);
    setLoaded(false);
  }, [src]);

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const showImage = src && !imgError;
  const fontSize = Math.max(10, Math.round(size * 0.36));

  return (
    <div
      className={cn("shrink-0 rounded-lg relative overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      {/* Always render initials as background fallback */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary transition-opacity",
          loaded && showImage ? "opacity-0" : "opacity-100"
        )}
        style={{ fontSize }}
      >
        {initials || "?"}
      </div>

      {showImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className={cn(
            "absolute inset-0 h-full w-full rounded-lg bg-white object-contain p-0.5 transition-opacity",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
