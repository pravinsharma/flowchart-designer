# Grouped Objects Connector Fix

## Problem
When moving grouped objects, connectors that were attached to shapes inside the group would get detached, breaking the visual connections.

## Root Cause
The issue occurred because:

1. **Connection point search was limited**: The `findNearestConnectionPoint()` method only searched through `this.shapes` (top-level shapes), ignoring shapes nested inside groups.

2. **Timing issue with child position updates**: When moving a group, child shapes' positions were updated, but connectors weren't being updated at the right time to track the new positions.

3. **Missing updates on group/ungroup**: When grouping or ungrouping shapes, connector connections weren't being refreshed.

## Solution

### 1. Enhanced Connection Point Search
Modified `findNearestConnectionPoint()` to search through all shapes including those inside groups:

```javascript
// Find nearest connection point within snap distance
findNearestConnectionPoint(x, y, excludeShape) {
    let nearest = null;
    let minDistance = this.snapDistance / this.zoom;
    
    // Get all shapes including those inside groups
    const allShapes = this.getAllShapesIncludingGrouped();
    
    for (const shape of allShapes) {
        if (shape === excludeShape || shape instanceof Arrow || shape instanceof Line) continue;
        
        const points = shape.getConnectionPoints();
        for (const point of points) {
            const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { shape, point };
            }
        }
    }
    
    return nearest;
}
```

### 2. Improved Group Movement Logic
Added an extra `updateChildPositions()` call after snapping to ensure child shapes are in the correct position before `updateAllConnections()` is called:

```javascript
// Update child positions AGAIN after snapping to ensure consistency
if (primaryShape instanceof Group) {
    primaryShape.updateChildPositions();
}
this.selectedShapes.forEach(shape => {
    if (shape !== primaryShape && shape instanceof Group) {
        shape.updateChildPositions();
    }
});

// Update all connector connections when shapes move
this.updateAllConnections();
```

### 3. Added Connection Updates on Group/Ungroup Operations

**On Grouping:**
```javascript
// Add group to canvas
this.shapes.push(group);

// Update all connector connections after grouping
this.updateAllConnections();

// Select the group
this.selectShape(group);
```

**On Ungrouping:**
```javascript
// Select the ungrouped shapes
this.selectedShapes = childShapes;
childShapes.forEach(shape => shape.selected = true);
this.selectedShape = childShapes[0];

// Update all connector connections after ungrouping
this.updateAllConnections();
```

## How It Works

### Connection Tracking
Connectors maintain connections via:
- `startConnection: { shapeId, position }` - Tracks the shape ID and connection point position
- `endConnection: { shapeId, position }` - Same for the endpoint

### Update Flow
1. When a group moves, `updateChildPositions()` updates all child shape positions
2. Child positions are updated again after snapping to ensure accuracy
3. `updateAllConnections()` is called, which:
   - Iterates through all connectors
   - Calls `updateConnections(shapes, allShapes)` on each
   - Searches through `allShapes` (includes grouped shapes) to find connected shapes
   - Updates connector endpoints to match the new connection point positions

### Key Helper Methods
- `getAllShapesIncludingGrouped()`: Recursively collects all shapes, including those inside groups
- `updateConnections(shapes, allShapes)`: Updates a connector's endpoints based on its stored connections
- `updateAllConnections()`: Updates all connectors on the canvas

## Testing
To verify the fix:

1. Create two or more shapes
2. Connect them with arrows
3. Select and group the shapes (Ctrl+G)
4. Move the group - connectors should stay attached
5. Ungroup (Ctrl+Shift+G) - connectors should remain attached
6. Move individual shapes - connectors should still follow

## Files Modified
- `canvas.js`: 
  - `findNearestConnectionPoint()` - Now searches grouped shapes
  - `handleMouseMove()` - Added extra `updateChildPositions()` calls
  - `groupShapes()` - Added `updateAllConnections()` call
  - `ungroupShapes()` - Added `updateAllConnections()` call

## Benefits
- ✅ Connectors stay attached when moving grouped objects
- ✅ Connectors maintain connections through group/ungroup operations
- ✅ Connection points are searchable even when shapes are inside groups
- ✅ Consistent behavior for both individual and grouped shape movements
