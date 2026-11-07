"""Original geometric DataCore mark; optional authoring tool (Pillow), no fonts/assets downloaded."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
size = 1024
image = Image.new("RGB", (size, size), "#0D1726")
draw = ImageDraw.Draw(image)
# Offset panels and a continuous D-shaped data path; opaque square, no baked-in Apple mask.
draw.rounded_rectangle((146, 190, 792, 836), radius=132, fill="#1B293D")
draw.rounded_rectangle((202, 134, 848, 780), radius=132, fill="#7659E8")
draw.ellipse((320, 304, 712, 696), fill="#F2F5FA")
draw.rectangle((320, 304, 516, 696), fill="#F2F5FA")
draw.ellipse((392, 376, 640, 624), fill="#7659E8")
draw.rectangle((392, 376, 516, 624), fill="#7659E8")
draw.ellipse((656, 453, 750, 547), fill="#24C9C0")
path = ROOT / "DataCoreAI/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
image.save(path, optimize=True)
print(path)
