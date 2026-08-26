# Gallery photos

Drop image files directly into this folder - `.jpg`, `.jpeg`, `.png`, `.webp`,
or `.gif`. Nothing else to do: the `/gallery` page ([Gallery.jsx](../../pages/Gallery.jsx))
auto-loads every image in here at build time via `import.meta.glob`, sorted
by filename, so there's no manifest to edit and no upload form involved.

Photos don't need to be pre-resized to match each other - the gallery grid
displays every tile at the same square size and crops each photo to fit
(CSS `object-fit: cover`), so mixed portrait/landscape photos all still line
up cleanly. Clicking a tile opens the untouched, uncropped original in a
full-size lightbox.

A couple of things worth knowing:
- Filenames control display order (alphabetical) - prefix with numbers
  (`01-`, `02-`, ...) if you want a specific sequence.
- These files get committed to the git repo and bundled into the production
  build, so keep an eye on total size/count if you're adding a lot of
  full-resolution photos - a phone photo folder dumped in wholesale will
  bloat both the repo and the deployed bundle. Downscaling to something
  like 1600px on the long edge before dropping it in here keeps things fast
  without any visible loss on the gallery grid or lightbox.
