"""
Выгрузка картинок с eurodrivers.com.ua (наш сайт на Tilda).

Без флагов — только список: какие картинки на каких страницах и сколько весят.
--download — скачивает оригиналы в img-original/<папка страницы>/ (папка в .gitignore).
--compress — сжимает img-original/ в img/: крупные растровые картинки в WebP, остальное копией.
Картинки, которые есть на нескольких страницах, идут в папку common/.

Запуск из корня проекта:
    python scripts/download_images.py
    python scripts/download_images.py --download
    python scripts/download_images.py --compress   (нужен Pillow: pip install Pillow)
"""

import argparse
import re
import shutil
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

SITE = "https://eurodrivers.com.ua"
PAGES = {
    "home": "/",
    "kod95": "/kod95ukr",
    "chipcard": "/chipcard",
    "contacts": "/contacts",
}
ROOT = Path(__file__).resolve().parent.parent
ORIGINAL_DIR = ROOT / "img-original"
IMG_DIR = ROOT / "img"
USER_AGENT = "Mozilla/5.0 (image export for own site)"

RASTER = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MAX_WIDTH = 1920
WEBP_QUALITY = 80
KEEP_AS_IS_BYTES = 50 * 1024  # иконки и мелочь не пережимаем

IMAGE_URL = re.compile(
    r"https?://(?:static|thb)\.tildacdn\.[a-z]+/[^\"'()\s<>]+?\.(?:jpe?g|png|webp|svg|gif)",
    re.IGNORECASE,
)
BLOCKS_CSS_URL = re.compile(r"https?://static\.tildacdn\.[a-z]+/ws/[^\"'\s]+\.css[^\"'\s]*")


def fetch(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        return response.read()


def to_original(url: str) -> str | None:
    """Превью thb.tildacdn (…/tild…/-/resize/20x/name.jpg) → оригинал static.tildacdn (…/tild…/name.jpg)."""
    parsed = urlparse(url)
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) < 2 or not parts[0].startswith("tild"):
        return None  # системные картинки Tilda, например значок «Made on Tilda»
    host = parsed.netloc.replace("thb.", "static.", 1)
    return f"https://{host}/{parts[0]}/{parts[-1]}"


def collect_page_images(path: str) -> set[str]:
    """Картинки из HTML страницы и из CSS её блоков (там фоновые картинки)."""
    html = fetch(SITE + path).decode("utf-8", errors="replace")
    sources = [html]
    for css_url in set(BLOCKS_CSS_URL.findall(html)):
        sources.append(fetch(css_url).decode("utf-8", errors="replace"))
    found = set()
    for text in sources:
        for url in IMAGE_URL.findall(text):
            original = to_original(url)
            if original:
                found.add(original)
    return found


def head(url: str) -> tuple[str, int]:
    """ETag (отпечаток содержимого) и размер в байтах, без скачивания. Если узнать не удалось — (url, -1)."""
    request = Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=30) as response:
            return response.headers.get("ETag") or url, int(response.headers.get("Content-Length", -1))
    except OSError:
        return url, -1


def unique_images(pages: dict[str, set[str]]) -> tuple[dict[str, str], dict[str, int]]:
    """
    Одна и та же картинка, загруженная в Tilda несколько раз, становится одним файлом.
    Возвращает: картинка → папка (своя страница или common) и картинка → размер.
    """
    all_urls = sorted(set().union(*pages.values()))
    with ThreadPoolExecutor(max_workers=8) as pool:
        heads = dict(zip(all_urls, pool.map(head, all_urls)))

    first_by_etag = {}
    pages_by_url = {}
    for url in all_urls:
        first = first_by_etag.setdefault(heads[url][0], url)
        pages_by_url.setdefault(first, set()).update(f for f, urls in pages.items() if url in urls)

    folder_by_url = {u: next(iter(fs)) if len(fs) == 1 else "common" for u, fs in pages_by_url.items()}
    sizes = {u: heads[u][1] for u in folder_by_url}
    return folder_by_url, sizes


def target_paths(folder_by_url: dict[str, str]) -> dict[str, Path]:
    """Имена файлов как в оригинале; совпадающие внутри папки получают суффикс -2, -3…"""
    paths = {}
    taken = set()
    for url in sorted(folder_by_url):
        name = Path(urlparse(url).path)
        folder = ORIGINAL_DIR / folder_by_url[url]
        candidate = folder / f"{name.stem}{name.suffix.lower()}"
        n = 2
        while candidate in taken:
            candidate = folder / f"{name.stem}-{n}{name.suffix.lower()}"
            n += 1
        taken.add(candidate)
        paths[url] = candidate
    return paths


def list_and_download(download: bool) -> None:
    pages = {folder: collect_page_images(path) for folder, path in PAGES.items()}
    folder_by_url, sizes = unique_images(pages)
    paths = target_paths(folder_by_url)

    total = 0
    for folder in [*PAGES, "common"]:
        urls = sorted((u for u, f in folder_by_url.items() if f == folder), key=lambda u: -sizes[u])
        if not urls:
            continue
        folder_size = sum(max(sizes[u], 0) for u in urls)
        total += folder_size
        print(f"\n{folder}/ — {len(urls)} шт., {folder_size / 1024 / 1024:.1f} МБ")
        for url in urls:
            size = "?" if sizes[url] < 0 else f"{sizes[url] / 1024:.0f} КБ"
            print(f"  {paths[url].name:<40} {size:>8}")
    print(f"\nВсего: {len(paths)} шт., {total / 1024 / 1024:.1f} МБ")

    if download:
        for url, path in paths.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(fetch(url))
        print(f"Скачано в {ORIGINAL_DIR}")


def compress_all() -> None:
    """img-original/ → img/: крупные растровые картинки в WebP не шире MAX_WIDTH, остальное копией."""
    from PIL import Image  # нужен только здесь, чтобы список работал и без Pillow

    before = after = 0
    for source in sorted(ORIGINAL_DIR.rglob("*")):
        if not source.is_file():
            continue
        target = IMG_DIR / source.relative_to(ORIGINAL_DIR)
        target.parent.mkdir(parents=True, exist_ok=True)
        size = source.stat().st_size
        note = ""

        if source.suffix.lower() in RASTER and size > KEEP_AS_IS_BYTES:
            webp = target.with_suffix(".webp")
            with Image.open(source) as image:
                image = image.convert("RGBA" if image.has_transparency_data else "RGB")
                if image.width > MAX_WIDTH:
                    image = image.resize((MAX_WIDTH, round(image.height * MAX_WIDTH / image.width)), Image.LANCZOS)
                image.save(webp, "WEBP", quality=WEBP_QUALITY, method=6)
                note = f"{image.width}x{image.height}"
            if webp.stat().st_size < size:
                target = webp
            else:
                webp.unlink()  # WebP вышел тяжелее оригинала — оставляем оригинал
                shutil.copyfile(source, target)
        else:
            shutil.copyfile(source, target)

        before += size
        after += target.stat().st_size
        print(f"  {target.relative_to(IMG_DIR).as_posix():<40} {size / 1024:>6.0f} → {target.stat().st_size / 1024:>5.0f} КБ  {note}")
    print(f"\nБыло {before / 1024 / 1024:.1f} МБ, стало {after / 1024 / 1024:.1f} МБ")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--download", action="store_true", help="скачать оригиналы в img-original/")
    parser.add_argument("--compress", action="store_true", help="сжать img-original/ в img/")
    args = parser.parse_args()

    if args.compress:
        compress_all()
    else:
        list_and_download(args.download)


if __name__ == "__main__":
    main()
