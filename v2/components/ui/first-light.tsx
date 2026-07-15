"use client"

// AsciiArt — "First Light", made with the 21st.dev ASCII editor and baked
// to its exact rendered output (looping video + poster). Zero dependencies:
// one <video> that fills its parent. Drop it behind or inside your content:
// <div className="relative h-96"><AsciiArt className="absolute inset-0" /></div>
// Remix the source recipe (styles, animation, palette) in the editor:
// https://21st.dev/community/ascii/editor?from=fa5bb64a-9033-43bd-869f-e9e7b27078e4
export function AsciiArt({
  className,
  poster,
}: {
  className?: string
  /** Optional override for the fallback image shown before the video loads/plays. */
  poster?: string
}) {
  return (
    <video
      className={className}
      src={"https://assets.21st.dev/ascii-recipes/videos/user_2nElBLvklOKlAURm6W1PTu6yYFh/1783480443172-htanr6.mp4"}
      poster={poster ?? "https://assets.21st.dev/ascii-recipes/thumbnails/user_2nElBLvklOKlAURm6W1PTu6yYFh/fa5bb64a-9033-43bd-869f-e9e7b27078e4.jpg"}
      autoPlay
      loop
      muted
      playsInline
      aria-label={"First Light — animated ASCII art"}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  )
}
