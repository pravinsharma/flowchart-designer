# Flowchart Designer

A professional flowchart diagramming tool built with HTML5 Canvas. Create beautiful flowcharts with an intuitive drag-and-drop interface.

## Features

### 🎨 Shape Library
- **Basic Shapes**: Rectangle, Rounded Rectangle, Circle, Diamond
- **Flowchart Shapes**: Process, Decision, Terminator, Data/Input, Document, Database
- **Connectors**: Arrows, Lines
- **Text**: Text boxes with customizable fonts

### 🛠️ Tools
- **Select Tool (V)**: Select, move, and resize shapes
- **Pan Tool (H)**: Pan around the canvas
- **Zoom Controls**: Zoom in (+), Zoom out (-), Reset (0)
- **Undo/Redo (Ctrl+Z/Ctrl+Y)**: Full history support
- **Delete (Del)**: Remove selected shapes

### 🎯 Editing Features
- **Drag & Drop**: Add shapes from palette to canvas
- **Resize**: Drag handles to resize shapes
- **Move**: Click and drag to reposition
- **Double-click**: Edit text on any shape
- **Right-click Menu**: Quick access to common actions
- **Properties Panel**: Real-time property editing
- **Smart Connectors**: Arrows and lines snap to connection points
- **Persistent Connections**: Connectors stay attached when shapes move

### 🎨 Customization
- Fill color
- Stroke color and width
- Text color, size, and font
- Position and dimensions
- Layer ordering (bring to front/send to back)

### 💾 Save & Export
- **Export as PNG**: High-quality raster image
- **Export as JPG**: Compressed image format
- **Export as JSON**: Save and load your work
- **Save/Load**: Resume work on previous diagrams

### ⌨️ Keyboard Shortcuts
- `V` - Select tool
- `H` - Pan tool
- `+` / `=` - Zoom in
- `-` / `_` - Zoom out
- `0` - Reset zoom
- `Delete` - Delete selected shape
- `Ctrl+Z` - Undo
- `Ctrl+Y` / `Ctrl+Shift+Z` - Redo
- `Esc` - Deselect / Cancel current action
- `Double-click` - Edit text

## How to Use

### 1. Open the Application

Simply open `index.html` in a modern web browser:

```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

Or serve it with a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

### 2. Create a Flowchart

#### Adding Shapes
1. Click on a shape in the left palette
2. Click and drag on the canvas to draw the shape
3. Release to create the shape

#### Editing Shapes
1. **Select**: Click on a shape to select it
2. **Move**: Drag the selected shape
3. **Resize**: Drag the corner/edge handles
4. **Edit Text**: Double-click the shape or use right-click menu
5. **Properties**: Use the properties panel on the right to customize

#### Using Connectors
1. Click on "Arrow" or "Line" in the palette
2. Click and drag from start point to end point
3. **Connection Points**: When near a shape, blue connection points appear
4. **Snap to Connect**: Drag connector endpoint near a connection point to snap
5. Release to create the connector
6. **Stay Connected**: When you move a connected shape, connectors automatically follow
7. **Reconnect**: Drag connector endpoints to different connection points anytime

### 3. Navigation
- **Pan**: Click the pan tool (hand icon) or press `H`, then drag the canvas
- **Zoom**: Use the zoom buttons or mouse wheel (scroll to zoom)
- **Reset View**: Click the reset zoom button or press `0`

### 4. Right-Click Menu
Right-click on any shape to access:
- Edit Text
- Duplicate
- Bring to Front
- Send to Back
- Delete

### 5. Properties Panel
Select any shape to see and edit:
- Text content and styling
- Colors (fill, stroke, text)
- Position and size
- Stroke width

### 6. Save Your Work

#### Save as JSON (Recommended)
1. Click "Save" button in the header
2. Your diagram is saved as a `.json` file
3. Use "Load" button to open it later

#### Export as Image
1. Click "Export" button
2. Choose format (PNG or JPG)
3. Image is downloaded automatically

## Use Cases

### Business
- 📊 Business process flows
- 🔄 Workflow diagrams
- 📈 Decision trees
- 🗂️ Organizational charts

### Software Development
- 💻 Algorithm flowcharts
- 🏗️ System architecture
- 🔀 State machines
- 📱 User flows

### Education
- 📚 Teaching concepts
- 🧮 Math problems
- 🔬 Scientific processes
- 📖 Study guides

## Technical Details

### Architecture
- **Pure JavaScript** - No external dependencies
- **HTML5 Canvas** - Hardware-accelerated rendering
- **Object-Oriented** - Clean, maintainable code structure
- **Responsive** - Works on desktop and tablets

### Browser Support
✅ Chrome/Edge (latest)  
✅ Firefox (latest)  
✅ Safari (latest)  
✅ Opera (latest)

### Performance
- Efficient rendering with canvas
- Smart redraw on changes only
- Handles hundreds of shapes smoothly
- Zoom and pan with hardware acceleration
- Real-time connector snapping with minimal overhead

## File Structure

```
flowchart-designer/
├── index.html          # Main HTML file
├── styles.css          # All styles
├── shapes.js           # Shape classes and definitions
├── canvas.js           # Canvas controller and rendering
├── app.js              # Main application logic
└── README.md           # This file
```

## Customization

### Adding New Shapes

Edit `shapes.js` to add new shape classes:

```javascript
class MyCustomShape extends Shape {
    drawShape(ctx) {
        // Your custom drawing code
        ctx.beginPath();
        // ... draw your shape
        ctx.fill();
        ctx.stroke();
    }
}
```

Then add to the palette in `index.html`:

```html
<div class="shape-item" data-shape="custom" title="Custom Shape">
    <div class="shape-preview"><!-- preview --></div>
    <span>Custom</span>
