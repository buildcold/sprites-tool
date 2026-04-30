# Sprite Animation Preview Tool

<br />

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

***

# Sprite 动画预览工具

<br />

一个用于预览和导出 Sprite 动画的桌面应用程序。

## 功能特性

- **Sprite 图片上传**: 支持上传精灵图（PNG, JPG, WebP 等格式）
- **自定义网格**: 配置行数、列数和总帧数
- **帧尺寸调整**: 自定义帧宽度和高度
- **动画预览**: 可配置 FPS 的播放/暂停动画预览
- **多种导出格式**:
  - GIF
  - APNG（动画 PNG）
  - WebP

## 使用方法

1. 上传您的 Sprite 图片
2. 配置网格布局（行数、列数、总帧数）
3. 根据需要调整帧尺寸
4. 预览动画
5. 导出到您喜欢的格式

## 开发

```bash
# 安装依赖
npm install

# 开发模式运行
npm run tauri:dev

# 构建生产版本
npm run tauri:build
```

## 技术栈

- React
- Vite
- Tauri
- Tailwind CSS 4
- gif.js（GIF 导出）
- apng-fest（APNG 导出）
- FFmpeg（WebP 导出）

