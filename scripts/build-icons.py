"""Build all Expo icon variants for Surve from assets/icon-nobg.png.

Outputs:
  assets/icon.png              — 1024x1024 main app icon (liquid-glass gradient + S)
  assets/adaptive-icon.png     — 1024x1024 Android adaptive foreground (S only, safe zone)
  assets/splash-icon.png       — 1024x1024 splash image (S on solid bg)
  assets/favicon.png           — 48x48 web favicon
"""
from PIL import Image, ImageDraw, ImageFilter

SRC = "/root/projects/surve/assets/icon-nobg.png"
OUT_DIR = "/root/projects/surve/assets"
SIZE = 1024

# Brand palette
MIDNIGHT = (17, 29, 74)       # #111d4a
BRAND = (44, 66, 143)          # #2c428f
BRAND_LIGHT = (58, 79, 153)    # #3a4f99
ROYAL = (74, 108, 247)         # #4A6CF7
SPLASH_BG = (28, 45, 107)      # #1c2d6b


def diagonal_gradient(size, top_left, bottom_right):
    """Smooth diagonal gradient from TL to BR."""
    img = Image.new("RGB", (size, size), top_left)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            r = int(top_left[0] * (1 - t) + bottom_right[0] * t)
            g = int(top_left[1] * (1 - t) + bottom_right[1] * t)
            b = int(top_left[2] * (1 - t) + bottom_right[2] * t)
            px[x, y] = (r, g, b)
    return img


def radial_highlight(size, center, radius, color, alpha=90):
    """Soft radial highlight blob to add glassy sheen."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    d.ellipse((cx - radius, cy - radius, cx + radius, cy + radius),
              fill=(*color, alpha))
    return layer.filter(ImageFilter.GaussianBlur(radius // 2))


def soft_glow(mask, color, blur=40, intensity=0.6):
    """Coloured glow behind a shape, derived from its alpha mask."""
    alpha = mask.split()[-1]
    glow = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    glow_alpha = alpha.point(lambda a: int(a * intensity))
    solid = Image.new("RGBA", mask.size, (*color, 255))
    solid.putalpha(glow_alpha)
    return solid.filter(ImageFilter.GaussianBlur(blur))


def build_main_icon():
    bg = diagonal_gradient(SIZE, MIDNIGHT, BRAND)
    # top-left bright highlight (glassy)
    bg.paste(radial_highlight(SIZE, (SIZE // 4, SIZE // 5), SIZE // 2, ROYAL, 70),
             (0, 0), radial_highlight(SIZE, (SIZE // 4, SIZE // 5), SIZE // 2, ROYAL, 70))
    # subtle bottom-right darken via another radial
    dark = radial_highlight(SIZE, (int(SIZE * 0.85), int(SIZE * 0.9)), SIZE // 2,
                            (10, 16, 40), 110)
    bg.paste(dark, (0, 0), dark)

    # load the S logo, resize to ~82% of canvas with breathing room
    s = Image.open(SRC).convert("RGBA")
    target = int(SIZE * 0.82)
    s.thumbnail((target, target), Image.LANCZOS)

    # centre it
    pos = ((SIZE - s.width) // 2, (SIZE - s.height) // 2)

    # glow layer behind the S
    glow_canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_canvas.paste(s, pos, s)
    glow = soft_glow(glow_canvas, ROYAL, blur=48, intensity=0.75)

    out = bg.convert("RGBA")
    out = Image.alpha_composite(out, glow)
    out.paste(s, pos, s)
    out.convert("RGB").save(f"{OUT_DIR}/icon.png", "PNG")
    return out


def build_adaptive_foreground():
    """Android adaptive icon foreground — S on transparency with safe-zone margin.
    Android crops the outer ~33%, so foreground must fit inside the inner 66%."""
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    s = Image.open(SRC).convert("RGBA")
    target = int(SIZE * 0.60)  # safe zone
    s.thumbnail((target, target), Image.LANCZOS)
    pos = ((SIZE - s.width) // 2, (SIZE - s.height) // 2)
    canvas.paste(s, pos, s)
    canvas.save(f"{OUT_DIR}/adaptive-icon.png", "PNG")


def build_splash():
    """Splash — S centred on solid midnight-brand background."""
    bg = diagonal_gradient(SIZE, MIDNIGHT, BRAND)
    s = Image.open(SRC).convert("RGBA")
    target = int(SIZE * 0.55)
    s.thumbnail((target, target), Image.LANCZOS)
    pos = ((SIZE - s.width) // 2, (SIZE - s.height) // 2)
    glow_canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_canvas.paste(s, pos, s)
    glow = soft_glow(glow_canvas, ROYAL, blur=60, intensity=0.6)
    out = bg.convert("RGBA")
    out = Image.alpha_composite(out, glow)
    out.paste(s, pos, s)
    out.convert("RGB").save(f"{OUT_DIR}/splash-icon.png", "PNG")


def build_favicon():
    icon = Image.open(f"{OUT_DIR}/icon.png")
    icon.resize((48, 48), Image.LANCZOS).save(f"{OUT_DIR}/favicon.png", "PNG")


if __name__ == "__main__":
    build_main_icon()
    build_adaptive_foreground()
    build_splash()
    build_favicon()
    print("ok")