</div>
```

And register in `canvas.js` `createShape` method:

```javascript
const shapeMap = {
    // ... existing shapes
    'custom': MyCustomShape
};
```

### Changing Colors

Edit `styles.css` to customize the UI:

```css
/* Change header gradient */
.header {
    background: linear-gradient(135deg, #your-color-1, #your-color-2);
}

/* Change selection handles color */
.handle {
    background: #your-color;
}
```

### Adding Keyboard Shortcuts

Edit `app.js` in the `setupKeyboardShortcuts` method:

```javascript
if (e.key === 'your-key') {
    // Your action
}
```

## Tips & Tricks

### 1. Precise Positioning
- Use the properties panel to enter exact X, Y coordinates
- Connector snapping to connection points (15px snap distance)
- Grid snapping (coming soon)

### 2. Quick Duplication
- Right-click → Duplicate
- Or copy the shape using Ctrl+C / Ctrl+V (coming soon)

### 3. Alignment
- Select multiple shapes (coming soon)
- Use alignment tools (coming soon)

### 4. Templates
- Save common diagrams as JSON
- Load as starting point for new diagrams

### 5. Professional Look
- Use consistent colors across shapes
- Align shapes properly
- Use appropriate fonts and sizes
- Keep adequate spacing

### 6. Working with Connectors
- **8 Connection Points**: Each shape has 8 connection points (top, right, bottom, left, and corners)
- **Visual Feedback**: Connection points light up when you're close enough to snap
- **Smart Movement**: Connected shapes automatically update connector positions
- **Flexible Editing**: Drag connector endpoints to reconnect to different shapes

## Known Limitations

- SVG export not yet implemented (coming soon)
- No multi-select yet (coming soon)
- No shape grouping (coming soon)
- No auto-routing for connectors (coming soon)
- No grid snapping (coming soon)
- Connectors don't avoid overlapping shapes (manual routing)

## Future Enhancements

### Planned Features
- [ ] Multi-select with Shift+Click
- [ ] Shape grouping and ungrouping
- [ ] Alignment tools (align left, center, right, etc.)
- [ ] Distribution tools (space evenly)
- [ ] Grid snapping and guidelines
- [x] Smart connectors that attach to shapes
- [ ] Auto-routing for connectors (path finding)
- [ ] SVG export
- [ ] PDF export
- [ ] Templates library
- [ ] Collaborative editing
- [ ] Cloud save
- [ ] Shape library expansion
- [ ] Themes (dark mode)
- [ ] Layers panel
- [ ] Comments and annotations

## Troubleshooting

### Shapes not appearing
- Check browser console for errors
- Ensure JavaScript is enabled
- Try refreshing the page

### Performance issues
- Reduce number of shapes
- Reset zoom to 100%
- Clear browser cache

### Canvas not responsive
- Ensure window is not minimized
- Try resizing browser window
- Check browser compatibility

## Contributing

Feel free to fork and customize this project for your needs!

### Ideas for Contributions
- New shape types
- Additional export formats
- Keyboard shortcuts
- UI improvements
- Performance optimizations
- Bug fixes

## License

Free to use for personal and commercial projects.

## Credits

- Icons: Font Awesome 6.4.0
- Inspired by tools like Lucidchart, Draw.io, and Figma

---

**Enjoy creating flowcharts!** 📊✨

For questions or feedback, feel free to reach out!
