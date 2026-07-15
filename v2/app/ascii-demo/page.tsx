import { AsciiArt } from "@/components/ui/first-light";
import { siteConfig } from "@/content/siteConfig";

export default function AsciiArtDemo() {
  const heroImage = siteConfig.images[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-4 text-xl font-semibold text-aegean-900">
        AsciiArt component preview
      </h1>
      <div className="relative h-[440px] w-full overflow-hidden rounded-xl">
        <AsciiArt className="h-full w-full" poster={heroImage?.src} />
      </div>
      <p className="mt-3 text-sm text-aegean-700">
        Poster fallback is your hero photo ({heroImage?.src}); the looping
        animation itself is a fixed baked asset from the 21st.dev recipe and
        isn&apos;t generated from your photo.
      </p>
    </div>
  );
}
