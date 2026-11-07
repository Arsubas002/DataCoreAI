#!/bin/bash
# Run only on an authorized Mac; never signs, archives, deploys or installs SDKs.
set -euo pipefail
cd "$(dirname "$0")/../.."
EVIDENCE_DIR="${DATACORE_EVIDENCE_DIR:-$PWD/ios-evidence}"
mkdir -p "$EVIDENCE_DIR"
EVIDENCE_DIR="$(cd "$EVIDENCE_DIR" && pwd)"
if [ -e "$EVIDENCE_DIR/small.xcresult" ] || [ -e "$EVIDENCE_DIR/large.xcresult" ]; then
  echo 'Use a fresh evidence directory; existing XCTest evidence will not be overwritten.' >&2
  exit 2
fi
finish() {
  result=$?
  trap - EXIT
  for size in small large; do
    if [ -d "$EVIDENCE_DIR/$size.xcresult" ]; then
      xcrun xcresulttool export attachments --path "$EVIDENCE_DIR/$size.xcresult" --output-path "$EVIDENCE_DIR/$size-captures" > "$EVIDENCE_DIR/$size-attachments.log" 2>&1 || true
    fi
  done
  exit "$result"
}
trap finish EXIT
xcodebuild -version | tee "$EVIDENCE_DIR/toolchain.log"
python3 ios/tools/verify_project.py | tee "$EVIDENCE_DIR/structure.log"
swift test --package-path ios/Packages/DataCoreDomain 2>&1 | tee "$EVIDENCE_DIR/domain-tests.log"
xcrun simctl list --json > "$EVIDENCE_DIR/simulators.json"
SDK_VERSION="$(xcrun --sdk iphonesimulator --show-sdk-version)"
python3 ios/tools/simulator_plan.py "$EVIDENCE_DIR/simulators.json" --sdk "$SDK_VERSION" > "$EVIDENCE_DIR/plan.json"
SMALL_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["small"]["udid"])' "$EVIDENCE_DIR/plan.json")"
LARGE_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["large"]["udid"])' "$EVIDENCE_DIR/plan.json")"
xcodebuild test -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI -configuration Debug -destination "platform=iOS Simulator,id=$SMALL_ID" -parallel-testing-enabled NO -resultBundlePath "$EVIDENCE_DIR/small.xcresult" CODE_SIGNING_ALLOWED=NO 2>&1 | tee "$EVIDENCE_DIR/small-tests.log"
xcodebuild test -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI -configuration Debug -destination "platform=iOS Simulator,id=$LARGE_ID" -parallel-testing-enabled NO -only-testing:DataCoreAIUITests -resultBundlePath "$EVIDENCE_DIR/large.xcresult" CODE_SIGNING_ALLOWED=NO 2>&1 | tee "$EVIDENCE_DIR/large-tests.log"
xcodebuild build -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI -configuration Release -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO 2>&1 | tee "$EVIDENCE_DIR/release-build.log"
