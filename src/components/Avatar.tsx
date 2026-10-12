"use client";

import { useState } from "react";
import clsx from "clsx";

export const initialsOf = (name?: string | null) =>
  name
    ? name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "—";

/** A round profile badge: the picture when there is one (e.g. from Google), otherwise the person's initials. */
export function Avatar({ name, src, className }: { name?: string | null; src?: string | null; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPicture = Boolean(src) && failed !== src;
  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink font-display text-canvas dark:bg-accent dark:text-accent-ink",
        className
      )}
    >
      {showPicture ? (
        // A plain <img>: it's a small third-party picture and next/image would need Google's hosts configured.
        // no-referrer because Google's picture servers can refuse requests that carry another site's address.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt="" referrerPolicy="no-referrer" onError={() => setFailed(src ?? null)} className="h-full w-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
}
