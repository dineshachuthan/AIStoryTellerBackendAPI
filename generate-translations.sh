#!/bin/bash

# Generate i18n translations using OpenAI
# This is a MANUAL script - run it only when you need to update translations
# It will NOT run automatically during build/deploy

echo "🌐 Manual Translation Generation Script"
echo "======================================"
echo ""
echo "This script uses OpenAI to translate all UI text to supported languages."
echo "It should be run manually when you add new text or want to update translations."
echo ""
echo "Usage: ./generate-translations.sh"
echo ""
echo "The script will:"
echo "1. Read English text from shared/i18n-hierarchical.ts"
echo "2. Use OpenAI API to translate to es, fr, de, ja, zh, ko"
echo "3. Save results to shared/i18n-hierarchical-updated.ts"
echo "4. You review and rename to i18n-hierarchical.ts when ready"
echo ""
echo "Starting translation generation..."
echo ""

# Ensure OPENAI_API_KEY is available
if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ Error: OPENAI_API_KEY environment variable is not set"
  echo "Please set your OpenAI API key first"
  exit 1
fi

# Run the translation service
tsx server/i18n-translation-service.ts