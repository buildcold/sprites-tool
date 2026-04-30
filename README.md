# Sprite Animation Preview Tool

A desktop application for previewing and exporting sprite animations.

## Features

- **Sprite Image Upload**: Upload sprite sheet images (PNG, JPG, WebP, etc.)
- **Customizable Grid**: Configure rows, columns, and total frames
- **Frame Dimensions**: Adjust frame width and height
- **Animation Preview**: Play/pause animation with configurable FPS
- **Multiple Export Formats**:
  - GIF
  - APNG (Animated PNG)
  - WebP

## Usage

1. Upload your sprite sheet image
2. Configure the grid layout (rows, columns, total frames)
3. Adjust frame dimensions if needed
4. Preview the animation
5. Export to your preferred format

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Technologies

- React
- Vite
- Tauri
- Tailwind CSS 4
- gif.js (GIF export)
- apng-fest (APNG export)
- FFmpeg (WebP export)
