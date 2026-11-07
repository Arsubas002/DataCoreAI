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
assert all(b"\r\n" not in content for content in after), "Los artefactos deben usar LF"
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
    and int.from_bytes(data[20:24], "big") == 1024
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


# Resolve every checked-in source/resource/configuration from the PBX group graph.
def verify_files(identifier, parent):
    item = objects[identifier]
    if item.get("sourceTree") == "BUILT_PRODUCTS_DIR":
        return
    location = parent / item.get("path", "")
    if item["isa"] == "PBXGroup":
        for child in item.get("children", []):
            verify_files(child, location)
    elif item["isa"] == "PBXFileReference":
        assert location.is_file() or location.is_dir(), str(location)


verify_files(generated["main"], ROOT)
for value in objects.values():
    if value["isa"] == "XCLocalSwiftPackageReference":
        assert (ROOT / value["relativePath"] / "Package.swift").is_file()
    if value["isa"] == "PBXNativeTarget":
        sources = [
            objects[p]
            for p in value["buildPhases"]
            if objects[p]["isa"] == "PBXSourcesBuildPhase"
        ]
        assert len(sources) == 1 and sources[0]["files"], value["name"]
        if value["name"] == "DataCoreAI":
            names = {
                objects[objects[ref]["fileRef"]]["path"] for ref in sources[0]["files"]
            }
            assert names == {
                p.name for p in (ROOT / "DataCoreAI/Sources").glob("*.swift")
            }
            resources = next(
                objects[p]
                for p in value["buildPhases"]
                if objects[p]["isa"] == "PBXResourcesBuildPhase"
            )
            names = {
                objects[objects[ref]["fileRef"]]["path"] for ref in resources["files"]
            }
            assert names == {
                "Assets.xcassets",
                "LaunchScreen.storyboard",
                "PrivacyInfo.xcprivacy",
            }
tree = ET.parse(scheme)
assert tree.find("TestAction").attrib["buildConfiguration"] == "Debug"
assert tree.find("ArchiveAction").attrib["buildConfiguration"] == "Release"
assert len(tree.findall("TestAction/Testables/TestableReference")) == 2
base = (ROOT / "Config/Base.xcconfig").read_text(encoding="utf-8")
assert (
    "IPHONEOS_DEPLOYMENT_TARGET = 17.0" in base and "TARGETED_DEVICE_FAMILY = 1" in base
)
release = (ROOT / "Config/Release.xcconfig").read_text(encoding="utf-8")
assert (
    "SWIFT_OPTIMIZATION_LEVEL = -O" in release and "ENABLE_TESTABILITY = NO" in release
)
print(
    "Fuentes/recursos, paquete local, targets, esquema Debug/Release y mínimo iOS 17: correctos."
)
