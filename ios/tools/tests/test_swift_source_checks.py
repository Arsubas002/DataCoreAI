"""Reproduce the second native build failure without an Apple SDK."""

import importlib.util
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

TOOLS = Path(__file__).resolve().parents[1]
IOS = TOOLS.parent
spec = importlib.util.spec_from_file_location(
    "swift_source_checks", TOOLS / "swift_source_checks.py"
)
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)


class SwiftSourceChecksTests(unittest.TestCase):
    def test_rejects_original_ambiguous_geometry(self):
        with self.assertRaisesRegex(ValueError, "ReportExporter.swift:2:.*qualify"):
            checks.validate_numeric_limits(
                "import Foundation\nlet size = CGSize(width: 523, height: .greatestFiniteMagnitude)",
                "ReportExporter.swift",
            )

    def test_accepts_explicit_scalar_types(self):
        checks.validate_numeric_limits(
            "let a = CGFloat.greatestFiniteMagnitude\nlet b = Double.greatestFiniteMagnitude",
            "typed.swift",
        )

    def test_all_swift_sources_use_explicit_limit_types(self):
        paths = list(IOS.rglob("*.swift"))
        paths = [p for p in paths if ".build" not in p.parts]
        self.assertTrue(paths)
        for path in paths:
            with self.subTest(path=path):
                checks.validate_numeric_limits(path.read_text(), str(path))

    @unittest.skipUnless(
        shutil.which("swiftc"), "Swift compiler unavailable; source guard still runs"
    )
    def test_foundation_compiler_rejects_old_and_accepts_actual_exporter_size(self):
        source = (IOS / "DataCoreAI/Sources/ReportExporter.swift").read_text()
        expressions = re.findall(r"CGSize\(width:\s*523,\s*height:\s*[^)]+\)", source)
        self.assertEqual(len(expressions), 1)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Geometry.swift"
            for expression, valid in [
                ("CGSize(width: 523, height: .greatestFiniteMagnitude)", False),
                (expressions[0], True),
            ]:
                path.write_text(f"import Foundation\nlet size = {expression}\n")
                result = subprocess.run(
                    [shutil.which("swiftc"), "-typecheck", str(path)],
                    capture_output=True,
                    text=True,
                    timeout=30,
                    env=os.environ.copy(),
                )
                if valid:
                    self.assertEqual(result.returncode, 0, result.stderr)
                else:
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn(
                        "ambiguous use of 'greatestFiniteMagnitude'", result.stderr
                    )
