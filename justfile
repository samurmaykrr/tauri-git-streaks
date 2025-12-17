# Git Streaks - Build & Development Scripts
# https://github.com/casey/just

# Default recipe - show available commands
default:
    @just --list

# ============================================================================
# Development
# ============================================================================

# Start development server with hot reload
dev:
    npm run tauri dev

# Start frontend only (for debugging)
dev-frontend:
    npm run dev

# Check Rust code compiles without building
check:
    cd src-tauri && cargo check

# Run Rust clippy linter
lint:
    cd src-tauri && cargo clippy -- -D warnings

# Format Rust code
fmt:
    cd src-tauri && cargo fmt

# Format and lint all code
format: fmt
    @echo "Code formatted"

# Type check TypeScript
typecheck:
    npx tsc --noEmit

# Run all checks (typecheck + clippy)
check-all: typecheck check lint
    @echo "All checks passed"

# ============================================================================
# Building
# ============================================================================

# Build for production (current platform)
build:
    npm run tauri build

# Build without bundling (faster, for testing)
build-debug:
    npm run tauri build -- --debug

# Build frontend only
build-frontend:
    npm run build

# Build Rust backend only
build-backend:
    cd src-tauri && cargo build --release

# Clean build artifacts
clean:
    rm -rf dist
    rm -rf src-tauri/target
    rm -rf node_modules/.vite

# Clean and rebuild everything
rebuild: clean install build

# ============================================================================
# macOS Specific
# ============================================================================

# Build macOS app bundle
[macos]
build-macos:
    npm run tauri build -- --target universal-apple-darwin

# Build macOS DMG installer
[macos]
build-dmg:
    npm run tauri build -- --bundles dmg

# Build macOS .app only (no installer)
[macos]
build-app:
    npm run tauri build -- --bundles app

# Open built app location in Finder
[macos]
open-bundle:
    open src-tauri/target/release/bundle/macos

# Sign macOS app (requires valid identity)
[macos]
sign identity:
    codesign --deep --force --verify --verbose --sign "{{identity}}" "src-tauri/target/release/bundle/macos/Git Streaks.app"

# ============================================================================
# Windows Specific
# ============================================================================

# Build Windows MSI installer
[windows]
build-msi:
    npm run tauri build -- --bundles msi

# Build Windows NSIS installer
[windows]
build-nsis:
    npm run tauri build -- --bundles nsis

# ============================================================================
# Linux Specific
# ============================================================================

# Build Linux AppImage
[linux]
build-appimage:
    npm run tauri build -- --bundles appimage

# Build Linux .deb package
[linux]
build-deb:
    npm run tauri build -- --bundles deb

# Build Linux .rpm package
[linux]
build-rpm:
    npm run tauri build -- --bundles rpm

# ============================================================================
# Dependencies
# ============================================================================

# Install all dependencies
install:
    npm install
    cd src-tauri && cargo fetch

# Update npm dependencies
update-npm:
    npm update

# Update Rust dependencies
update-cargo:
    cd src-tauri && cargo update

# Update all dependencies
update: update-npm update-cargo

# Check for outdated npm packages
outdated-npm:
    npm outdated || true

# Check for outdated Rust packages
outdated-cargo:
    cd src-tauri && cargo outdated || true

# ============================================================================
# Icons
# ============================================================================

# Regenerate all icons from SVG source
icons:
    #!/usr/bin/env bash
    cd src-tauri/icons
    
    # Main icons
    magick git-streaks.svg -background none -resize 32x32 -depth 8 PNG32:32x32.png
    magick git-streaks.svg -background none -resize 128x128 -depth 8 PNG32:128x128.png
    magick git-streaks.svg -background none -resize 256x256 -depth 8 PNG32:128x128@2x.png
    magick git-streaks.svg -background none -resize 512x512 -depth 8 PNG32:icon.png
    
    # Windows Store icons
    magick git-streaks.svg -background none -resize 30x30 Square30x30Logo.png
    magick git-streaks.svg -background none -resize 44x44 Square44x44Logo.png
    magick git-streaks.svg -background none -resize 71x71 Square71x71Logo.png
    magick git-streaks.svg -background none -resize 89x89 Square89x89Logo.png
    magick git-streaks.svg -background none -resize 107x107 Square107x107Logo.png
    magick git-streaks.svg -background none -resize 142x142 Square142x142Logo.png
    magick git-streaks.svg -background none -resize 150x150 Square150x150Logo.png
    magick git-streaks.svg -background none -resize 284x284 Square284x284Logo.png
    magick git-streaks.svg -background none -resize 310x310 Square310x310Logo.png
    magick git-streaks.svg -background none -resize 50x50 StoreLogo.png
    
    # Windows ICO
    magick git-streaks.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico
    
    # macOS ICNS
    mkdir -p icon.iconset
    magick git-streaks.svg -background none -resize 16x16 icon.iconset/icon_16x16.png
    magick git-streaks.svg -background none -resize 32x32 icon.iconset/icon_16x16@2x.png
    magick git-streaks.svg -background none -resize 32x32 icon.iconset/icon_32x32.png
    magick git-streaks.svg -background none -resize 64x64 icon.iconset/icon_32x32@2x.png
    magick git-streaks.svg -background none -resize 128x128 icon.iconset/icon_128x128.png
    magick git-streaks.svg -background none -resize 256x256 icon.iconset/icon_128x128@2x.png
    magick git-streaks.svg -background none -resize 256x256 icon.iconset/icon_256x256.png
    magick git-streaks.svg -background none -resize 512x512 icon.iconset/icon_256x256@2x.png
    magick git-streaks.svg -background none -resize 512x512 icon.iconset/icon_512x512.png
    magick git-streaks.svg -background none -resize 1024x1024 icon.iconset/icon_512x512@2x.png
    iconutil -c icns icon.iconset -o icon.icns
    rm -rf icon.iconset
    
    echo "Icons regenerated successfully"

