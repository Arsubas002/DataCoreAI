#!/bin/bash
# Run only on an authorized Mac. Simulator ad hoc signing only; no device signing, SDK downloads or deployment.
set -euo pipefail
cd "$(dirname "$0")/../.."
EVIDENCE_DIR="${DATACORE_EVIDENCE_DIR:-$PWD/ios-evidence}"
mkdir -p "$EVIDENCE_DIR"
EVIDENCE_DIR="$(cd "$EVIDENCE_DIR" && pwd)"
if [ -n "$(find "$EVIDENCE_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo 'Use an empty evidence directory; previous logs/results will not be overwritten.' >&2
  exit 2
fi
phase=preflight
finish() {
  result=$?
  trap - EXIT
  set +e
  evidence_error=0
  if [ -f "$EVIDENCE_DIR/small-tests.log" ]; then
    python3 ios/tools/module_integration.py --log "$EVIDENCE_DIR/small-tests.log" --output "$EVIDENCE_DIR/module-diagnostic.json" > "$EVIDENCE_DIR/module-diagnostic.log" 2>&1
  fi
  for size in small large; do
    if [ -d "$EVIDENCE_DIR/$size.xcresult" ]; then
      xcrun xcresulttool get test-results summary --path "$EVIDENCE_DIR/$size.xcresult" > "$EVIDENCE_DIR/$size-summary.json" 2> "$EVIDENCE_DIR/$size-summary-error.log"
      if [ "$?" -ne 0 ]; then evidence_error=1; fi
      xcrun xcresulttool export attachments --path "$EVIDENCE_DIR/$size.xcresult" --output-path "$EVIDENCE_DIR/$size-captures" > "$EVIDENCE_DIR/$size-attachments.log" 2>&1
      if [ "$?" -ne 0 ]; then evidence_error=1; fi
    elif [ "$result" -eq 0 ]; then
      evidence_error=1
    fi
  done
  if [ "$result" -eq 0 ]; then
    # Successful UI tests must also deliver real screenshots; never silently ignore export failures.
    for size in small large; do
      if [ ! -d "$EVIDENCE_DIR/$size-captures" ] || [ -z "$(find "$EVIDENCE_DIR/$size-captures" -iname '*.png' -print -quit)" ]; then
        evidence_error=1
      fi
    done
    if [ "$evidence_error" -ne 0 ]; then result=1; phase=evidence-export; fi
  fi
  python3 ios/tools/collect_evidence.py --directory "$EVIDENCE_DIR" --exit-code "$result" --phase "$phase"
  if [ "$?" -ne 0 ] && [ "$result" -eq 0 ]; then result=1; fi
  exit "$result"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
python3 ios/tools/xcode_preflight.py --output "$EVIDENCE_DIR/preflight.json" 2>&1 | tee "$EVIDENCE_DIR/toolchain.log"
phase=structure
python3 ios/tools/verify_project.py 2>&1 | tee "$EVIDENCE_DIR/structure.log"
phase=domain-tests
swift test --package-path ios/Packages/DataCoreDomain 2>&1 | tee "$EVIDENCE_DIR/domain-tests.log"
phase=simulator-plan
xcrun simctl list --json > "$EVIDENCE_DIR/simulators.json"
SDK_VERSION="$(xcrun --sdk iphonesimulator --show-sdk-version)"
python3 ios/tools/simulator_plan.py "$EVIDENCE_DIR/simulators.json" --sdk "$SDK_VERSION" > "$EVIDENCE_DIR/plan.json"
SMALL_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["small"]["udid"])' "$EVIDENCE_DIR/plan.json")"
LARGE_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["large"]["udid"])' "$EVIDENCE_DIR/plan.json")"
# Simulator signing is target-scoped in the project; no global settings may leak to SwiftPM.
phase=debug-architecture-settings
# Inspect actual settings without storing arbitrary build environment values.
xcodebuild -quiet -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI -configuration Debug -destination "platform=iOS Simulator,id=$SMALL_ID" -showBuildSettings -json 2> "$EVIDENCE_DIR/debug-settings-stderr.log" | python3 ios/tools/module_integration.py --resolved-settings --output "$EVIDENCE_DIR/debug-architecture-settings.json" | tee "$EVIDENCE_DIR/debug-architecture-settings.log"
phase=small-tests
xcodebuild test -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI -configuration Debug -destination "platform=iOS Simulator,id=$SMALL_ID" -parallel-testing-enabled NO -resultBundlePath "$EVIDENCE_DIR/small.xcresult" 2>&1 | tee "$EVIDENCE_DIR/small-tests.log"
phase=large-tests
xcodebuild test -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI -configuration Debug -destination "platform=iOS Simulator,id=$LARGE_ID" -parallel-testing-enabled NO -only-testing:DataCoreAIUITests -resultBundlePath "$EVIDENCE_DIR/large.xcresult" 2>&1 | tee "$EVIDENCE_DIR/large-tests.log"
phase=release-build
xcodebuild build -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI -configuration Release -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO 2>&1 | tee "$EVIDENCE_DIR/release-build.log"
phase=device-build
# Also typecheck/link the shipping architecture; this remains unsigned and non-installable.
xcodebuild build -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI -configuration Release -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO 2>&1 | tee "$EVIDENCE_DIR/device-build.log"
phase=completed
