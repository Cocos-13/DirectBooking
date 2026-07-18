import { siteConfig } from "@/content/siteConfig";

/**
 * All contact links derived from the single phone/email in siteConfig, so
 * the tel:, WhatsApp (wa.me) and Viber deep links can never drift apart.
 * WhatsApp and Viber share the same number per the property's setup.
 *
 * `whatsappBase` has no prefilled text — callers append `?text=<encoded>`
 * with a localized message, since the greeting differs per language.
 */
export function contactLinks() {
  const phone = siteConfig.contact.phone; // e.g. "+30 6936983364"
  const intl = phone.replace(/[^\d+]/g, ""); // "+306936983364"
  const digits = intl.replace(/\D/g, ""); // "306936983364"

  return {
    phoneDisplay: phone,
    tel: `tel:${intl}`,
    whatsappBase: `https://wa.me/${digits}`,
    viber: `viber://chat?number=%2B${digits}`,
    email: siteConfig.contact.email,
    mailto: `mailto:${siteConfig.contact.email}`,
  };
}

/** WhatsApp click-to-chat link with a prefilled, URL-encoded message. */
export function whatsappLink(prefill: string): string {
  return `${contactLinks().whatsappBase}?text=${encodeURIComponent(prefill)}`;
}
