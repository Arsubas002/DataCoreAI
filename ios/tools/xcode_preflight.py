"""Observe the actual selected Xcode/SDK. No installation, signing or network calls."""

import argparse
import json
import os
from pathlib import Path
import platform
import re
import subprocess


class PreflightError(ValueError):
    pass


def check_versions(xcode_output, sdk_output, expected):
    match = re.search(r"^Xcode (\d+(?:\.\d+){0,2})\s*$", xcode_output, re.MULTILINE)
    if not match or match.group(1) != expected:
        raise PreflightError(
            "Actual xcodebuild version does not match the explicitly selected version"
        )
    if not re.fullmatch(r"\d+(?:\.\d+){0,2}", sdk_output.strip()):
        raise PreflightError("Cannot verify the installed simulator SDK")
    if int(sdk_output.strip().split(".")[0]) < 26:
        raise PreflightError(
            "SDK 26+ is required for the current App Store preparation baseline"
        )
    return {"xcode_version": match.group(1), "simulator_sdk": sdk_output.strip()}


def inspect(developer_dir, expected, command=subprocess.check_output):
    directory = Path(developer_dir)
    if not directory.is_dir():
        raise PreflightError(
            "Selected DEVELOPER_DIR does not exist; no fallback or SDK download was attempted"
        )
    xcode = command(
        ["xcodebuild", "-version"], text=True, stderr=subprocess.STDOUT, timeout=30
    )
    sdk = command(
        ["xcrun", "--sdk", "iphonesimulator", "--show-sdk-version"],
        text=True,
        stderr=subprocess.STDOUT,
        timeout=30,
    )
    return {**check_versions(xcode, sdk, expected), "xcodebuild_output": xcode}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    directory = os.environ.get("DEVELOPER_DIR", "")
    report = {
        "platform": platform.system(),
        "requested_developer_dir": directory,
        "expected_xcode": os.environ.get("DATACORE_EXPECTED_XCODE", "26.3"),
        "observed_applications": sorted(
            str(p) for p in Path("/Applications").glob("Xcode*.app")
        ),
        "verified": False,
    }
    result = 0
    try:
        if not directory:
            raise PreflightError("Set DEVELOPER_DIR explicitly before starting")
        report.update(inspect(directory, report["expected_xcode"]))
        report["verified"] = True
    except (PreflightError, OSError, subprocess.SubprocessError) as error:
        report["error"] = str(error)
        if isinstance(error, subprocess.CalledProcessError) and error.output:
            report["diagnostic"] = str(error.output)[-8192:]
        result = 2
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(result)


if __name__ == "__main__":
    main()
