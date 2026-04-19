import os
import glob
import re

pages_dir = r"c:\Dev\Roz-Lakshya\frontend\src\pages"
files = glob.glob(os.path.join(pages_dir, "*.jsx"))

for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace solid backgrounds with transparent or just remove them to let body gradient show
    new_content = content.replace("bg-[color:var(--background)]", "bg-transparent")
    # Also replace brand-page-bg since it's already on the body now
    new_content = new_content.replace("brand-page-bg", "")
    new_content = new_content.replace("bg-[color:var(--surface)]", "bg-transparent")
    
    if new_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {os.path.basename(path)}")
