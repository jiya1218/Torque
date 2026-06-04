import sys
import os

try:
    from PIL import Image
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

def main():
    img_path = r"c:\one drive folder\Desktop\scalezix\Toruqfinal-main\frontend\assets\images\logo.png"
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return

    img = Image.open(img_path)
    img = img.convert("RGBA")
    
    # Get background color from top-left pixel
    bg_color = img.getpixel((0, 0))
    print(f"Detected background color: {bg_color}")
    
    datas = img.getdata()
    new_data = []
    
    # Let's remove pixels close to the background color or very light gray/white
    for item in datas:
        # Distance to detected background color
        dist = sum((item[i] - bg_color[i]) ** 2 for i in range(3)) ** 0.5
        
        # Also remove if it's very light gray/white (since background might have a gradient or compression artifacts)
        is_light = item[0] > 200 and item[1] > 200 and item[2] > 200
        
        if dist < 45 or is_light:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(img_path, "PNG")
    print("Successfully removed background from frontend logo.png!")

if __name__ == "__main__":
    main()
