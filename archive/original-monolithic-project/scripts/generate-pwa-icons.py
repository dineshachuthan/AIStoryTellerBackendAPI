#!/usr/bin/env python3
"""
Generate placeholder PWA icons for the storytelling app
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    # Create a new image with blue background
    img = Image.new('RGB', (size, size), color='#3b82f6')
    draw = ImageDraw.Draw(img)
    
    # Add a simple story book icon shape
    margin = size // 8
    book_width = size - (2 * margin)
    book_height = int(book_width * 0.8)
    book_top = (size - book_height) // 2
    
    # Draw book shape
    draw.rectangle(
        [margin, book_top, size - margin, book_top + book_height],
        fill='white',
        outline='#2563eb',
        width=2
    )
    
    # Draw spine
    spine_x = size // 2
    draw.line(
        [(spine_x, book_top), (spine_x, book_top + book_height)],
        fill='#2563eb',
        width=3
    )
    
    # Add some "pages" effect
    for i in range(3):
        offset = (i + 1) * 3
        draw.line(
            [(margin + offset, book_top + offset), 
             (spine_x - offset, book_top + offset)],
            fill='#e5e7eb',
            width=1
        )
        draw.line(
            [(spine_x + offset, book_top + offset), 
             (size - margin - offset, book_top + offset)],
            fill='#e5e7eb',
            width=1
        )
    
    # Add text
    try:
        # Try to use a better font if available
        font_size = size // 8
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    text_x = (size - text_width) // 2
    text_y = book_top + (book_height - text_height) // 2
    
    draw.text((text_x, text_y), text, fill='#2563eb', font=font)
    
    # Save the image
    img.save(output_path, 'PNG')
    print(f"Created {output_path}")

# Ensure the public directory exists
public_dir = 'client/public'
if not os.path.exists(public_dir):
    os.makedirs(public_dir)

# Generate icons
create_icon(192, os.path.join(public_dir, 'icon-192x192.png'))
create_icon(512, os.path.join(public_dir, 'icon-512x512.png'))

print("PWA icons generated successfully!")