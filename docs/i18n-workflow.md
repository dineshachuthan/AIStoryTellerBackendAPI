# i18n Translation Workflow

## When to Generate Translations

Run the translation script manually when:
1. You add new UI text to the application
2. You modify existing English text
3. You want to update/improve translations

## How to Generate Translations

1. Make sure your OPENAI_API_KEY is set in environment
2. Run the translation script:
   ```bash
   chmod +x generate-translations.sh
   ./generate-translations.sh
   ```
3. Review the generated file: `shared/i18n-hierarchical-updated.ts`
4. If translations look good, replace the original:
   ```bash
   mv shared/i18n-hierarchical-updated.ts shared/i18n-hierarchical.ts
   ```
5. Commit the updated translations to your repository

## Best Practice

- Generate translations during development, not deployment
- Review translations before committing
- Keep translations in version control
- Only regenerate when text changes

## Why Not Automatic?

- Translations are static content that rarely changes
- Running during build wastes time and money
- Translations should be reviewed before going live
- Build process should be deterministic