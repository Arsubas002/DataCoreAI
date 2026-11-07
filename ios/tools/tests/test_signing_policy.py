"""Reproduce entitlement propagation into package SRCROOTs without Apple SDKs."""

from copy import deepcopy
from pathlib import Path
import runpy
import sys
import unittest

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
from signing_policy import (  # noqa: E402
    CONDITION,
    ENTITLEMENTS,
    SIMULATOR_SETTINGS,
    configs,
    validate_resolved_signing,
    validate_signing_scope,
)

IOS = TOOLS.parent


class SigningPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.project = runpy.run_path(str(TOOLS / "generate_project.py"))["output"]
        cls.script = (TOOLS / "run_simulator_tests.sh").read_text()

    def target(self, project, name):
        return next(
            item
            for item in project["objects"].values()
            if item.get("isa") == "PBXNativeTarget" and item["name"] == name
        )

    def test_generated_scope_valid_for_debug_release_and_packages(self):
        validate_signing_scope(self.project, IOS, self.script)
        for name in ["DataCoreAI", "DataCoreAITests", "DataCoreAIUITests"]:
            values = configs(self.project["objects"], self.target(self.project, name))
            self.assertFalse(
                any(k.startswith("CODE_SIGN_ENTITLEMENTS") for k in values["Release"])
            )
            if name != "DataCoreAI":
                self.assertFalse(
                    any(k.startswith("CODE_SIGN_ENTITLEMENTS") for k in values["Debug"])
                )

    def test_recreates_global_override_and_missing_package_input(self):
        old = "CODE_SIGN_ENTITLEMENTS=Config/Simulator.entitlements"
        self.assertTrue((IOS / "Config/Simulator.entitlements").is_file())
        for target in ["DataCoreDomain", "DataCoreDomain_DataCoreDomain"]:
            # Both package targets resolve this global relative setting from their own SRCROOT.
            with self.subTest(target=target):
                self.assertFalse(
                    (
                        IOS / "Packages/DataCoreDomain/Config/Simulator.entitlements"
                    ).exists()
                )
                with self.assertRaisesRegex(ValueError, "Global.*Swift package"):
                    validate_signing_scope(self.project, IOS, self.script + "\n" + old)

    def test_rejects_project_level_entitlements(self):
        project = deepcopy(self.project)
        root = project["objects"][project["rootObject"]]
        configs(project["objects"], root)["Debug"]["CODE_SIGN_ENTITLEMENTS"] = (
            ENTITLEMENTS
        )
        with self.assertRaisesRegex(ValueError, "native targets"):
            validate_signing_scope(project, IOS, self.script)

    def test_rejects_entitlements_on_tests_or_release(self):
        for target, config in [
            ("DataCoreAITests", "Debug"),
            ("DataCoreAIUITests", "Debug"),
            ("DataCoreAI", "Release"),
        ]:
            project = deepcopy(self.project)
            values = configs(project["objects"], self.target(project, target))[config]
            values["CODE_SIGN_ENTITLEMENTS" + CONDITION] = ENTITLEMENTS
            with (
                self.subTest(target=target, config=config),
                self.assertRaisesRegex(ValueError, "Only.*Debug simulator app"),
            ):
                validate_signing_scope(project, IOS, self.script)

    def test_rejects_relative_or_device_app_entitlements(self):
        for key, value in [
            ("CODE_SIGN_ENTITLEMENTS", ENTITLEMENTS),
            ("CODE_SIGN_ENTITLEMENTS" + CONDITION, "Config/Simulator.entitlements"),
        ]:
            project = deepcopy(self.project)
            values = configs(project["objects"], self.target(project, "DataCoreAI"))[
                "Debug"
            ]
            del values["CODE_SIGN_ENTITLEMENTS" + CONDITION]
            values[key] = value
            with self.assertRaisesRegex(ValueError, "SRCROOT-based"):
                validate_signing_scope(project, IOS, self.script)

    def payload(self):
        return [
            {
                "target": "DataCoreAI",
                "buildSettings": {
                    "SRCROOT": str(IOS),
                    "CODE_SIGN_ENTITLEMENTS": str(
                        IOS / "Config/Simulator.entitlements"
                    ),
                    **SIMULATOR_SETTINGS,
                },
            }
        ]

    def test_resolved_app_path_exists_without_leaking_environment(self):
        payload = self.payload()
        payload[0]["buildSettings"]["PRIVATE_UNRELATED_ENV"] = "must-not-be-copied"
        self.assertNotIn(
            "PRIVATE_UNRELATED_ENV", str(validate_resolved_signing(payload))
        )

    def test_resolved_package_override_fails_even_with_absolute_valid_file(self):
        for path in [
            "Config/Simulator.entitlements",
            str(IOS / "Config/Simulator.entitlements"),
        ]:
            for target in ["DataCoreDomain", "DataCoreDomain_DataCoreDomain"]:
                payload = self.payload() + [
                    {
                        "target": target,
                        "buildSettings": {"CODE_SIGN_ENTITLEMENTS": path},
                    }
                ]
                with (
                    self.subTest(path=path, target=target),
                    self.assertRaisesRegex(ValueError, target),
                ):
                    validate_resolved_signing(payload)

    def test_resolved_missing_app_path_or_identity_fails(self):
        for key, value in [
            ("CODE_SIGN_ENTITLEMENTS", "Config/Simulator.entitlements"),
            ("CODE_SIGN_IDENTITY", ""),
            ("SRCROOT", "/nonexistent/datacore"),
        ]:
            payload = self.payload()
            payload[0]["buildSettings"][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_resolved_signing(payload)
