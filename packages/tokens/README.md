# @solvex/tokens

Design tokens shared by `solvex-cms` and `solvex-webapp`.

- `tokens.css` — brand palette, type, radii, spacing, elevation, motion. Both apps.
- `cms.css` — back-office density scale. CMS only.

## Rules

No component may hardcode a color, radius, spacing value, or duration. Every
visual value comes from a variable in this package. The webapp design has not
been supplied yet, so a restyle must remain a token-file edit rather than a
sweep across every page.

The CMS deliberately uses 36px controls, overriding the 44px minimum in
`claude-code-design-system.md`. That rule is a touch-target rule and stays
binding on the customer-facing webapp; the CMS is desktop-only and clears
WCAG 2.2 AA's 24x24 target minimum.
