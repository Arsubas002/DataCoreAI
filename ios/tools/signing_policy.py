"""Check signing scope and paths without treating validation as a native build."""

from pathlib import Path
import re

SIMULATOR_SETTINGS = {
    "CODE_SIGNING_ALLOWED": "YES",
    "CODE_SIGNING_REQUIRED": "YES",
    "CODE_SIGN_IDENTITY": "-",
    "CODE_SIGN_STYLE": "Manual",
    "DEVELOPMENT_TEAM": "",
    "PROVISIONING_PROFILE_SPECIFIER": "",
}
EMPTY_SIGNING_SETTINGS = frozenset(
    {"DEVELOPMENT_TEAM", "PROVISIONING_PROFILE_SPECIFIER"}
)


def effective_signing_value(values, key):
    # xcodebuild may omit empty settings. Only selectors that must be unset can default to empty.
    return values.get(key, "" if key in EMPTY_SIGNING_SETTINGS else None)


def signing_snapshot(payload):
    """Allowlisted diagnostics retained on failure; never copy arbitrary build environment values."""
    observations = []
    if not isinstance(payload, list):
        return observations
    for entry in payload:
        if not isinstance(entry, dict) or not isinstance(
            entry.get("buildSettings"), dict
        ):
            continue
        values = entry["buildSettings"]
        name = entry.get("target")
        # Target names come from the project graph; unexpected names need not be logged verbatim.
        safe_name = (
            name
            if name
            in {
                "DataCoreAI",
                "DataCoreAITests",
                "DataCoreAIUITests",
                "DataCoreDomain",
                "DataCoreDomain_DataCoreDomain",
            }
            else "<other target>"
        )
        settings = {}
        for key, expected in SIMULATOR_SETTINGS.items():
            raw = values.get(key)
            allowed = {
                "CODE_SIGNING_ALLOWED": {"YES", "NO"},
                "CODE_SIGNING_REQUIRED": {"YES", "NO"},
                "CODE_SIGN_STYLE": {"Manual", "Automatic"},
                "CODE_SIGN_IDENTITY": {"-", ""},
            }.get(key, {""})
            safe = (
                raw
                if raw is None or isinstance(raw, str) and raw in allowed
                else "<redacted unexpected value>"
            )
            settings[key] = {
                "present": key in values,
                "value": safe,
                "expected": expected,
                "matches": effective_signing_value(values, key) == expected,
            }
        path = values.get("CODE_SIGN_ENTITLEMENTS")
        root = values.get("SRCROOT")
        path_ok = (
            isinstance(path, str)
            and isinstance(root, str)
            and Path(path) == Path(root) / "Config/Simulator.entitlements"
        )
        exists = None
        if path_ok:
            try:
                exists = Path(path).is_file()
            except (OSError, ValueError):
                exists = False
        settings["CODE_SIGN_ENTITLEMENTS"] = {
            "present": "CODE_SIGN_ENTITLEMENTS" in values,
            "value": "$(SRCROOT)/Config/Simulator.entitlements"
            if path_ok
            else ""
            if path == ""
            else None
            if path is None
            else "<redacted unexpected path>",
            "absolute": isinstance(path, str) and Path(path).is_absolute(),
            "matches_srcroot": path_ok,
            "exists": exists,
        }
        observations.append({"target": safe_name, "settings": settings})
    return observations


ENTITLEMENTS = "$(SRCROOT)/Config/Simulator.entitlements"
CONDITION = "[sdk=iphonesimulator*]"


def configs(objects, owner):
    return {
        objects[ref]["name"]: objects[ref]["buildSettings"]
        for ref in objects[owner["buildConfigurationList"]]["buildConfigurations"]
    }


def validate_signing_scope(project, ios_root, script):
    if re.search(r"\bCODE_SIGN_ENTITLEMENTS\s*=", script):
        raise ValueError(
            "Global CODE_SIGN_ENTITLEMENTS leaks into Swift package targets"
        )
    objects = project["objects"]
    root = objects[project["rootObject"]]
    for settings in configs(objects, root).values():
        if any(key.startswith("CODE_SIGN") for key in settings):
            raise ValueError("Signing must belong to native targets, not the project")
    for ref in root["targets"]:
        target = objects[ref]
        for config, settings in configs(objects, target).items():
            entitlement_keys = [
                k for k in settings if k.startswith("CODE_SIGN_ENTITLEMENTS")
            ]
            expected = (
                {k + CONDITION: v for k, v in SIMULATOR_SETTINGS.items()}
                if config == "Debug"
                else {}
            )
            for key, value in expected.items():
                if settings.get(key) != value:
                    raise ValueError(
                        f"{target['name']} {config}: missing scoped ad hoc policy {key}"
                    )
            actual = {
                k: v
                for k, v in settings.items()
                if CONDITION in k and k not in entitlement_keys
            }
            if actual != expected:
                raise ValueError(
                    f"{target['name']} {config}: unexpected simulator override"
                )
            if config == "Debug" and target["name"] == "DataCoreAI":
                if (
                    entitlement_keys != ["CODE_SIGN_ENTITLEMENTS" + CONDITION]
                    or settings[entitlement_keys[0]] != ENTITLEMENTS
                ):
                    raise ValueError(
                        "App entitlements must be SRCROOT-based and Debug simulator only"
                    )
                if not (Path(ios_root) / "Config/Simulator.entitlements").is_file():
                    raise ValueError("App entitlements file does not exist")
            elif entitlement_keys:
                raise ValueError(
                    "Only the Debug simulator app needs explicit Keychain entitlements"
                )


def validate_resolved_signing(payload):
    observations = []
    for entry in payload:
        values = entry.get("buildSettings", {})
        name = entry.get("target")
        entitlements = values.get("CODE_SIGN_ENTITLEMENTS", "")
        if name == "DataCoreAI":
            expected = Path(values.get("SRCROOT", "")) / "Config/Simulator.entitlements"
            if (
                not entitlements
                or Path(entitlements) != expected
                or not expected.is_absolute()
                or not expected.is_file()
            ):
                raise ValueError(
                    "App entitlements must resolve to an existing absolute SRCROOT file"
                )
            mismatches = [
                key
                for key, value in SIMULATOR_SETTINGS.items()
                if effective_signing_value(values, key) != value
            ]
            if mismatches:
                raise ValueError(
                    "App effective Debug simulator ad hoc signing policy differs: "
                    + ", ".join(mismatches)
                )
            observations.append(
                {
                    "target": name,
                    "CODE_SIGN_ENTITLEMENTS": entitlements,
                    **{
                        key: effective_signing_value(values, key)
                        for key in SIMULATOR_SETTINGS
                    },
                }
            )
        elif entitlements:
            raise ValueError(
                f"{name}: unexpected inherited entitlements (including Swift package targets)"
            )
    if not observations:
        raise ValueError("Cannot verify simulator signing without app settings")
    return observations
