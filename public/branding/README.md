# Brand assets

The main artwork comes from `tamuperiod_assets`; the sponsor logos were added separately. Only assets used by the site are kept in this repository:

| File | Use |
| --- | --- |
| `public/branding/logo.svg` | Header, footer, loading, and error wordmark |
| `public/branding/flower.svg` | Decorative flower in the sponsor section |
| `public/branding/aauw.png` and `whoop.png` | Sponsor logos on light cards |
| `public/illustrations/hero.svg` | Landing illustration |
| `app/icon.png` | Browser and app icon |
| `app/opengraph-image.png` | Social link preview |
| `public/images/products/{pad,tampon,liner}.png` | Product stock cards; replace these with transparent photos using the same names |

The logo and hero are vector assets, so their duplicate PNG exports are not kept here. The logo SVG has a tighter view box to show the complete mark without cropping in CSS. The `flower-1.svg` export is the light flower used in the footer; the other size variants are not needed. The active brand red is `#B8204A` in `app/globals.css`. The image paths used by components live in `lib/branding.ts`.

The AAUW and WHOOP placeholder graphics in `tamuperiod_assets` were not copied. The current sponsor PNGs have opaque backgrounds, so the page displays them on light cards. Their cards link to the organizations' Instagram pages configured in `lib/branding.ts`. `campus.jpg` is a photo placeholder and is not used.

The footer's “Request a new location” Google Form URL is also configured in `lib/branding.ts`.
