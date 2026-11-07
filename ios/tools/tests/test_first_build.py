"""No Apple SDK: verify preflight, evidence and shell orchestration with explicit command doubles."""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from unittest import TestCase, skipIf

TOOLS = Path(__file__).resolve().parents[1]
ROOT = TOOLS.parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, TOOLS / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


preflight = load("xcode_preflight")
evidence = load("collect_evidence")


class PreflightTests(TestCase):
    def test_actual_version_is_required_not_just_directory_name(self):
        with self.assertRaises(preflight.PreflightError):
            preflight.check_versions("Xcode 16.4\nBuild version test", "18.5", "26.3")
        with self.assertRaises(preflight.PreflightError):
            preflight.check_versions("Xcode 26.2\nBuild version test", "26.1", "26.3")
        self.assertEqual(
            preflight.check_versions(
                "Xcode 26.3\nBuild version test", "26.2\n", "26.3"
            )["xcode_version"],
            "26.3",
        )

    def test_rejects_unverifiable_or_old_sdk(self):
        for sdk in ["18.5", "unknown", "26; command"]:
            with self.assertRaises(preflight.PreflightError):
                preflight.check_versions("Xcode 26.3", sdk, "26.3")

    def test_missing_directory_never_runs_or_installs_tools(self):
        with tempfile.TemporaryDirectory() as path:

            def unexpected(*args, **kwargs):
                self.fail("A missing Xcode must fail before executing commands")

            with self.assertRaises(preflight.PreflightError):
                preflight.inspect(Path(path) / "not-installed", "26.3", unexpected)


class EvidenceTests(TestCase):
    def test_manifest_hashes_real_files_and_preserves_failure(self):
        with tempfile.TemporaryDirectory() as path:
            directory = Path(path)
            (directory / "build.log").write_bytes(b"failed compilation fixture")
            (directory / "evidence-manifest.json").write_text("{}")
            report = evidence.collect(directory, 42, "small-tests")
            self.assertEqual(report["exit_code"], 42)
            self.assertEqual(report["last_phase"], "small-tests")
            self.assertEqual(len(report["files"]), 1)
            self.assertEqual(
                report["files"][0]["sha256"],
                hashlib.sha256(b"failed compilation fixture").hexdigest(),
            )


# These doubles never build Swift or generate real xcresults/screenshots.
FAKE_TOOL = """#!/usr/bin/env python3
import json, os, pathlib, sys
name=pathlib.Path(sys.argv[0]).name
args=sys.argv[1:]
if name=='swift': print('SIMULATED domain command');sys.exit(0)
if name=='xcodebuild':
 with (pathlib.Path(os.environ['DATACORE_EVIDENCE_DIR'])/'invocations.jsonl').open('a') as log: log.write(json.dumps(args)+'\\n')
 if os.getenv('FAIL_DEVICE')=='1' and 'generic/platform=iOS' in args: print('SIMULATED device build failure');sys.exit(43)
 if '-showBuildSettings' in args:
  print(json.dumps([{'target':'DataCoreAI','buildSettings':{'CONFIGURATION':'Debug','PLATFORM_NAME':'iphonesimulator','ONLY_ACTIVE_ARCH': 'NO' if os.getenv('BAD_ARCH_POLICY')=='1' else 'YES','ARCHS':'arm64','NATIVE_ARCH_ACTUAL':'arm64'}}]));sys.exit(0)
 if args==['-version']: print('Xcode 26.3\\nBuild version FIXTURE');sys.exit(0)
 if '-resultBundlePath' in args:
  result=pathlib.Path(args[args.index('-resultBundlePath')+1])
  if os.getenv('FAIL_BUILD')=='1': print('SIMULATED compile failure');sys.exit(42)
  result.mkdir();(result/'fixture.txt').write_text('not an Apple xcresult')
 print('SIMULATED build command');sys.exit(0)
if args[:2]==['simctl','list']:
 runtime='com.apple.CoreSimulator.SimRuntime.iOS-26-2'
 print(json.dumps({'runtimes':[{'identifier':runtime,'name':'iOS 26.2','version':'26.2','isAvailable':True}], 'devices':{runtime:[{'name':'iPhone SE (3rd generation)','udid':'small','isAvailable':True},{'name':'iPhone 16 Pro Max','udid':'large','isAvailable':True}]}}));sys.exit(0)
if args[:2]==['--sdk','iphonesimulator']:print('26.2');sys.exit(0)
if args[:3]==['xcresulttool','get','test-results']: print(json.dumps({'simulation':True}));sys.exit(0)
if args[:3]==['xcresulttool','export','attachments']:
 if os.getenv('FAIL_EXPORT')=='1':sys.exit(7)
 output=pathlib.Path(args[args.index('--output-path')+1]);output.mkdir();(output/'fixture.png').write_bytes(b'not a real screenshot');sys.exit(0)
sys.exit(3)
"""


