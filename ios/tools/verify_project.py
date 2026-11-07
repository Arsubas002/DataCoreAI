"""Validación estructural real; no es una compilación Xcode."""

from pathlib import Path
import difflib
import json
import plistlib
import runpy
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
project = ROOT / "DataCoreAI.xcodeproj/project.pbxproj"
scheme = ROOT / "DataCoreAI.xcodeproj/xcshareddata/xcschemes/DataCoreAI.xcscheme"
before = (project.read_bytes(), scheme.read_bytes())
generated = runpy.run_path(str(ROOT / "tools/generate_project.py"))
after = (project.read_bytes(), scheme.read_bytes())
if before != after:
    for label, original, actual in zip(
        ["project.pbxproj", "DataCoreAI.xcscheme"], before, after
    ):
        if original != actual:
            print(label, "bytes before/after:", len(original), len(actual))
            print(
                "".join(
                    list(
                        difflib.unified_diff(
                            original.decode("utf-8").splitlines(True),
                            actual.decode("utf-8").splitlines(True),
                            fromfile="committed",
                            tofile="generated",
                        )
                    )[:80]
                )
            )
    raise AssertionError("Regenera el proyecto y revisa el diff")
objects = generated["objects"]
for value in objects.values():
    for field in [
        "children",
        "buildPhases",
        "dependencies",
        "buildConfigurations",
        "packageProductDependencies",
        "packageReferences",
    ]:
        assert all(item in objects for item in value.get(field, [])), field
    for field in [
        "fileRef",
        "productRef",
        "productReference",
        "buildConfigurationList",
        "mainGroup",
        "productRefGroup",
        "target",
        "targetProxy",
        "containerPortal",
        "package",
    ]:
        if field in value:
            assert value[field] in objects, field
assert len([o for o in objects.values() if o["isa"] == "PBXNativeTarget"]) == 3
info = plistlib.loads((ROOT / "DataCoreAI/Resources/Info.plist").read_bytes())
assert "NSAppTransportSecurity" not in info
assert not [k for k in info if k.endswith("UsageDescription")]
for name in ["LaunchScreen.storyboard"]:
    ET.parse(ROOT / "DataCoreAI/Resources" / name)
ET.parse(scheme)
privacy = plistlib.loads(
    (ROOT / "DataCoreAI/Resources/PrivacyInfo.xcprivacy").read_bytes()
)
assert privacy["NSPrivacyTracking"] is False
icon = ROOT / "DataCoreAI/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
data = icon.read_bytes()
assert (
    data[:8] == b"\x89PNG\r\n\x1a\n"
    and int.from_bytes(data[16:20], "big") == 1024
    and data[25] == 2
)
root = ROOT.parent
expected = (root / "contracts/demo-v1.json").read_bytes()
assert expected == (root / "api/datacore_api/resources/demo-v1.json").read_bytes()
assert (
    expected
    == (
        ROOT / "Packages/DataCoreDomain/Sources/DataCoreDomain/Resources/demo-v1.json"
    ).read_bytes()
)
assert (
    sum(
        line["quantity"] * line["unit_price_minor"]
        for sale in json.loads(expected)["sales"]
        for line in sale["lines"]
    )
    == 134770
)
print(
    "Referencias, generación determinista, XML/plists, icono opaco y fixtures: correctos."
)