# ============================================================================
# Utilities
# ============================================================================

# Show project info
info:
    @echo "Git Streaks v$(grep '"version"' package.json | head -1 | cut -d'"' -f4)"
    @echo ""
    @echo "Node.js: $(node --version)"
    @echo "npm: $(npm --version)"
    @echo "Rust: $(rustc --version)"
    @echo "Cargo: $(cargo --version)"
    @echo "Tauri CLI: $(npm list @tauri-apps/cli --depth=0 2>/dev/null | grep tauri || echo 'not installed')"

# Kill any running dev instances
kill:
    pkill -f "git-streaks" || true
    lsof -ti:1420 | xargs kill -9 2>/dev/null || true
    @echo "Killed running instances"

# Restart development server
restart: kill dev

# Open project in VS Code
code:
    code .

# Show bundle sizes
sizes:
    @echo "Frontend bundle:"
    @du -sh dist 2>/dev/null || echo "  Not built yet"
    @echo ""
    @echo "Release binary:"
    @du -sh src-tauri/target/release/git-streaks 2>/dev/null || echo "  Not built yet"
    @echo ""
    @echo "macOS app bundle:"
    @du -sh "src-tauri/target/release/bundle/macos/Git Streaks.app" 2>/dev/null || echo "  Not built yet"

# Run the built release binary directly
run-release:
    ./src-tauri/target/release/git-streaks

# ============================================================================
# Git Helpers
# ============================================================================

# Show git status
status:
    git status -sb

# Create a new feature branch
branch name:
    git checkout -b feature/{{name}}

# Commit with message
commit msg:
    git add -A
    git commit -m "{{msg}}"

# Push current branch
push:
    git push -u origin $(git branch --show-current)

# ============================================================================
# Release
# ============================================================================

# Bump version (patch)
bump-patch:
    npm version patch --no-git-tag-version
    @VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4) && \
    sed -i '' "s/^version = .*/version = \"$$VERSION\"/" src-tauri/Cargo.toml && \
    sed -i '' "s/\"version\": .*/\"version\": \"$$VERSION\",/" src-tauri/tauri.conf.json
    @echo "Bumped to v$(grep '"version"' package.json | head -1 | cut -d'"' -f4)"

# Bump version (minor)
bump-minor:
    npm version minor --no-git-tag-version
    @VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4) && \
    sed -i '' "s/^version = .*/version = \"$$VERSION\"/" src-tauri/Cargo.toml && \
    sed -i '' "s/\"version\": .*/\"version\": \"$$VERSION\",/" src-tauri/tauri.conf.json
    @echo "Bumped to v$(grep '"version"' package.json | head -1 | cut -d'"' -f4)"

# Bump version (major)
bump-major:
    npm version major --no-git-tag-version
    @VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4) && \
    sed -i '' "s/^version = .*/version = \"$$VERSION\"/" src-tauri/Cargo.toml && \
    sed -i '' "s/\"version\": .*/\"version\": \"$$VERSION\",/" src-tauri/tauri.conf.json
    @echo "Bumped to v$(grep '"version"' package.json | head -1 | cut -d'"' -f4)"

# Create a release build and tag
release version: 
    @echo "Creating release v{{version}}..."
    npm version {{version}} --no-git-tag-version
    @sed -i '' "s/^version = .*/version = \"{{version}}\"/" src-tauri/Cargo.toml
    @sed -i '' "s/\"version\": .*/\"version\": \"{{version}}\",/" src-tauri/tauri.conf.json
    git add -A
    git commit -m "Release v{{version}}"
    git tag -a "v{{version}}" -m "Release v{{version}}"
    @echo "Release v{{version}} created. Push with: git push && git push --tags"
