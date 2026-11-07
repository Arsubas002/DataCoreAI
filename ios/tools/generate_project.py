"""Generador determinista, sin dependencias: ejecutar con Python >=3.10 desde Windows/macOS.
No compila Swift ni sustituye xcodebuild. Incluye el proyecto generado en Git.
"""

from hashlib import sha1
from pathlib import Path
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
objects = {}


def ident(name):
    return sha1(name.encode()).hexdigest()[:24].upper()


def obj(key_name, isa, **fields):
    key = ident(key_name)
    objects[key] = dict(isa=isa, **fields)
    return key


def serialize(value, level=0):
    if isinstance(value, dict):
        return (
            "{\n"
            + "".join(
                "\t" * (level + 1)
                + json.dumps(k)
                + " = "
                + serialize(v, level + 1)
                + ";\n"
                for k, v in value.items()
            )
            + "\t" * level
            + "}"
        )
    if isinstance(value, list):
        return "(" + ", ".join(serialize(v, level) for v in value) + ")"
    return json.dumps(str(value), ensure_ascii=False)


def file_ref(path, kind, source="<group>"):
    return obj(
        "file:" + path,
        "PBXFileReference",
        lastKnownFileType=kind,
        path=path,
        sourceTree=source,
    )


def build_file(name, ref=None, product=None):
    return obj(
        "build:" + name,
        "PBXBuildFile",
        **({"fileRef": ref} if ref else {"productRef": product}),
    )


