#!/bin/bash
# Build all 5 pre-configured family clients for CreaBomber
# Each client has a unique device ID and connects to bomber.suimation.de

set -e

cd "$(dirname "$0")"

# Server URL for all clients
SERVER_URL="https://bomber.suimation.de"

# Output directory for all builds
OUTPUT_DIR="./release/family"
mkdir -p "$OUTPUT_DIR"

echo "========================================"
echo "Building CreaBomber Family Clients"
echo "Server: $SERVER_URL"
echo "========================================"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build TypeScript first (once)
echo ""
echo "Compiling TypeScript..."
npm run build

# Family devices configuration
declare -a DEVICE_IDS=("family-elly-buero" "family-elly-notebook" "family-gioia" "family-leo" "family-thilo")
declare -a DEVICE_NAMES=("Elly-Buero" "Elly-Notebook" "Gioia" "Leo" "Thilo")

for i in "${!DEVICE_IDS[@]}"; do
    DEVICE_ID="${DEVICE_IDS[$i]}"
    DEVICE_NAME="${DEVICE_NAMES[$i]}"

    echo ""
    echo "----------------------------------------"
    echo "Building: $DEVICE_NAME ($DEVICE_ID)"
    echo "----------------------------------------"

    # Create device-config.json for this build
    cat > device-config.json << EOF
{
  "deviceId": "$DEVICE_ID",
  "deviceName": "$DEVICE_NAME",
  "serverUrl": "$SERVER_URL"
}
EOF

    echo "Created device-config.json:"
    cat device-config.json

    # Build with electron-builder
    PRODUCT_NAME="CreaBomber-$DEVICE_NAME"

    npx electron-builder --mac \
        --config.productName="$PRODUCT_NAME" \
        --config.mac.identity=null \
        --config.extraResources.0.from=device-config.json \
        --config.extraResources.0.to=device-config.json

    # Find and rename the output DMG
    DMG_FILE=$(find release -maxdepth 1 -name "*.dmg" -newer device-config.json 2>/dev/null | head -1)
    if [ -n "$DMG_FILE" ]; then
        mv "$DMG_FILE" "$OUTPUT_DIR/CreaBomber-$DEVICE_NAME.dmg"
        echo "✓ Built: $OUTPUT_DIR/CreaBomber-$DEVICE_NAME.dmg"
    else
        echo "⚠ Warning: DMG not found for $DEVICE_NAME"
    fi
done

# Cleanup
rm -f device-config.json

echo ""
echo "========================================"
echo "All builds complete!"
echo "========================================"
echo ""
echo "Output files:"
ls -la "$OUTPUT_DIR"/*.dmg 2>/dev/null || echo "No DMG files found"
echo ""
echo "To install: Double-click DMG and drag to Applications"
