"use client";

import type { ReactNode } from "react";
import { useLanguage } from "./LanguageProvider";
import { contactLinks, whatsappLink } from "@/lib/contact";

// Line icons (24×24, stroked, currentColor) matching the rest of the page.
// The two messaging apps share a speech-bubble; call uses a handset and
// email an envelope, so the icon set stays semantically consistent.
const BUBBLE = (
  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
);
const PHONE = (
  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
);
const MAIL = (
  <>
    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <path d="m22 7-10 6L2 7" />
  </>
);

export interface ContactChannel {
  key: string;
  label: string;
  href: string;
  external: boolean;
  /** Brand background + hover + text color classes. */
  brand: string;
  icon: ReactNode;
}

/**
 * The four contact channels, all derived from the single phone/email in
 * siteConfig. Shared by the floating button and the booking-section block
 * so labels and links stay in one place.
 */
export function useContactChannels(): ContactChannel[] {
  const { t } = useLanguage();
  const links = contactLinks();

  return [
    {
      key: "whatsapp",
      label: t.contact.whatsapp,
      href: whatsappLink(t.contact.waPrefill),
      external: true,
      brand: "bg-[#25D366] hover:bg-[#1ebe5b] text-white",
      icon: BUBBLE,
    },
    {
      key: "viber",
      label: t.contact.viber,
      href: links.viber,
      external: false,
      brand: "bg-[#7360F2] hover:bg-[#5f4de0] text-white",
      icon: BUBBLE,
    },
    {
      key: "call",
      label: t.contact.call,
      href: links.tel,
      external: false,
      brand: "bg-aegean-600 hover:bg-aegean-700 text-white",
      icon: PHONE,
    },
    {
      key: "email",
      label: t.contact.email,
      href: links.mailto,
      external: false,
      brand: "bg-terracotta-500 hover:bg-terracotta-600 text-white",
      icon: MAIL,
    },
  ];
}

export function ChannelButton({
  channel,
  className = "",
  onClick,
}: {
  channel: ContactChannel;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={channel.href}
      onClick={onClick}
      {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold shadow-elev-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elev-2 active:translate-y-0 ${channel.brand} ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {channel.icon}
      </svg>
      {channel.label}
    </a>
  );
}

/** The contact block shown inside the booking section. */
export function ContactBlock() {
  const { t } = useLanguage();
  const channels = useContactChannels();

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-elev-1 dark:border-ink-border dark:bg-ink-surface dark:shadow-none">
      <p className="text-sm font-semibold text-aegean-900 dark:text-ink-text">{t.contact.heading}</p>
      <p className="mt-1 text-sm text-aegean-900/70 dark:text-ink-text/70">{t.contact.subtitle}</p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {channels.map((c) => (
          <ChannelButton key={c.key} channel={c} className="justify-center" />
        ))}
      </div>
    </div>
  );
}
