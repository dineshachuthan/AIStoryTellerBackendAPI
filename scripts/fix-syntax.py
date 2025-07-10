#!/usr/bin/env python3
import re

# Read the file
with open('client/src/pages/story-library.tsx', 'r') as f:
    content = f.read()

# Fix the broken syntax
content = content.replace(r"(\{UIMessages.getLabel('STORY_PRIVATE_LABEL')\})", "({UIMessages.getLabel('STORY_PRIVATE_LABEL')})")

# Write back
with open('client/src/pages/story-library.tsx', 'w') as f:
    f.write(content)

print("Fixed syntax error in story-library.tsx")