# setup_media.py
from PIL import Image, ImageDraw, ImageFont
import os
import subprocess
import sys

def create_placeholder_image(name, filename, size=(500, 500)):
    """Create a placeholder image with text"""
    img = Image.new('RGB', size, color=(229, 231, 235))
    d = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("arial.ttf", 40)
    except:
        font = ImageFont.load_default()
    
    d.text((50, 200), name, fill=(0, 0, 0), font=font)
    img.save(f'backend/static/images/characters/{filename}')

def create_silent_audio(filename, duration=60):
    """Create a silent audio file"""
    try:
        from pydub import AudioSegment
        silent_audio = AudioSegment.silent(duration=duration*1000)
        silent_audio.export(f'backend/static/audio/{filename}', format='mp3')
        return True
    except Exception as e:
        print(f"    ⚠️  Could not create {filename}: {str(e)}")
        return False

print("Setting up media files...")

# Create placeholder images
print("Creating placeholder images...")
create_placeholder_image("أبو بكر الصديق", "abu_bakr_profile.jpg")
create_placeholder_image("أبو بكر 1", "abu_bakr_1.jpg")
create_placeholder_image("أبو بكر 2", "abu_bakr_2.jpg")
create_placeholder_image("أبو بكر 3", "abu_bakr_3.jpg")

# Create placeholder audio files
print("\nCreating placeholder audio files...")
audio_files = [
    ('abu_bakr_story_1.mp3', 120),
    ('abu_bakr_story_2.mp3', 180),
    ('abu_bakr_quotes.mp3', 30)
]

# Check if FFmpeg is available
try:
    subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    ffmpeg_available = True
except:
    ffmpeg_available = False
    print("    ⚠️  FFmpeg not found. Audio files will not be created.")
    print("    To install FFmpeg on Windows:")
    print("    1. Download from https://ffmpeg.org/download.html")
    print("    2. Extract and add to PATH")

success_count = 0
for filename, duration in audio_files:
    if ffmpeg_available:
        if create_silent_audio(filename, duration):
            success_count += 1
    else:
        # Create empty files as placeholders
        with open(f'backend/static/audio/{filename}', 'wb') as f:
            f.write(b'')
        print(f"    Created empty placeholder: {filename}")

if ffmpeg_available:
    print(f"    ✅ Successfully created {success_count}/{len(audio_files)} audio files")
else:
    print(f"    Created {len(audio_files)} placeholder audio files (empty)")

print("\n✅ Media setup complete!")
print("\nNote: Images have been created successfully.")
if not ffmpeg_available:
    print("Audio files are empty placeholders. Install FFmpeg to generate actual audio.")