# fixtures

HTML saved to disk so tests never touch the network. Two sets:

- **`phuketmaid/`** — a site with the problems this product exists to find:
  phone number as plain text, no LINE button, no sticky CTA, thin service page,
  duplicate titles, no schema, stock photography only.
- **`goodsite/`** — the same shape done well, so the rules are shown to stay
  quiet when there is nothing wrong. A rule that fires on everything is worse
  than no rule.

To record a real site later, save the raw HTML here rather than adding a test
that fetches it. `pnpm test` must stay free and offline.
