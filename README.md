# Git Streaks

A lightweight, cross-platform desktop app that lives in your system tray and displays your GitHub contribution heatmap and streak statistics. Built with Tauri 2, React, and TypeScript.

![Git Streaks](src-tauri/icons/git-streaks.svg)

## Features

- **System Tray App** - Runs quietly in your menu bar/system tray with a single-click popup
- **GitHub Contribution Heatmap** - Visual representation of your contribution activity with GitHub-style colors
- **Time Range Filtering** - View contributions for 30 days, 12 weeks, or the full year with adaptive cell sizing
- **Streak Statistics** - Track your current streak, longest streak, best day, and total contributions
- **Theme Support** - System, Light, and Dark theme options
- **Launch at Login** - Option to start automatically when you log in
- **Multi-Monitor Support** - Window positions correctly on the monitor where the tray icon is clicked
- **Cross-Platform** - Works on macOS, Windows, and Linux
- **Privacy-Focused** - No authentication required; fetches public contribution data only
- **Lightweight** - Small bundle size with optimized release builds

## Screenshots

The app displays:
- User avatar and username
- Interactive contribution heatmap with hover tooltips
- Stats grid showing Total Contributions, Best Day, Longest Streak, and Current Streak
- Last updated timestamp with manual refresh option

## Installation

### Pre-built Binaries
Download the latest release for your platform from the [Releases](https://github.com/samurmaykrr/git-streaks/releases) page.

### Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://rustup.rs/) (latest stable)
- Platform-specific dependencies for Tauri:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools, WebView2
  - **Linux**: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`

#### Steps

```bash
# Clone the repository
git clone https://github.com/samurmaykrr/git-streaks.git
cd git-streaks

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Usage

1. **Launch the app** - After starting, the Git Streaks icon appears in your system tray/menu bar
2. **Click the tray icon** - Opens the contribution popup window
3. **Enter your GitHub username** - On first launch, enter your GitHub username to start tracking
4. **View your stats** - See your contribution heatmap and streak statistics
5. **Change time range** - Toggle between 30 Days, 12 Weeks, or Year view
6. **Refresh data** - Click the refresh button to fetch latest contributions
7. **Access settings** - Click the gear icon to change username, theme, or launch preferences
8. **Quit the app** - Right-click the tray icon and select "Quit Git Streaks"

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Vite 7** - Build tool
- **@tauri-apps/api** - Tauri JavaScript bindings

### Backend (Rust)
- **Tauri 2** - Desktop app framework
- **reqwest** - HTTP client for fetching GitHub data
- **regex** - Parsing GitHub's contribution calendar HTML
- **chrono** - Date/time handling
- **serde** - Serialization/deserialization
- **tauri-plugin-store** - Persistent settings storage
- **tauri-plugin-autostart** - Launch at login functionality

## Project Structure

```
git-streaks/
├── src/                          # React frontend
│   ├── components/
│   │   ├── heatmap/
│   │   │   ├── Heatmap.tsx       # Contribution grid component
│   │   │   └── HeatmapTooltip.tsx # Hover tooltip
│   │   ├── stats/
│   │   │   └── StatCard.tsx      # Statistics card component
│   │   └── user/
│   │       └── UserHeader.tsx    # User avatar and name
│   ├── hooks/
│   │   ├── useContributions.ts   # Data fetching hook
│   │   └── useSettings.ts        # Settings management hook
│   ├── lib/
│   │   ├── api.ts                # Tauri command wrappers
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── utils.ts              # Utility functions
│   ├── App.tsx                   # Main application component
│   ├── App.css                   # Component styles
│   ├── index.css                 # Global styles and theming
│   └── main.tsx                  # React entry point
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── github/
│   │   │   ├── mod.rs            # Module exports
│   │   │   ├── fetcher.rs        # HTTP fetching logic
│   │   │   └── parser.rs         # HTML parsing for contributions
│   │   ├── lib.rs                # Tauri app setup and commands
│   │   ├── main.rs               # Entry point
│   │   └── types.rs              # Rust data structures
│   ├── icons/                    # App icons for all platforms
│   ├── capabilities/
│   │   └── default.json          # Tauri permissions
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── package.json                  # Node.js dependencies
├── vite.config.ts                # Vite configuration
└── tsconfig.json                 # TypeScript configuration
```

## Configuration

Settings are stored locally using `tauri-plugin-store` at:
- **macOS**: `~/Library/Application Support/com.gitstreaks.desktop/settings.json`
- **Windows**: `%APPDATA%\com.gitstreaks.desktop\settings.json`
- **Linux**: `~/.config/com.gitstreaks.desktop/settings.json`

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `username` | GitHub username to track | (empty) |
| `theme` | UI theme: `system`, `light`, or `dark` | `system` |
| `launchAtLogin` | Start app on system login | `false` |
| `updateInterval` | Data refresh interval in seconds | `3600` |

## How It Works

1. **Data Fetching**: The app fetches your public GitHub profile page and parses the contribution calendar SVG using regex patterns
2. **Parsing**: Extracts contribution data including dates, counts, and activity levels (0-4)
3. **Statistics Calculation**: Computes streaks, totals, and best day from the contribution data
4. **Caching**: Data is cached in memory to avoid unnecessary requests
5. **Display**: React components render the heatmap and statistics with appropriate styling

## Development

### Available Scripts

```bash
# Start development server with hot reload
npm run tauri dev

# Build production bundle
npm run tauri build

# Build frontend only
npm run build

# Type check
tsc --noEmit

# Preview production build
npm run preview
```

### Adding New Features

1. **Frontend changes**: Edit files in `src/`
2. **Backend changes**: Edit files in `src-tauri/src/`
3. **Add new Tauri commands**: Define in `lib.rs` and expose via `invoke_handler`
4. **Add new permissions**: Update `src-tauri/capabilities/default.json`

## Platform Notes

### macOS
- Runs as an "accessory" app (no Dock icon)
- Uses LaunchAgent for autostart
- Minimum supported version: macOS 10.15 (Catalina)

### Windows
- Uses the system tray in the taskbar
- WebView2 is embedded in the installer
- Supports Windows 10 and later

### Linux
- Requires AppIndicator support for system tray
- Tested on Ubuntu, Fedora, and Arch Linux

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - For the amazing desktop app framework
- [GitHub](https://github.com/) - For the contribution graph inspiration
- The open-source community for various dependencies used in this project
