"""Regression for the first real Xcode failure; no Apple SDK required."""

from copy import deepcopy
import importlib.util
from pathlib import Path
import runpy
import unittest

TOOLS = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "module_integration", TOOLS / "module_integration.py"
)
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)


class ModuleIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.generated = runpy.run_path(str(TOOLS / "generate_project.py"))["output"]

    def configs(self, project, name=None):
        objects = project["objects"]
        root = objects[project["rootObject"]]
        owner = (
            root
            if name is None
            else next(
                objects[ref] for ref in root["targets"] if objects[ref]["name"] == name
            )
        )
        return policy.configurations(objects, owner)

    def test_shared_policy_and_product_bindings_are_valid(self):
        policy.validate_project(self.generated)
        self.assertEqual(
            self.configs(self.generated)["Debug"]["ONLY_ACTIVE_ARCH"], "YES"
        )
        self.assertEqual(
            self.configs(self.generated)["Release"]["ONLY_ACTIVE_ARCH"], "NO"
        )

    def test_recreates_old_generator_omission(self):
        project = deepcopy(self.generated)
        del self.configs(project)["Debug"]["ONLY_ACTIVE_ARCH"]
        with self.assertRaisesRegex(policy.IntegrationError, "Debug.*ONLY_ACTIVE_ARCH"):
            policy.validate_project(project)

    def test_target_cannot_restore_universal_debug_over_package(self):
        project = deepcopy(self.generated)
        self.configs(project, "DataCoreAITests")["Debug"]["ONLY_ACTIVE_ARCH"] = "NO"
        with self.assertRaisesRegex(policy.IntegrationError, "overrides"):
            policy.validate_project(project)

    def test_product_must_be_linked_not_just_declared(self):
        project = deepcopy(self.generated)
        objects = project["objects"]
        app = next(
            v
            for v in objects.values()
            if v["isa"] == "PBXNativeTarget" and v["name"] == "DataCoreAI"
        )
        phase = next(
            objects[ref]
            for ref in app["buildPhases"]
            if objects[ref]["isa"] == "PBXFrameworksBuildPhase"
        )
        phase["files"] = []
        with self.assertRaisesRegex(policy.IntegrationError, "link.*DataCoreDomain"):
            policy.validate_project(project)

    def test_package_must_belong_to_project(self):
        project = deepcopy(self.generated)
        project["objects"][project["rootObject"]]["packageReferences"] = []
        with self.assertRaisesRegex(policy.IntegrationError, "local package"):
            policy.validate_project(project)

    def settings(self, arch="arm64", active="YES"):
        return [
            {
                "target": "DataCoreAI",
                "buildSettings": {
                    "CONFIGURATION": "Debug",
                    "PLATFORM_NAME": "iphonesimulator",
                    "ONLY_ACTIVE_ARCH": active,
                    "ARCHS": arch,
                    "NATIVE_ARCH_ACTUAL": arch,
                    "UNRELATED_PRIVATE_VALUE": "never-copy-this",
                },
            }
        ]

    def test_real_settings_allow_arm_and_intel_without_pins_or_raw_environment(self):
        for arch in ["arm64", "x86_64"]:
            report = policy.validate_resolved_settings(self.settings(arch))
            self.assertEqual(report[0]["ARCHS"], arch)
            self.assertNotIn("UNRELATED_PRIVATE_VALUE", report[0])

    def test_effective_override_or_absent_target_fails_closed(self):
        for data in [
            self.settings(active="NO"),
            [],
            {},
            [{"target": "DataCoreAI", "buildSettings": None}],
        ]:
            with self.assertRaises(policy.IntegrationError):
                policy.validate_resolved_settings(data)

    def test_unit_test_target_also_needs_matching_debug_policy(self):
        data = self.settings()
        second = deepcopy(data[0])
        second["target"] = "DataCoreAITests"
        second["buildSettings"]["ONLY_ACTIVE_ARCH"] = "NO"
        data.append(second)
        with self.assertRaisesRegex(policy.IntegrationError, "DataCoreAITests"):
            policy.validate_resolved_settings(data)

    def test_replay_of_actual_failed_compiler_trace_finds_missing_intel_slice(self):
        text = (TOOLS / "tests/fixtures/module-architecture-mismatch.txt").read_text(
            encoding="utf-8"
        )
        report = policy.diagnose_log(text)
        self.assertEqual(report["produced_domain_slices_in_log"], ["arm64"])
        self.assertEqual(
            report["consumer_architectures"]["DataCoreAI"], ["arm64", "x86_64"]
        )
        self.assertEqual(report["requested_slices_not_observed"], ["x86_64"])
        self.assertIn(
            "Unable to find module dependency",
            report["first_compiler_error"]["message"],
        )

    def test_incremental_log_does_not_claim_global_module_availability(self):
        report = policy.diagnose_log(
            "builtin-SwiftDriver -- swiftc -module-name DataCoreAI -target arm64-apple-ios17.0-simulator"
        )
        self.assertEqual(report["produced_domain_slices_in_log"], [])
        self.assertIsNone(report["first_compiler_error"])
        self.assertIn("cached", report["note"])
