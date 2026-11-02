#!/usr/bin/env python3
"""Build a deterministic, source-only recovery ZIP from a verified manifest.

No dependencies, network, credentials, git writes, or production access.
The manifest is verified by the Node inventory tool before packaging; each
file is rehashed immediately before inclusion to fail closed on changes.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

FIXED_TIME = (2020, 1, 1, 0, 0, 0)


def package(root: Path, manifest_path: Path, output: Path) -> tuple[int, str]:
    root = root.resolve(strict=True)
    manifest_path = manifest_path.resolve(strict=True)
    output = output.resolve()
    if not manifest_path.is_relative_to(root):
        raise ValueError("Manifest must be within the source root")
    if output == manifest_path:
        raise ValueError("Archive cannot overwrite manifest")
    script = root / "scripts" / "recovery-snapshot.mjs"
    subprocess.run(["node", str(script), "verify", str(root), str(manifest_path)], check=True,
                   stdout=subprocess.DEVNULL)
    manifest = json.loads(manifest_path.read_text("utf-8"))
    paths = [item["path"] for item in manifest["files"]]
    if paths != sorted(set(paths)) or "recovery-manifest.json" in paths:
        raise ValueError("Invalid manifest ordering or duplicate/self-reference")
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix(output.suffix + ".partial")
    try:
        with ZipFile(temp, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
            for item in manifest["files"]:
                rel = item["path"]
                if rel.startswith("/") or ".." in Path(rel).parts or "\\" in rel:
                    raise ValueError(f"Unsafe archive path: {rel}")
                source = root / rel
                if source.is_symlink() or not source.is_file():
                    raise ValueError(f"Not a regular source file: {rel}")
                data = source.read_bytes()
                if len(data) != item["bytes"] or hashlib.sha256(data).hexdigest() != item["sha256"]:
                    raise ValueError(f"Source changed after verification: {rel}")
                entry = ZipInfo(rel, FIXED_TIME)
                entry.compress_type = ZIP_DEFLATED
                entry.external_attr = (0o100644 << 16)
                archive.writestr(entry, data, compress_type=ZIP_DEFLATED, compresslevel=9)
            entry = ZipInfo("recovery-manifest.json", FIXED_TIME)
            entry.compress_type = ZIP_DEFLATED
            entry.external_attr = (0o100644 << 16)
            archive.writestr(entry, manifest_path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
        os.replace(temp, output)
    finally:
        if temp.exists():
            temp.unlink()
    return len(paths), hashlib.sha256(output.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--manifest", type=Path, default=Path("recovery-manifest.json"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    manifest = args.manifest if args.manifest.is_absolute() else root / args.manifest
    try:
        count, digest = package(root, manifest, args.output)
    except (ValueError, OSError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 1
    print(f"PASS: packaged {count} source files plus manifest; SHA-256 {digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