@skipIf(
    os.name == "nt" or not shutil.which("bash"),
    "Bash orchestration is for Linux/macOS; pure Python checks remain portable",
)
class OrchestrationTests(TestCase):
    def run_fixture(
        self,
        *,
        missing=False,
        fail_build=False,
        fail_export=False,
        fail_device=False,
        bad_arch_policy=False,
    ):
        workspace = tempfile.TemporaryDirectory()
        self.addCleanup(workspace.cleanup)
        root = Path(workspace.name)
        bin_dir = root / "bin"
        bin_dir.mkdir()
        for name in ["swift", "xcodebuild", "xcrun"]:
            path = bin_dir / name
            path.write_text(FAKE_TOOL)
            path.chmod(0o755)
        xcode = root / "Xcode.app/Contents/Developer"
        if not missing:
            xcode.mkdir(parents=True)
        output = root / "evidence"
        env = {
            **os.environ,
            "PATH": str(bin_dir) + os.pathsep + os.environ["PATH"],
            "DEVELOPER_DIR": str(xcode),
            "DATACORE_EXPECTED_XCODE": "26.3",
            "DATACORE_EVIDENCE_DIR": str(output),
            "FAIL_BUILD": str(int(fail_build)),
            "FAIL_EXPORT": str(int(fail_export)),
            "FAIL_DEVICE": str(int(fail_device)),
            "BAD_ARCH_POLICY": str(int(bad_arch_policy)),
        }
        result = subprocess.run(
            ["bash", str(TOOLS / "run_simulator_tests.sh")],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
        )
        report = json.loads((output / "evidence-manifest.json").read_text())
        return result, report, output

    def test_missing_xcode_retains_diagnostics_and_stops_early(self):
        result, manifest, output = self.run_fixture(missing=True)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertEqual(manifest["last_phase"], "preflight")
        self.assertFalse(
            json.loads((output / "preflight.json").read_text())["verified"]
        )
        self.assertFalse((output / "small-tests.log").exists())

    def test_compile_exit_code_is_not_hidden_by_tee_or_collector(self):
        result, manifest, _ = self.run_fixture(fail_build=True)
        self.assertEqual(result.returncode, 42, result.stdout + result.stderr)
        self.assertEqual(manifest["exit_code"], 42)
        self.assertEqual(manifest["last_phase"], "small-tests")

    def test_export_failure_cannot_look_like_success(self):
        result, manifest, _ = self.run_fixture(fail_export=True)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertEqual(manifest["last_phase"], "evidence-export")

    def test_effective_architecture_mismatch_stops_before_compile(self):
        result, manifest, output = self.run_fixture(bad_arch_policy=True)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertEqual(manifest["last_phase"], "debug-architecture-settings")
        self.assertFalse((output / "small-tests.log").exists())
        self.assertFalse(
            json.loads((output / "debug-architecture-settings.json").read_text())[
                "verified"
            ]
        )

    def test_unsigned_device_build_failure_is_preserved(self):
        result, manifest, output = self.run_fixture(fail_device=True)
        self.assertEqual(result.returncode, 43, result.stdout + result.stderr)
        self.assertEqual(manifest["last_phase"], "device-build")
        self.assertTrue((output / "small-summary.json").exists())

    def test_command_plan_and_inventory_complete_with_doubles(self):
        result, manifest, output = self.run_fixture()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["last_phase"], "completed")
        self.assertIn("SIMULATED", (output / "release-build.log").read_text())
        paths = {entry["path"] for entry in manifest["files"]}
        for expected in [
            "preflight.json",
            "small-summary.json",
            "large-summary.json",
            "small-captures/fixture.png",
            "large-captures/fixture.png",
            "device-build.log",
        ]:
            self.assertIn(expected, paths)

    def test_simulator_tests_use_local_signing_but_device_build_stays_unsigned(self):
        result, _, output = self.run_fixture()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        commands = [
            json.loads(line)
            for line in (output / "invocations.jsonl").read_text().splitlines()
        ]
        tests = [args for args in commands if "test" in args]
        self.assertEqual(len(tests), 2)
        for args in tests:
            for setting in [
                "CODE_SIGNING_ALLOWED=YES",
                "CODE_SIGNING_REQUIRED=YES",
                "CODE_SIGN_IDENTITY=-",
                "CODE_SIGN_STYLE=Manual",
                "DEVELOPMENT_TEAM=",
                "PROVISIONING_PROFILE_SPECIFIER=",
                "CODE_SIGN_ENTITLEMENTS=Config/Simulator.entitlements",
            ]:
                self.assertIn(setting, args)
            self.assertNotIn("CODE_SIGNING_ALLOWED=NO", args)
        device = next(args for args in commands if "generic/platform=iOS" in args)
        self.assertIn("CODE_SIGNING_ALLOWED=NO", device)
        self.assertFalse(
            any(arg.startswith("CODE_SIGN_ENTITLEMENTS=") for arg in device)
        )
