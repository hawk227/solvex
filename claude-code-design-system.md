# Claude Code Design System Specification

> Version: 1.0 Purpose: This document is the single source of truth for
> all UI generation. Every page, component, and layout **must** follow
> these standards. Never invent values outside this specification.

------------------------------------------------------------------------

# 1. Core Principles

-   Mobile-first.
-   Accessibility first (WCAG AA minimum).
-   Consistent 8px spacing rhythm.
-   Use design tokens only.
-   Never hardcode colors, spacing, typography, shadows, or radii.
-   Prefer simplicity over decoration.
-   One visual hierarchy.
-   Semantic HTML only.

------------------------------------------------------------------------

# 2. Breakpoints

  Name       Width
  ------ ---------
  xs       \<576px
  sm        ≥576px
  md        ≥768px
  lg        ≥992px
  xl       ≥1200px
  2xl      ≥1440px

------------------------------------------------------------------------

# 3. Containers

  Breakpoint     Max Width   Side Padding
  ------------ ----------- --------------
  Mobile              100%           16px
  Tablet              100%           24px
  Desktop           1280px           32px
  Wide              1440px           48px

------------------------------------------------------------------------

# 4. Grid

-   12 columns
-   Desktop gutter: 24px
-   Tablet gutter: 20px
-   Mobile gutter: 16px
-   Use CSS Grid for page layouts.
-   Use Flexbox inside components.

------------------------------------------------------------------------

# 5. Spacing Tokens

  Token        Value
  ---------- -------
  space-0          0
  space-1        4px
  space-2        8px
  space-3       12px
  space-4       16px
  space-5       20px
  space-6       24px
  space-8       32px
  space-10      40px
  space-12      48px
  space-16      64px
  space-20      80px
  space-24      96px

Rules: - Large sections: 96px - Medium sections: 64px - Small sections:
48px - Card padding: 24--32px - Card gap: 24px - Form row gap: 16px

------------------------------------------------------------------------

# 6. Typography

Base font: Inter

Root size: 16px

  Style       Size   Weight   Line Height
  --------- ------ -------- -------------
  Display       64      700           1.1
  H1            48      700           1.2
  H2            40      700           1.2
  H3            32      600           1.3
  H4            24      600           1.3
  H5            20      600           1.4
  H6            18      600           1.4
  Body          16      400           1.6
  Small         14      400           1.5
  Caption       12      400           1.4

Maximum readable width: 70ch.

------------------------------------------------------------------------

# 7. Colors

Define using CSS variables.

``` css
:root{
 --color-primary:#2563eb;
 --color-secondary:#6366f1;
 --color-success:#16a34a;
 --color-warning:#f59e0b;
 --color-danger:#dc2626;
 --color-background:#ffffff;
 --color-surface:#f8fafc;
 --color-text:#0f172a;
 --color-muted:#64748b;
 --color-border:#e2e8f0;
}
```

Dark mode must provide equivalent semantic tokens.

------------------------------------------------------------------------

# 8. Radius

-   xs:4px
-   sm:8px
-   md:12px
-   lg:16px
-   xl:24px
-   pill:9999px

------------------------------------------------------------------------

# 9. Shadows

-   sm
-   md
-   lg

Use subtle elevation only.

------------------------------------------------------------------------

# 10. Buttons

-   Height: 44px minimum
-   Large: 52px
-   Radius: md
-   Horizontal padding: 20--24px
-   Visible focus ring
-   Disabled opacity 50%

------------------------------------------------------------------------

# 11. Forms

-   Input height: 48px
-   Textarea min:120px
-   Label gap:8px
-   Error text:12px

------------------------------------------------------------------------

# 12. Components

Every component must define: - Default - Hover - Active - Focus -
Disabled - Loading - Mobile layout

Components: - Navbar - Hero - Cards - Pricing - Features - FAQ -
Testimonials - Tables - Modal - Drawer - Tabs - Accordion - Toast -
Tooltip - Badge - Pagination - Footer

------------------------------------------------------------------------

# 13. Responsive Rules

Desktop: - 96px section spacing

Tablet: - 72px

Mobile: - 56px

Typography scales down proportionally.

------------------------------------------------------------------------

# 14. Animation

-   Hover:150ms
-   Default:200ms
-   Modal:300ms
-   Use transform + opacity.
-   Avoid layout animations.

------------------------------------------------------------------------

# 15. Accessibility

-   WCAG AA
-   Keyboard navigable
-   Semantic landmarks
-   Visible focus
-   44x44px touch targets
-   Respect prefers-reduced-motion

------------------------------------------------------------------------

# 16. Performance

-   Lazy-load images
-   Modern formats
-   Minimize JS
-   Avoid CLS
-   Optimize LCP

------------------------------------------------------------------------

# 17. SEO

-   One H1
-   Structured headings
-   Meta title
-   Meta description
-   Open Graph
-   Canonical URL

------------------------------------------------------------------------

# 18. Tailwind Rules

-   Extend theme from tokens.
-   Never use arbitrary values.
-   No inline styles.
-   Prefer utility classes.

------------------------------------------------------------------------

# 19. Code Standards

-   React + TypeScript
-   Strict mode
-   Functional components
-   Reusable components
-   Feature-based folders

------------------------------------------------------------------------

# 20. AI Rules (MANDATORY)

1.  Never invent spacing.
2.  Never invent typography.
3.  Never use arbitrary Tailwind values.
4.  Use tokens only.
5.  Every page has one H1.
6.  Maximum text width 70ch.
7.  Prefer Grid for layouts.
8.  Prefer Flex inside components.
9.  Never hardcode colors.
10. Never hardcode shadows.
11. Never mix border radii.
12. Every interactive element has hover and focus states.
13. Always produce accessible HTML.
14. Maintain visual consistency across pages.

------------------------------------------------------------------------

# 21. Project Structure

``` text
src/
  app/
  components/
    ui/
    layout/
    sections/
  hooks/
  lib/
  styles/
  types/
```

------------------------------------------------------------------------

# 22. Design Tokens (JSON)

``` json
{
  "spacing":{"1":"4px","2":"8px","4":"16px","6":"24px","8":"32px","12":"48px","16":"64px","24":"96px"},
  "radius":{"sm":"8px","md":"12px","lg":"16px","xl":"24px"},
  "container":"1280px",
  "gutter":"24px",
  "buttonHeight":"44px",
  "inputHeight":"48px"
}
```

------------------------------------------------------------------------

# Final Rule

If a design decision is not explicitly covered in this document, prefer
the most conservative, accessible, minimal, and consistent
implementation. Never invent new tokens; extend this specification
first.
