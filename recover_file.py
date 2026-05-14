#!/usr/bin/env python3
"""
Matkotech website recovery utility.

What it does:
- Creates timestamped zip backups of the website.
- Restores a selected backup safely, with a pre-restore backup first.
- Verifies backup/file integrity using SHA-256 hashes.
- Runs a small local audit for missing asset references and risky links.

Works on Windows, Linux, and Kali Linux with Python 3.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKUP_DIR = ROOT / "_website_backups"
MANIFEST_NAME = "manifest.json"

EXCLUDED_DIRS = {
    ".git",
    ".idea",
    ".vscode",
    "__pycache__",
    "_website_backups",
    "node_modules",
}

EXCLUDED_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".tmp",
    ".log",
}

WEB_EXTENSIONS = {
    ".html",
    ".css",
    ".js",
    ".json",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".avif",
    ".gif",
    ".ico",
    ".md",
    ".bat",
    ".py",
}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def should_include(path: Path) -> bool:
    parts = set(path.relative_to(ROOT).parts)
    if parts & EXCLUDED_DIRS:
        return False
    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return False
    return path.is_file() and path.suffix.lower() in WEB_EXTENSIONS


def iter_site_files() -> list[Path]:
    return sorted(path for path in ROOT.rglob("*") if should_include(path))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(files: list[Path]) -> dict:
    return {
        "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "root": str(ROOT),
        "files": {
            rel(path): {
                "sha256": sha256_file(path),
                "size": path.stat().st_size,
            }
            for path in files
        },
    }


def backup(label: str | None = None) -> Path:
    BACKUP_DIR.mkdir(exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    safe_label = re.sub(r"[^A-Za-z0-9_-]+", "-", label.strip()) if label else "website"
    backup_path = BACKUP_DIR / f"{stamp}-{safe_label}.zip"

    files = iter_site_files()
    manifest = build_manifest(files)

    with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(MANIFEST_NAME, json.dumps(manifest, indent=2))
        for path in files:
            archive.write(path, rel(path))

    print(f"Backup created: {backup_path}")
    print(f"Files included: {len(files)}")
    return backup_path


def list_backups() -> list[Path]:
    BACKUP_DIR.mkdir(exist_ok=True)
    backups = sorted(BACKUP_DIR.glob("*.zip"), reverse=True)
    if not backups:
        print("No backups found.")
        return []

    for index, path in enumerate(backups, 1):
        size_mb = path.stat().st_size / (1024 * 1024)
        print(f"{index}. {path.name} ({size_mb:.2f} MB)")
    return backups


def read_manifest(backup_path: Path) -> dict:
    with zipfile.ZipFile(backup_path, "r") as archive:
        with archive.open(MANIFEST_NAME) as handle:
            return json.loads(handle.read().decode("utf-8"))


def verify_backup(backup_name: str | None = None) -> bool:
    backup_path = resolve_backup(backup_name)
    if not backup_path:
        return False

    manifest = read_manifest(backup_path)
    failures: list[str] = []

    with zipfile.ZipFile(backup_path, "r") as archive:
        for file_name, expected in manifest.get("files", {}).items():
            with archive.open(file_name) as handle:
                digest = hashlib.sha256(handle.read()).hexdigest()
            if digest != expected.get("sha256"):
                failures.append(file_name)

    if failures:
        print("Backup verification failed:")
        for item in failures:
            print(f"- {item}")
        return False

    print(f"Backup OK: {backup_path.name}")
    return True


def verify_current() -> bool:
    files = iter_site_files()
    missing = []
    unreadable = []

    for path in files:
        try:
            sha256_file(path)
        except OSError:
            unreadable.append(rel(path))

    if missing or unreadable:
        print("Current website verification found issues.")
        for item in unreadable:
            print(f"Unreadable: {item}")
        return False

    print(f"Current website files readable: {len(files)}")
    return True


def resolve_backup(backup_name: str | None) -> Path | None:
    BACKUP_DIR.mkdir(exist_ok=True)
    backups = sorted(BACKUP_DIR.glob("*.zip"), reverse=True)

    if not backups:
        print("No backups found.")
        return None

    if not backup_name:
        return backups[0]

    direct = BACKUP_DIR / backup_name
    if direct.exists():
        return direct

    matches = [path for path in backups if backup_name in path.name]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        print("Multiple backups matched. Use the full filename:")
        for path in matches:
            print(f"- {path.name}")
        return None

    print(f"Backup not found: {backup_name}")
    return None


def restore(backup_name: str | None, yes: bool) -> bool:
    backup_path = resolve_backup(backup_name)
    if not backup_path:
        return False

    if not verify_backup(backup_path.name):
        print("Restore stopped because backup verification failed.")
        return False

    print("A pre-restore backup will be created first.")
    backup("pre-restore")

    if not yes:
        print("Restore not started. Re-run with --yes to confirm.")
        print(f"Selected backup: {backup_path.name}")
        return False

    with zipfile.ZipFile(backup_path, "r") as archive:
        names = [name for name in archive.namelist() if name != MANIFEST_NAME]
        for name in names:
            target = (ROOT / name).resolve()
            if not str(target).startswith(str(ROOT)):
                raise RuntimeError(f"Unsafe path in backup: {name}")
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(name) as source, target.open("wb") as destination:
                shutil.copyfileobj(source, destination)

    print(f"Restore complete: {backup_path.name}")
    return True


def audit() -> bool:
    issues: list[str] = []
    html_files = sorted(ROOT.glob("*.html"))
    attr_pattern = re.compile(r"""(?:src|href)=["']([^"']+)["']""", re.IGNORECASE)

    for html_file in html_files:
        text = html_file.read_text(encoding="utf-8", errors="ignore")

        for match in attr_pattern.finditer(text):
            value = match.group(1).strip()
            if not value or value.startswith(("#", "mailto:", "tel:", "http://", "https://", "data:")):
                continue
            if value.lower().startswith("javascript:"):
                issues.append(f"{rel(html_file)}: javascript URL found: {value}")
                continue

            clean_value = value.split("?", 1)[0].split("#", 1)[0]
            if not clean_value:
                continue

            target = (html_file.parent / clean_value).resolve()
            if str(target).startswith(str(ROOT)) and not target.exists():
                issues.append(f"{rel(html_file)}: missing local file: {value}")

        for link_match in re.finditer(r"""<a\b[^>]*target=["']_blank["'][^>]*>""", text, re.IGNORECASE):
            tag = link_match.group(0)
            if "noopener" not in tag.lower():
                issues.append(f"{rel(html_file)}: target=_blank link missing rel=noopener")

    if issues:
        print("Audit found issues:")
        for issue in issues:
            print(f"- {issue}")
        return False

    print("Audit OK: no missing local assets or risky blank-target links found.")
    return True


def kali_notes() -> None:
    print(
        """
Kali Linux usage notes:
- This recovery tool is defensive only. It backs up, restores, verifies, and audits local website files.
- Run it from the website folder:
  python3 recover_file.py backup --label before-security-check
  python3 recover_file.py audit
  python3 recover_file.py verify-current
- If you use Kali tools, keep them scoped to your own local site/server only.
- Always create a backup before security testing.
""".strip()
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Matkotech website recovery and safety utility")
    sub = parser.add_subparsers(dest="command", required=True)

    backup_cmd = sub.add_parser("backup", help="Create a timestamped website backup")
    backup_cmd.add_argument("--label", help="Optional backup label", default=None)

    sub.add_parser("list", help="List available backups")

    restore_cmd = sub.add_parser("restore", help="Restore a backup")
    restore_cmd.add_argument("--backup", help="Backup filename or unique name fragment", default=None)
    restore_cmd.add_argument("--yes", action="store_true", help="Confirm restore")

    verify_backup_cmd = sub.add_parser("verify-backup", help="Verify a backup zip against its manifest")
    verify_backup_cmd.add_argument("--backup", help="Backup filename or unique name fragment", default=None)

    sub.add_parser("verify-current", help="Verify current site files are readable")
    sub.add_parser("audit", help="Run a local defensive website audit")
    sub.add_parser("kali-notes", help="Show safe Kali Linux usage notes")

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        if args.command == "backup":
            backup(args.label)
            return 0
        if args.command == "list":
            list_backups()
            return 0
        if args.command == "restore":
            return 0 if restore(args.backup, args.yes) else 1
        if args.command == "verify-backup":
            return 0 if verify_backup(args.backup) else 1
        if args.command == "verify-current":
            return 0 if verify_current() else 1
        if args.command == "audit":
            return 0 if audit() else 1
        if args.command == "kali-notes":
            kali_notes()
            return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
