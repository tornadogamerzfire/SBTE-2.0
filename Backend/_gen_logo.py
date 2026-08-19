"""One-off script used to generate assets/logo.jpg. Not needed at runtime;
kept here in case the logo ever needs regenerating or resizing."""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = 512
INK = (10, 14, 19)
BLUEPRINT = (63, 169, 245)
BLUEPRINT_DARK = (26, 74, 117)
MARKER = (255, 176, 32)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

img = Image.new("RGB", (SIZE, SIZE), INK)
draw = ImageDraw.Draw(img)
pad = 30

# Drafting-sheet border: a thin blueprint-blue rounded rule inset from the
# edge, on the same flat ink field as the rest of the site — no gradient
# "app icon" badge, so the mark actually reads as part of the same drawing
# rather than a bolted-on sticker.
draw.rounded_rectangle([pad, pad, SIZE - pad, SIZE - pad], radius=96, outline=BLUEPRINT, width=6)

# ruler tick marks along the inner top edge (drafting-scale motif)
tick_y = pad + 50
for i in range(7):
    x = pad + 56 + i * 25
    h = 20 if i % 3 == 0 else 11
    draw.line([(x, tick_y), (x, tick_y - h)], fill=BLUEPRINT, width=4)

# bold monogram, solid blueprint fill so it stays legible down to 36px
font = ImageFont.truetype(FONT_BOLD, 248)
text = "S"
bbox = draw.textbbox((0, 0), text, font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
tx = (SIZE - tw) / 2 - bbox[0]
ty = (SIZE - th) / 2 - bbox[1] + 22
draw.text((tx, ty), text, font=font, fill=BLUEPRINT)

# "2.0" marker chip, bottom-right corner
mono = ImageFont.truetype(FONT_MONO, 50)
tag = "2.0"
tb = draw.textbbox((0, 0), tag, font=mono)
ttw, tth = tb[2] - tb[0], tb[3] - tb[1]
chip_pad_x, chip_pad_y = 24, 14
chip_w, chip_h = ttw + chip_pad_x * 2, tth + chip_pad_y * 2
chip_x = SIZE - pad - chip_w + 14
chip_y = SIZE - pad - chip_h + 14
draw.rounded_rectangle([chip_x, chip_y, chip_x + chip_w, chip_y + chip_h], radius=chip_h / 2, fill=MARKER)
draw.text((chip_x + chip_pad_x - tb[0], chip_y + chip_pad_y - tb[1]), tag, font=mono, fill=INK)

out_path = os.path.join(ROOT, "frontend", "assets", "logo.jpg")
img.save(out_path, quality=93)
print("Saved", out_path, img.size)
