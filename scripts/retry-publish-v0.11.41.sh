#!/bin/bash
# Retry v0.11.41 OTA publish periodically until it succeeds or attempts run out.
# Token: forge-ota-publish-57 (one-time, revoke after success)
TOKEN='QkmByBltDGUh60jQ76-GZECS4DzsQ3VGUyHrdQ8N'
EAS_BIN="/tmp/eas-clean/node_modules/.bin/eas"
MAX_ATTEMPTS=12
WAIT_SECS=600  # 10 minutes between attempts

cd ~/workspace/forge-mobile

for i in $(seq 1 $MAX_ATTEMPTS); do
  echo "=== Publish attempt $i of $MAX_ATTEMPTS at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  
  timeout 280 env EXPO_TOKEN="$TOKEN" EAS_SKIP_AUTO_FINGERPRINT=1 \
    "$EAS_BIN" update --platform android --branch preview --environment preview \
    --message "v0.11.41: port progression chart and exercise demos" \
    > /tmp/publish-attempt-$i.log 2>&1
  
  # Check if "Published!" appears in the log
  if grep -q "Published!" /tmp/publish-attempt-$i.log; then
    echo "SUCCESS: v0.11.41 published on attempt $i"
    echo "Log tail:"
    tail -5 /tmp/publish-attempt-$i.log
    exit 0
  fi
  
  echo "Attempt $i failed. Last lines:"
  tail -3 /tmp/publish-attempt-$i.log
  
  if [ $i -lt $MAX_ATTEMPTS ]; then
    echo "Waiting ${WAIT_SECS}s before next attempt..."
    sleep $WAIT_SECS
  fi
done

echo "All $MAX_ATTEMPTS attempts failed. Manual intervention needed."
exit 1
