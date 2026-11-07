"""Choose two distinct installed iPhones on a supported runtime; never downloads SDKs."""

import argparse
import json
import re
from pathlib import Path


def version(text):
    if not re.fullmatch(r"\d+(?:\.\d+){0,2}", text):
        raise ValueError("Invalid SDK/runtime version")
    parts = tuple(map(int, text.split(".")))
    return parts + (0,) * (3 - len(parts))


def plan(payload, sdk):
    ceiling = version(sdk)
    candidates = []
    for runtime in payload.get("runtimes", []):
        if not runtime.get("isAvailable") or not runtime.get("name", "").startswith(
            "iOS "
        ):
            continue
        number = version(runtime["version"])
        if not (version("17") <= number <= ceiling):
            continue
        phones = [
            d
            for d in payload.get("devices", {}).get(runtime["identifier"], [])
            if d.get("isAvailable") and d.get("name", "").startswith("iPhone")
        ]
        if len({d["udid"] for d in phones}) < 2:
            continue
        small_names = [
            "iPhone SE (3rd generation)",
            "iPhone 16e",
            "iPhone 16",
            "iPhone 15",
        ]
        ordered = sorted(
            phones,
            key=lambda d: (
                small_names.index(d["name"]) if d["name"] in small_names else 99,
                d["name"],
                d["udid"],
            ),
        )
        small = ordered[0]
        remaining = [d for d in phones if d["udid"] != small["udid"]]
        large = sorted(
            remaining,
            key=lambda d: (
                "Pro Max" not in d["name"],
                "Plus" not in d["name"],
                d["name"],
                d["udid"],
            ),
        )[0]
        candidates.append(
            (number, {"runtime": runtime["name"], "small": small, "large": large})
        )
    if not candidates:
        raise ValueError(
            "Need two available iPhones with an installed iOS 17+ runtime compatible with the selected SDK"
        )
    return max(candidates, key=lambda item: item[0])[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file", type=Path)
    parser.add_argument("--sdk", required=True)
    args = parser.parse_args()
    print(
        json.dumps(
            plan(json.loads(args.json_file.read_text(encoding="utf-8")), args.sdk),
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
