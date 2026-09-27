import re
import urllib.request
import os

os.makedirs('src/assets/fda', exist_ok=True)
os.makedirs('public/fda', exist_ok=True)

# 1. Parse gallery.html
if os.path.exists('gallery.html'):
    with open('gallery.html', 'r', encoding='utf-8', errors='ignore') as f:
        gallery_html = f.read()

    gallery_imgs = re.findall(r'src="([^"]+files[^"]+\.(?:jpg|png|jpeg)[^"]*)"', gallery_html)
    print(f"Found {len(gallery_imgs)} images in gallery.html:")
    for img in set(gallery_imgs):
        print(" - ", img)

# 2. Extract National Seal of Liberia SVG
if os.path.exists('logo_test.svg'):
    with open('logo_test.svg', 'r', encoding='utf-8') as f:
        svg_raw = f.read()

    defs_match = re.search(r'(<defs>.*?</defs>)', svg_raw, re.DOTALL)
    defs_str = defs_match.group(1) if defs_match else ""

    # The coat of arms / national seal is in Layer_1-2 group up to Layer_2-2
    split_idx = svg_raw.find('<g id="Layer_2-2"')
    start_idx = svg_raw.find('<g id="Layer_1-2"')
    if split_idx != -1 and start_idx != -1:
        # cut from after <g id="Layer_1-2" ...> to before <g id="Layer_2-2"
        layer1_inner_start = svg_raw.find('>', start_idx) + 1
        seal_elements = svg_raw[layer1_inner_start:split_idx]
    else:
        seal_elements = ""

    seal_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 58.5 62.5" role="img" aria-label="Coat of Arms of the Republic of Liberia">
{defs_str}
<g id="liberia-national-seal">
{seal_elements}
</g>
</svg>'''

    with open('src/assets/liberia-seal.svg', 'w', encoding='utf-8') as f:
        f.write(seal_svg)
    with open('public/liberia-seal.svg', 'w', encoding='utf-8') as f:
        f.write(seal_svg)
    print("Saved src/assets/liberia-seal.svg and public/liberia-seal.svg")

# 3. Download the authentic photos from fda.gov.lr
images_to_download = [
    {
        "filename": "carbon-policy.jpg",
        "url": "https://www.fda.gov.lr/sites/default/files/styles/carouse_home_2/public/images/791383549_1049365104629599_2524496599796680014_n.jpg?itok=hkqxQtUe",
        "title": "National Carbon Market Policy",
        "caption": "Presented to President Joseph N. Boakai, Advancing Liberia's Climate Goals & Green Economy"
    },
    {
        "filename": "timber-trade-cooperation.jpg",
        "url": "https://www.fda.gov.lr/sites/default/files/styles/carouse_home_2/public/images/776102117_1035678779331565_4104093112615533426_n.jpg?itok=phrXso2g",
        "title": "Liberia & Ghana Bilateral Forestry",
        "caption": "Deepening Cooperation to Combat Illegal Timber Trade & Strengthen Chain of Custody (SGS LiberTrace)"
    },
    {
        "filename": "wood-processing-mou.jpg",
        "url": "https://www.fda.gov.lr/sites/default/files/styles/carouse_home_2/public/images/772685924_1032053936360716_4180120329542932049_n.jpg?itok=E010SLiq",
        "title": "Wood Processing & Youth Vocational Training",
        "caption": "FDA, MYS & MVTC Tripartite MOU for Shared Value-Addition Facilities in Wood Technology"
    },
    {
        "filename": "east-nimba-reserve.jpg",
        "url": "https://www.fda.gov.lr/sites/default/files/styles/carouse_home_2/public/images/fda%20aml%202.jpg?itok=VY5Hidf1",
        "title": "East Nimba Nature Reserve (ENNR)",
        "caption": "FDA and Partners Sign Landmark MOU for Collaborative Co-Management & Biodiversity Protection"
    },
    {
        "filename": "csa-capacity-training.jpg",
        "url": "https://www.fda.gov.lr/sites/default/files/styles/carouse_home_2/public/images/fda_csa_training.jpg?itok=tWOjHiuE",
        "title": "Institutional HR Capacity Building",
        "caption": "Civil Service Agency (CSA) Conducts Performance Planning Workshop for FDA Human Resource Cadre"
    },
    {
        "filename": "grebo-krahn-wildlife.jpg",
        "url": "https://www.fda.gov.lr/sites/default/files/styles/homepage_video_cover_style/public/covers/g-k1.jpg?h=a955cd85&itok=1pvrQOaI",
        "title": "Grebo-Krahn National Park Bio-Monitoring",
        "caption": "Camera Trap Bio-Surveillance Safeguarding Protected Wildlife Species in Liberia's Dense Rain Forest"
    },
    {
        "filename": "managing-director-merab.jpg",
        "url": "https://www.fda.gov.lr/sites/default/files/styles/president_and_ministers_head_on_home_page/public/2024-09/441030298_425986046957936_5105805787114323906_n.jpg?h=e10c3b49&itok=ul_9Q05g",
        "title": "Executive Leadership - FDA Liberia",
        "caption": "Hon. Rudolph J. Merab, Sr. - Managing Director, Steering FDA Modernization & Sustainable Forestry"
    }
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for item in images_to_download:
    dest_public = os.path.join('public/fda', item['filename'])
    dest_src = os.path.join('src/assets/fda', item['filename'])
    req = urllib.request.Request(item['url'], headers=headers)
    try:
        with urllib.request.urlopen(req) as resp, open(dest_public, 'wb') as out_f:
            data = resp.read()
            out_f.write(data)
        with open(dest_src, 'wb') as out_f2:
            out_f2.write(data)
        print(f"Successfully downloaded {item['filename']} ({len(data)} bytes)")
    except Exception as e:
        print(f"Failed to download {item['filename']}: {e}")

# Clean up temporary test files
for tmp in ['logo_test.svg', 'footer_seal_test.png', 'gallery.html']:
    if os.path.exists(tmp):
        os.remove(tmp)

print("Done asset extraction and download!")
