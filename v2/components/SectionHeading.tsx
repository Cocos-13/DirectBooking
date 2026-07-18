import type { ReactNode } from "react";

interface SectionHeadingProps {
  /** Small accent label above the heading — the one deliberate use of the
   *  brand's terracotta in an otherwise ink-on-sand section. */
  eyebrow?: string;
  children: ReactNode;
  /** Optional supporting line rendered under the heading. */
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

// The single source of truth for section-level (tier 2) typography, sitting
// between the hero (tier 1) and card/sub headings (tier 3). Keeping every
// section heading here guarantees a consistent hierarchy across the page.
export function SectionHeading({
  eyebrow,
  children,
  subtitle,
  align = "left",
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`${align === "center" ? "text-center" : ""} ${className}`}>
      {eyebrow && (
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-terracotta-500 dark:text-terracotta-400">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-aegean-900 sm:text-4xl dark:text-ink-text">
        {children}
      </h2>
      {subtitle && (
        <p
          className={`mt-3 max-w-2xl text-base leading-relaxed text-aegean-900/70 dark:text-ink-text/70 ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
