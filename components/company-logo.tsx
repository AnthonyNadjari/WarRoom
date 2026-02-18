"use client";

import { useState } from "react";
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
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  // Priority: custom logoUrl → unavatar.io (aggregates Google, DuckDuckGo, etc.) → initials
  const src = logoUrl
    ? logoUrl
    : websiteDomain
      ? `https://unavatar.io/${websiteDomain}?fallback=false`
      : null;

  const showImage = src && !imgError;
  const showInitials = !showImage || !loaded;
  const fontSize = Math.max(10, Math.round(size * 0.36));

  return (
    <div
      className={cn("shrink-0 rounded-lg relative overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      {showInitials && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary"
          style={{ fontSize }}
        >
          {initials || "?"}
        </div>
      )}

      {showImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className={cn(
            "absolute inset-0 h-full w-full rounded-lg bg-white object-contain p-0.5",
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
