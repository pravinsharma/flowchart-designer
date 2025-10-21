# Comments and Annotations Feature

## Overview
The comments and annotations feature allows users to add notes, explanations, and feedback to flowcharts without affecting the diagram structure. This feature enhances collaboration and documentation by enabling users to communicate ideas and suggestions directly on the diagram.

## Features

### Comment Types
- **Sticky Notes**: Floating comment boxes that can be placed anywhere on the canvas
- **Shape Comments**: Comments attached to specific shapes
- **Connector Comments**: Comments attached to connectors
- **Area Highlights**: Semi-transparent highlight regions with associated comments

### Comment Properties
- Text content with support for basic formatting
- Author name (optional)
- Timestamp
- Color coding for different types or priorities
- Visibility toggle
- Minimized/Expanded state

### Visual Indicators
- Comment icon on shapes/connectors that have comments
- Different icons for read/unread comments
- Color-coded borders for different comment types/priorities
- Minimized comments show as small icons

## Usage

### Adding Comments
1. **Sticky Notes**:
   - Click the comment tool in the toolbar
   - Click anywhere on the canvas to place the comment
   - Type your comment text

2. **Shape Comments**:
   - Select a shape
   - Click the comment icon in the toolbar or press `C`
   - Type your comment
   
3. **Connector Comments**:
   - Select a connector
   - Click the comment icon or press `C`
   - Add your comment

4. **Area Highlights**:
   - Click the highlight tool in the toolbar
   - Draw a rectangle to create highlight area
   - Add associated comment

### Managing Comments
- Double-click to edit
- Drag to reposition
- Click the minimize button to collapse
- Click the delete button to remove
- Use the comment panel to view all comments

### Comment Panel
- Shows all comments in the diagram
- Filter by type (sticky note, shape, connector)
- Sort by date, author, or type
- Search comments
- Toggle visibility of all comments

## Keyboard Shortcuts
- `C`: Add comment to selected shape/connector
- `Shift + C`: Create sticky note at cursor position
- `Alt + C`: Toggle comment panel
- `Esc`: Cancel comment creation
- `Delete`: Remove selected comment

## Export Options
- Include/exclude comments in exports
- Export comments as separate document
- PDF export with comment annotations
- Comments included in JSON project files

## Notes
- Comments are saved with the flowchart in JSON format
- Comments can be toggled on/off globally
- Each comment has a unique identifier
- Comments maintain position relative to shapes when moving/scaling
- Area highlights adjust with zoom level
- Comments support basic text formatting (bold, italic, bullet points)