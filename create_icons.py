import os
import zlib
import struct

def create_png(width, height, color_rgb=(14, 165, 233)):
    """Create a simple solid/gradient PNG with a medical cross using pure Python zlib/struct."""
    raw_data = bytearray()
    
    r_bg, g_bg, b_bg = color_rgb
    
    for y in range(height):
        raw_data.append(0) # filter type 0 (None)
        for x in range(width):
            # Draw a centered medical cross icon
            cx, cy = width / 2.0, height / 2.0
            dx, dy = abs(x - cx), abs(y - cy)
            
            # Cross arms definition
            w_arm = max(1, width // 6)
            h_arm = max(3, width // 2.5)
            
            is_cross = (dx <= w_arm and dy <= h_arm) or (dy <= w_arm and dx <= h_arm)
            is_border = (x <= 1 or x >= width - 2 or y <= 1 or y >= height - 2)
            
            if is_cross:
                r, g, b = 255, 255, 255
            elif is_border:
                r, g, b = 2, 132, 199
            else:
                # Radial gradient background
                dist = ((x - cx)**2 + (y - cy)**2)**0.5 / (width * 0.7)
                r = int(max(0, min(255, r_bg * (1 - dist*0.3))))
                g = int(max(0, min(255, g_bg * (1 - dist*0.3))))
                b = int(max(0, min(255, b_bg * (1 - dist*0.3))))
                
            raw_data.extend([r, g, b])

    compressed = zlib.compress(raw_data)
    
    def make_chunk(chunk_type, data):
        return struct.pack('>I', len(data)) + chunk_type + data + struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = make_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    idat = make_chunk(b'IDAT', compressed)
    iend = make_chunk(b'IEND', b'')

    return header + ihdr + idat + iend

def generate_extension_icons():
    icons_dir = os.path.join(os.path.dirname(__file__), "extension", "icons")
    os.makedirs(icons_dir, exist_ok=True)
    
    sizes = [16, 48, 128]
    for sz in sizes:
        path = os.path.join(icons_dir, f"icon{sz}.png")
        data = create_png(sz, sz)
        with open(path, "wb") as f:
            f.write(data)
        print(f"Generated {path} ({sz}x{sz})")

if __name__ == "__main__":
    generate_extension_icons()