package = obj(
    "local-package",
    "XCLocalSwiftPackageReference",
    relativePath="Packages/DataCoreDomain",
)
source_files = sorted((ROOT / "DataCoreAI/Sources").glob("*.swift"))
source_refs = [file_ref(p.name, "sourcecode.swift") for p in source_files]
sources_group = obj(
    "sources-group",
    "PBXGroup",
    children=source_refs,
    path="DataCoreAI/Sources",
    sourceTree="<group>",
)
resources = ["Assets.xcassets", "LaunchScreen.storyboard", "PrivacyInfo.xcprivacy"]
resource_refs = [
    file_ref(p, kind)
    for p, kind in zip(
        resources, ["folder.assetcatalog", "file.storyboard", "text.xml"]
    )
]
info = file_ref("Info.plist", "text.plist.xml")
resources_group = obj(
    "resource-group",
    "PBXGroup",
    children=resource_refs + [info],
    path="DataCoreAI/Resources",
    sourceTree="<group>",
)
config_refs = {
    name: file_ref(name + ".xcconfig", "text.xcconfig")
    for name in ["Base", "Debug", "Release"]
}
config_group = obj(
    "config-group",
    "PBXGroup",
    children=list(config_refs.values()),
    path="Config",
    sourceTree="<group>",
)
product_refs = []
targets = []
test_groups = []
for name, folder, product_type in [
    ("DataCoreAI", "DataCoreAI/Sources", "application"),
    ("DataCoreAITests", "DataCoreAITests", "bundle.unit-test"),
    ("DataCoreAIUITests", "DataCoreAIUITests", "bundle.ui-testing"),
]:
    is_app = name == "DataCoreAI"
    if is_app:
        refs = source_refs
    else:
        refs = [
            file_ref(name + "/" + p.name, "sourcecode.swift")
            for p in sorted((ROOT / folder).glob("*.swift"))
        ]
        test_groups.append(
            obj(
                name + "-group",
                "PBXGroup",
                children=refs,
                name=name,
                sourceTree="<group>",
            )
        )
    phase_sources = obj(
        name + "-sources",
        "PBXSourcesBuildPhase",
        buildActionMask="2147483647",
        files=[build_file(name + str(i), ref=r) for i, r in enumerate(refs)],
        runOnlyForDeploymentPostprocessing="0",
    )
    product_deps = []
    framework_files = []
    if name != "DataCoreAIUITests":
        dep = obj(
            name + "-domain",
            "XCSwiftPackageProductDependency",
            package=package,
            productName="DataCoreDomain",
        )
        product_deps.append(dep)
        framework_files.append(build_file(name + "-domain-link", product=dep))
    phase_frameworks = obj(
        name + "-frameworks",
        "PBXFrameworksBuildPhase",
        buildActionMask="2147483647",
        files=framework_files,
        runOnlyForDeploymentPostprocessing="0",
    )
    phase_resources = obj(
        name + "-resources",
        "PBXResourcesBuildPhase",
        buildActionMask="2147483647",
        files=[
            build_file("resource" + str(i), ref=r) for i, r in enumerate(resource_refs)
        ]
        if is_app
        else [],
        runOnlyForDeploymentPostprocessing="0",
    )
    config_ids = []
    for config in ["Debug", "Release"]:
        settings = {"PRODUCT_NAME": "$(TARGET_NAME)"}
        if is_app:
            config_ids.append(
                obj(
                    name + config,
                    "XCBuildConfiguration",
                    name=config,
                    baseConfigurationReference=config_refs[config],
                    buildSettings=settings,
                )
            )
        else:
            settings.update(
                {
                    "PRODUCT_BUNDLE_IDENTIFIER": "org.example.datacoreai."
                    + name.lower(),
                    "GENERATE_INFOPLIST_FILE": "YES",
                    "IPHONEOS_DEPLOYMENT_TARGET": "17.0",
                    "SWIFT_VERSION": "5.0",
                    "TARGETED_DEVICE_FAMILY": "1",
                    "CODE_SIGN_STYLE": "Automatic",
                    "SWIFT_OPTIMIZATION_LEVEL": "-Onone",
                }
            )
            if name == "DataCoreAITests":
                settings.update(
                    {
                        "TEST_HOST": "$(BUILT_PRODUCTS_DIR)/DataCoreAI.app/DataCoreAI",
                        "BUNDLE_LOADER": "$(TEST_HOST)",
                    }
                )
            else:
                settings["TEST_TARGET_NAME"] = "DataCoreAI"
            config_ids.append(
                obj(
                    name + config,
                    "XCBuildConfiguration",
                    name=config,
                    buildSettings=settings,
                )
            )
    configs = obj(
        name + "-config-list",
        "XCConfigurationList",
        buildConfigurations=config_ids,
        defaultConfigurationIsVisible="0",
        defaultConfigurationName="Release",
    )
    extension = ".app" if is_app else ".xctest"
    product = obj(
        name + "-product",
        "PBXFileReference",
        explicitFileType="wrapper.application" if is_app else "wrapper.cfbundle",
        includeInIndex="0",
        path=name + extension,
        sourceTree="BUILT_PRODUCTS_DIR",
    )
    product_refs.append(product)
    dependencies = []
    if not is_app:
        proxy = obj(
            name + "-proxy",
            "PBXContainerItemProxy",
            containerPortal=ident("project"),
            proxyType="1",
            remoteGlobalIDString=ident("DataCoreAI-target"),
            remoteInfo="DataCoreAI",
        )
        dependencies = [
            obj(
                name + "-dependency",
                "PBXTargetDependency",
                target=ident("DataCoreAI-target"),
                targetProxy=proxy,
            )
        ]
    target = obj(
        name + "-target",
        "PBXNativeTarget",
        buildConfigurationList=configs,
        buildPhases=[phase_sources, phase_frameworks, phase_resources],
        buildRules=[],
        dependencies=dependencies,
        name=name,
        packageProductDependencies=product_deps,
        productName=name,
        productReference=product,
        productType="com.apple.product-type." + product_type,
    )
    targets.append(target)
products = obj(
    "products", "PBXGroup", children=product_refs, name="Products", sourceTree="<group>"
)
main = obj(
    "main-group",
    "PBXGroup",
    children=[sources_group, resources_group, config_group] + test_groups + [products],
    sourceTree="<group>",
)
project_configs = []
for config in ["Debug", "Release"]:
    project_configs.append(
        obj(
            "project-" + config,
            "XCBuildConfiguration",
            name=config,
            buildSettings={
                "SDKROOT": "iphoneos",
                "CLANG_ENABLE_MODULES": "YES",
                "CLANG_ENABLE_OBJC_ARC": "YES",
                "SWIFT_EMIT_LOC_STRINGS": "YES",
                "DEBUG_INFORMATION_FORMAT": "dwarf"
                if config == "Debug"
                else "dwarf-with-dsym",
            },
        )
    )
