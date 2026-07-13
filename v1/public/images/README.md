# Photos

`placeholder-1.jpg`, `placeholder-2.jpg`, `placeholder-3.jpg` are solid-color
stand-ins so the layout renders correctly before real photos are added.

To swap in real photos:

1. Add your image files to this folder (JPG or PNG, ideally already
   compressed — aim for well under 500KB each; Next.js will still optimize
   them on request, but smaller sources build/deploy faster).
2. Update the `images` array in [`content/siteConfig.ts`](../../content/siteConfig.ts)
   with the new filenames, in the order you want them to appear. The first
   image is used as the hero banner and the Open Graph / social-share image.
3. Delete the `placeholder-*.jpg` files once replaced.

Recommended: a wide (landscape, ~1600×1067 or similar) shot for the hero,
and a handful of square-ish shots for the gallery grid.
