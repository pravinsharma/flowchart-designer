# Dark Mode Feature

## Overview
The dark mode feature provides an alternative color scheme that reduces eye strain in low-light conditions. Users can toggle between light and dark themes using a dedicated theme switcher in the toolbar.

## Features

### Theme Options
- **Light Theme**: Default theme with light background and dark text
- **Dark Theme**: Alternative theme with dark background and light text
- **System Theme**: Automatically matches the system's theme preference (using `prefers-color-scheme`)

### Color Palette
Light Theme:
- Background: #ffffff
- Surface: #f8f9fa
- Primary: #667eea
- Secondary: #764ba2
- Text: #333333
- Border: #e0e0e0

Dark Theme:
- Background: #1a1a1a
- Surface: #2d2d2d
- Primary: #8c9eff
- Secondary: #b39ddb
- Text: #ffffff
- Border: #404040

### Theme-Aware Elements
- Canvas background and grid
- Toolbar and buttons
- Panels (Properties, Comments)
- Shapes and connectors
- Context menus
- Modals and dialogs
- Selection highlights
- Guidelines

### Persistence
- Theme preference is saved in browser's localStorage
- Preserved across sessions
- Can be exported/imported with diagram settings

## Usage
1. Click the theme toggle button in the toolbar (sun/moon icon)
2. Select desired theme (Light/Dark/System)
3. Theme is applied immediately
4. Settings persist across browser sessions

## Keyboard Shortcuts
- `Alt + T`: Toggle between light and dark themes

## Technical Details
- CSS variables for theme colors
- Media query support for system theme preference
- Smooth transitions between themes
- SVG icon adjustments for theme contrast
- Canvas rendering optimizations for dark mode