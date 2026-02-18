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

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const src = logoUrl
    ? logoUrl
    : websiteDomain && !imgError
      ? `https://logo.clearbit.com/${websiteDomain}`
      : null;

  if (src && !imgError) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn(
          "shrink-0 rounded-lg bg-muted object-contain",
          className
        )}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  const fontSize = Math.max(10, Math.round(size * 0.36));

  return (
    <div
      className={cn(
        "shrink-0 rounded-lg bg-primary/10 flex items-center justify-center font-semibold text-primary",
        className
      )}
      style={{ width: size, height: size, fontSize }}
    >
      {initials || "?"}
    </div>
  );
}
