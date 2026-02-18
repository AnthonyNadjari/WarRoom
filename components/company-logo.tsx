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

  const src = logoUrl
    ? logoUrl
    : websiteDomain
      ? `https://logo.clearbit.com/${websiteDomain}`
      : null;

  const fontSize = Math.max(10, Math.round(size * 0.36));

  // Always render the initials fallback as base, overlay image on top when available
  return (
    <div
      className={cn(
        "shrink-0 rounded-lg bg-primary/10 flex items-center justify-center font-semibold text-primary relative overflow-hidden",
        className
      )}
      style={{ width: size, height: size, fontSize }}
    >
      {(!src || imgError || !loaded) && (initials || "?")}
      {src && !imgError && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="absolute inset-0 h-full w-full rounded-lg object-contain"
          onLoad={() => setLoaded(true)}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
