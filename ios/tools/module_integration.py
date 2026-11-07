"""Static package/architecture policy and filtered Xcode diagnostics. No Xcode execution."""

import argparse
import json
from pathlib import Path
import re
import sys

from signing_policy import validate_resolved_signing


class IntegrationError(ValueError):
    pass


def configurations(objects, owner):
    listing = objects[owner["buildConfigurationList"]]
    return {
        objects[ref]["name"]: objects[ref]["buildSettings"]
        for ref in listing["buildConfigurations"]
    }


def validate_project(project):
    objects = project["objects"]
    root = objects[project["rootObject"]]
    settings = configurations(objects, root)
    for name, expected in [("Debug", "YES"), ("Release", "NO")]:
        if settings[name].get("ONLY_ACTIVE_ARCH") != expected:
            raise IntegrationError(
                f"Project {name} must set ONLY_ACTIVE_ARCH={expected}"
            )
    packages = {
        ref
        for ref in root.get("packageReferences", [])
        if objects[ref]["isa"] == "XCLocalSwiftPackageReference"
        and objects[ref]["relativePath"] == "Packages/DataCoreDomain"
    }
    if len(packages) != 1:
        raise IntegrationError(
            "DataCoreDomain local package must belong to the project"
        )
    for target in (objects[ref] for ref in root["targets"]):
        for name, values in configurations(objects, target).items():
            effective = {**settings[name], **values}
            if effective["ONLY_ACTIVE_ARCH"] != ("YES" if name == "Debug" else "NO"):
                raise IntegrationError(
                    f"{target['name']} {name} overrides the shared architecture policy"
                )
            if any(
                key.startswith("EXCLUDED_ARCHS") or key.startswith("ARCHS")
                for key in effective
            ):
                raise IntegrationError(
                    "Do not pin or exclude architectures to hide a package module mismatch"
                )
        if target["name"] not in ["DataCoreAI", "DataCoreAITests"]:
            continue
        deps = {
            ref
            for ref in target.get("packageProductDependencies", [])
            if objects[ref].get("productName") == "DataCoreDomain"
            and objects[ref].get("package") in packages
        }
        linked = {
            objects[ref].get("productRef")
            for phase in target["buildPhases"]
            if objects[phase]["isa"] == "PBXFrameworksBuildPhase"
            for ref in objects[phase]["files"]
        }
        if len(deps) != 1 or not deps.issubset(linked):
            raise IntegrationError(
                f"{target['name']} must link its declared DataCoreDomain product"
            )


def validate_resolved_settings(payload):
    """Check Xcode's effective settings, including command-line/xcconfig overrides.

    ARCHS is recorded, not assumed to be filtered by -showBuildSettings: the build
    planner may apply ONLY_ACTIVE_ARCH later. Never store the unfiltered JSON/env.
    """
    if not isinstance(payload, list):
        raise IntegrationError("Expected Xcode settings as a JSON array")
    observations = []
    for entry in payload:
        if not isinstance(entry, dict) or not isinstance(
            entry.get("buildSettings", {}), dict
        ):
            raise IntegrationError("Malformed Xcode build settings entry")
        name = entry.get("target")
        if name not in ["DataCoreAI", "DataCoreAITests", "DataCoreAIUITests"]:
            continue
        values = entry.get("buildSettings", {})
        if (
            values.get("CONFIGURATION") != "Debug"
            or values.get("PLATFORM_NAME") != "iphonesimulator"
            or values.get("ONLY_ACTIVE_ARCH") != "YES"
        ):
            raise IntegrationError(
                f"{name}: Debug simulator must use ONLY_ACTIVE_ARCH=YES, matching SwiftPM Debug"
            )
        observations.append(
            {
                "target": name,
                **{
                    key: values.get(key)
                    for key in [
                        "CONFIGURATION",
                        "PLATFORM_NAME",
                        "ONLY_ACTIVE_ARCH",
                        "ARCHS",
                        "NATIVE_ARCH_ACTUAL",
                        "SDKROOT",
                    ]
                },
            }
        )
    if not any(item["target"] == "DataCoreAI" for item in observations):
        raise IntegrationError(
            "Xcode settings did not include DataCoreAI; cannot verify module architecture policy"
        )
    return observations


def diagnose_log(text):
    produced = set()
    consumers = {}
    first_error = None
    for number, line in enumerate(text.splitlines(), 1):
        if first_error is None and re.search(r"\berror:", line):
            first_error = {"line": number, "message": line.strip()}
        if re.search(r"(?:^|\s)Copy\s", line):
            produced.update(
                re.findall(
                    r"DataCoreDomain\.swiftmodule/([A-Za-z0-9_]+)-apple-ios-simulator\.swiftmodule",
                    line,
                )
            )
        match = re.search(
            r"-module-name\s+(DataCoreAI|DataCoreAITests)\s.*?-target\s+([A-Za-z0-9_]+)-apple-ios[\d.]+-simulator\b",
            line,
        )
        if match:
            consumers.setdefault(match.group(1), set()).add(match.group(2))
    requested = set().union(*consumers.values()) if consumers else set()
    return {
        "produced_domain_slices_in_log": sorted(produced),
        "consumer_architectures": {
            key: sorted(value) for key, value in consumers.items()
        },
        "requested_slices_not_observed": sorted(requested - produced),
        "first_compiler_error": first_error,
        "note": "Diagnostic only: cached slices may not be copied again. Interpret with build status/settings; never replaces compiler results.",
    }


def main():
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--resolved-settings", action="store_true")
    modes.add_argument("--log", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        payload = json.load(sys.stdin) if args.resolved_settings else None
        report = (
            {
                "verified": True,
                "targets": validate_resolved_settings(payload),
                "signing": validate_resolved_signing(payload),
            }
            if args.resolved_settings
            else diagnose_log(args.log.read_text(encoding="utf-8", errors="replace"))
        )
        code = 0
    except (IntegrationError, ValueError, OSError, TypeError) as error:
        report = {"verified": False, "error": str(error)}
        code = 2
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    raise SystemExit(code)


if __name__ == "__main__":
    main()
