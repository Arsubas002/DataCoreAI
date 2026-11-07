"""Inventory and hash produced files; never fabricates XCTest/simulator results."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def collect(directory, exit_code, phase):
    directory = Path(directory).resolve()
    files = []
    for path in sorted(directory.rglob("*")):
        if (
            not path.is_file()
            or path.is_symlink()
            or path.name == "evidence-manifest.json"
        ):
            continue
        digest = hashlib.sha256()
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        files.append(
            {
                "path": path.relative_to(directory).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": digest.hexdigest(),
            }
        )
    try:
        sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
        dirty = bool(
            subprocess.check_output(["git", "status", "--porcelain"], text=True).strip()
        )
    except (OSError, subprocess.SubprocessError):
        sha, dirty = None, None
    return {
        "source_sha": sha,
        "source_dirty": dirty,
        "exit_code": exit_code,
        "last_phase": phase,
        "files": files,
        "note": "File inventory only; inspect toolchain, XCTest summaries and logs for actual native results.",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True, type=Path)
    parser.add_argument("--exit-code", required=True, type=int)
    parser.add_argument("--phase", required=True)
    args = parser.parse_args()
    report = collect(args.directory, args.exit_code, args.phase)
    (args.directory / "evidence-manifest.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
