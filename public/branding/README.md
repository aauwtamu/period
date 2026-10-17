# Brand assets for tamuperiod.

The working name is **tamuperiod.**, lowercase, including the final period.
All logo slots are currently explicit placeholders.

| Asset                      | Drop-in file                 | Preferred dimensions                                                  |
| -------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| Organization logo          | `public/branding/logo.svg`   | SVG viewBox about 400 × 160; transparent PNG alternative 800 × 320 px |
| Square brand mark          | `public/branding/mark.svg`   | 512 × 512 viewBox or PNG; simple enough to read at 32 px              |
| AAUW logo                  | `public/branding/aauw.svg`   | SVG 320 × 160; transparent PNG alternative 640 × 320 px               |
| WHOOP logo                 | `public/branding/whoop.svg`  | SVG 320 × 160; transparent PNG alternative 640 × 320 px               |
| Final favicon              | `app/favicon.ico`            | ICO with 32 × 32 and 48 × 48 versions; start from the 512 px mark     |
| Optional share image       | `app/opengraph-image.png`    | 1200 × 630 px PNG/JPG                                                 |
| Optional campus/team photo | `public/branding/campus.jpg` | At least 1200 × 1200 px; centered subject with generous crop space    |

After adding the main logo, replace the badge in
`components/branding/logo-placeholder.tsx` with a Next Image element. Set sponsor
`imageSrc` and official website `href` values in `lib/branding.ts`. Do not guess
which social platform a handle belongs to.

Fonts are provided through next/font: Nunito 900 for display headings and Geist
for body/UI. No uploads are required. For an official alternative, provide licensed
WOFF2 files in regular and bold weights.

Waves, flowers, and the care-kit illustration are SVG components in the repository.
The temporary flower favicon is defined by favicon.svg here; replace it when the
final mark is available. This asset is code-native, not a generated photograph.
