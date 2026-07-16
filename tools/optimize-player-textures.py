#!/usr/bin/env python3
"""Convert the free avatar's chosen color textures to lightweight runtime WebP."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-root', required=True, help='Directory containing the Textures folder or its contents')
    parser.add_argument('--output', required=True, help='Runtime texture output directory')
    parser.add_argument('--manifest', required=True, help='Output JSON manifest')
    return parser.parse_args()


def slug(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def resolve_texture_root(path: Path) -> Path:
    direct = path / 'Textures'
    if direct.is_dir():
        return direct
    if path.name.lower() == 'textures' and path.is_dir():
        return path
    matches = [entry for entry in path.rglob('Textures') if entry.is_dir()]
    if len(matches) == 1:
        return matches[0]
    raise FileNotFoundError(f'Could not locate one Textures directory under {path}')


def main() -> None:
    args = parse_args()
    root = resolve_texture_root(Path(args.source_root).expanduser().resolve())
    output = Path(args.output).expanduser().resolve()
    manifest_path = Path(args.manifest).expanduser().resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    rows = []
    for source in sorted(root.rglob('*')):
        if not source.is_file():
            continue
        lower = source.stem.lower()
        technical = any(word in lower for word in ['normal', 'mormal', 'metallic', 'smoothness', 'specular', 'glossiness'])
        if technical:
            continue
        relative = source.relative_to(root)
        parts = [slug(part) for part in relative.parts]
        destination_relative = Path(*parts[:-1]) / (slug(source.stem) + '.webp')
        destination = output / destination_relative
        destination.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(source) as image:
            image.load()
            original_size = image.size
            max_dimension = 384 if relative.parts[0].lower() in {'eyes', 'eyelashes'} else 768
            scale = min(1.0, max_dimension / max(image.size))
            if scale < 1:
                image = image.resize(
                    (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                    Image.Resampling.BILINEAR,
                )
            image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
            image.save(destination, 'WEBP', quality=78, method=0)
            runtime_size = image.size

        data = destination.read_bytes()
        rows.append({
            'source': str(relative).replace('\\', '/'),
            'path': str(destination_relative).replace('\\', '/'),
            'originalSize': original_size,
            'runtimeSize': runtime_size,
            'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest(),
        })

    manifest = {
        'sourceModelId': '3901952',
        'creator': 'sunboxgames',
        'format': 'webp',
        'files': rows,
        'totalBytes': sum(row['bytes'] for row in rows),
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    if len(rows) != 47:
        raise RuntimeError(f'Expected 47 color/alpha textures, generated {len(rows)}')
    print(f"[player-avatar] optimized {len(rows)} textures, {manifest['totalBytes']} bytes")


if __name__ == '__main__':
    main()
