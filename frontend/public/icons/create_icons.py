from PIL import Image, ImageDraw
import os

def create_icon(size, filename):
    # Create a square image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Draw a circular gradient background
    center = size // 2
    radius = size // 2 - 10
    
    # Draw circle
    d.ellipse([center-radius, center-radius, center+radius, center+radius], 
              fill=(30, 64, 175, 255))  # Blue color
    
    # Add Arabic text "على خطاهم" in the center
    try:
        font_size = size // 8
        from PIL import ImageFont
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    text = "على خطاهم"
    bbox = d.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    d.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    # Save the icon
    img.save(filename)
    print(f"Created {filename} ({size}x{size})")

# Create the icons
create_icon(192, "d:/on-their-footsteps/frontend/public/icons/icon-192x192.png")
create_icon(512, "d:/on-their-footsteps/frontend/public/icons/icon-512x512.png")

print("\n✅ PWA icons created successfully!")
