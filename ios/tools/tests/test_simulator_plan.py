import importlib.util
from pathlib import Path
from unittest import TestCase

path = Path(__file__).resolve().parents[1] / "simulator_plan.py"
spec = importlib.util.spec_from_file_location("simulator_plan", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture():
    return {
        "runtimes": [
            {
                "identifier": "ios18",
                "name": "iOS 18.5",
                "version": "18.5",
                "isAvailable": True,
            },
            {
                "identifier": "ios26",
                "name": "iOS 26.2",
                "version": "26.2",
                "isAvailable": True,
            },
        ],
        "devices": {
            key: [
                {
                    "name": "iPhone SE (3rd generation)",
                    "udid": key + "small",
                    "isAvailable": True,
                },
                {
                    "name": "iPhone 16 Pro Max",
                    "udid": key + "large",
                    "isAvailable": True,
                },
            ]
            for key in ["ios18", "ios26"]
        },
    }


class SimulatorTests(TestCase):
    def test_respects_sdk_and_uses_distinct_sizes(self):
        result = module.plan(fixture(), "18.5")
        self.assertEqual(result["runtime"], "iOS 18.5")
        self.assertEqual(result["small"]["name"], "iPhone SE (3rd generation)")
        self.assertEqual(result["large"]["name"], "iPhone 16 Pro Max")
        self.assertNotEqual(result["small"]["udid"], result["large"]["udid"])

    def test_chooses_newest_supported_runtime(self):
        self.assertEqual(module.plan(fixture(), "26.2")["runtime"], "iOS 26.2")

    def test_rejects_unavailable_and_too_old(self):
        payload = fixture()
        for r in payload["runtimes"]:
            r["isAvailable"] = False
        with self.assertRaises(ValueError):
            module.plan(payload, "26.2")
        with self.assertRaises(ValueError):
            module.plan(fixture(), "16.4")

    def test_requires_two_phones(self):
        payload = fixture()
        for key in payload["devices"]:
            payload["devices"][key] = payload["devices"][key][:1]
        with self.assertRaises(ValueError):
            module.plan(payload, "26.2")

    def test_numeric_version_and_invalid_values(self):
        self.assertGreater(module.version("26.2"), module.version("18.5"))
        self.assertEqual(module.version("17"), module.version("17.0.0"))
        for value in ["latest", "18; exit 0", "26.x"]:
            with self.assertRaises(ValueError):
                module.version(value)