project_list = obj(
    "project-list",
    "XCConfigurationList",
    buildConfigurations=project_configs,
    defaultConfigurationIsVisible="0",
    defaultConfigurationName="Release",
)
project = obj(
    "project",
    "PBXProject",
    attributes={
        "LastUpgradeCheck": "1640",
        "BuildIndependentTargetsInParallel": "YES",
        "TargetAttributes": {
            ident("DataCoreAITests-target"): {
                "TestTargetID": ident("DataCoreAI-target")
            },
            ident("DataCoreAIUITests-target"): {
                "TestTargetID": ident("DataCoreAI-target")
            },
        },
    },
    buildConfigurationList=project_list,
    compatibilityVersion="Xcode 14.0",
    developmentRegion="es",
    hasScannedForEncodings="0",
    knownRegions=["es", "en", "Base"],
    mainGroup=main,
    packageReferences=[package],
    productRefGroup=products,
    projectDirPath="",
    projectRoot="",
    targets=targets,
)
output = {
    "archiveVersion": "1",
    "classes": {},
    "objectVersion": "56",
    "objects": dict(sorted(objects.items())),
    "rootObject": project,
}
(ROOT / "DataCoreAI.xcodeproj/project.pbxproj").write_text(
    "// !$*UTF8*$!\n" + serialize(output) + "\n", encoding="utf-8", newline="\n"
)
# Shared scheme: unsigned simulator tests; signing and device archives are separate.
scheme = ET.Element("Scheme", LastUpgradeVersion="1640", version="1.7")
build = ET.SubElement(
    scheme, "BuildAction", parallelizeBuildables="YES", buildImplicitDependencies="YES"
)
entries = ET.SubElement(build, "BuildActionEntries")


def buildable(parent, name):
    ET.SubElement(
        parent,
        "BuildableReference",
        BuildableIdentifier="primary",
        BlueprintIdentifier=ident(name + "-target"),
        BuildableName=name + (".app" if name == "DataCoreAI" else ".xctest"),
        BlueprintName=name,
        ReferencedContainer="container:DataCoreAI.xcodeproj",
    )


for name in ["DataCoreAI", "DataCoreAITests", "DataCoreAIUITests"]:
    entry = ET.SubElement(
        entries,
        "BuildActionEntry",
        buildForTesting="YES",
        buildForRunning="YES" if name == "DataCoreAI" else "NO",
        buildForProfiling="YES" if name == "DataCoreAI" else "NO",
        buildForArchiving="YES" if name == "DataCoreAI" else "NO",
        buildForAnalyzing="YES",
    )
    buildable(entry, name)
test = ET.SubElement(
    scheme,
    "TestAction",
    buildConfiguration="Debug",
    selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB",
    selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB",
    shouldUseLaunchSchemeArgsEnv="YES",
)
testables = ET.SubElement(test, "Testables")
for name in ["DataCoreAITests", "DataCoreAIUITests"]:
    buildable(ET.SubElement(testables, "TestableReference", skipped="NO"), name)
launch = ET.SubElement(
    scheme,
    "LaunchAction",
    buildConfiguration="Debug",
    selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB",
    selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB",
    launchStyle="0",
    useCustomWorkingDirectory="NO",
    ignoresPersistentStateOnLaunch="NO",
    debugServiceExtension="internal",
    allowLocationSimulation="NO",
)
buildable(
    ET.SubElement(launch, "BuildableProductRunnable", runnableDebuggingMode="0"),
    "DataCoreAI",
)
profile = ET.SubElement(
    scheme,
    "ProfileAction",
    buildConfiguration="Release",
    shouldUseLaunchSchemeArgsEnv="YES",
    savedToolIdentifier="",
    useCustomWorkingDirectory="NO",
    debugDocumentVersioning="YES",
)
buildable(
    ET.SubElement(profile, "BuildableProductRunnable", runnableDebuggingMode="0"),
    "DataCoreAI",
)
ET.SubElement(scheme, "AnalyzeAction", buildConfiguration="Debug")
ET.SubElement(
    scheme,
    "ArchiveAction",
    buildConfiguration="Release",
    revealArchiveInOrganizer="YES",
)
ET.indent(scheme)
# ElementTree.write(filename) uses a text writer and translates LF to CRLF on
# Windows. Serialize to bytes so all platforms generate the identical scheme.
(ROOT / "DataCoreAI.xcodeproj/xcshareddata/xcschemes/DataCoreAI.xcscheme").write_bytes(
    ET.tostring(scheme, encoding="utf-8", xml_declaration=True)
)
print("Proyecto y esquema generados; no compilados.")
