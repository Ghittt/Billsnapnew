---
description: Validate provider URL mappings before deployment
---

# URL Validation Workflow

Run this workflow before any deployment or after updating the scraping logic.

## Steps

// turbo
1. Run the provider URL validation tests:
\`\`\`bash
npx tsx scripts/validate-provider-urls.ts
\`\`\`

2. If tests fail, fix the issues in \`src/utils/offerUrls.ts\` before proceeding.

3. After fixing, run the tests again to confirm all pass.

## What the tests check:

- **Static Mappings**: All known providers map to correct URLs
- **False Positive Prevention**: Providers like "Sorgenia" don't match "Eni" check
- **Database Coverage**: All providers in DB have a mapping (not fallback)

## When to run:

- Before every deployment
- After modifying \`offerUrls.ts\`
- After running \`sync-offers\` scraping
- After adding new providers to database
