"""Execute actual wrapper logic with explicit Security stand-ins; no Apple SDK."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]


class KeychainLogicTests(unittest.TestCase):
    @unittest.skipUnless(
        shutil.which("swiftc"),
        "Swift compiler unavailable; native Keychain tests remain required",
    )
    def test_actual_wrapper_roundtrip_and_failure_paths(self):
        source = (ROOT / "ios/DataCoreAI/Sources/APIRepository.swift").read_text()
        # Exclude only the direct Security framework adapter; exercise the actual store/error code.
        error_and_protocol = source[
            source.index("enum KeychainError:") : source.index(
                "struct SecurityKeychainClient:"
            )
        ]
        store = source[
            source.index("struct KeychainTokenStore:") : source.index(
                "private final class NoRedirects:"
            )
        ]
        template = (
            Path(__file__).parent / "fixtures/keychain-harness.swift"
        ).read_text()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "main.swift"
            path.write_text(
                template.replace(
                    "// PRODUCTION_KEYCHAIN_LOGIC", error_and_protocol + store
                )
            )
            executable = Path(directory) / "regression"
            for args in [
                [shutil.which("swiftc"), str(path), "-o", str(executable)],
                [str(executable)],
            ]:
                result = subprocess.run(
                    args,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    env=os.environ.copy(),
                )
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
