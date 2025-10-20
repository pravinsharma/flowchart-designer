// Shape Classes

class Shape {
    constructor(x, y, width, height) {
        this.id = Date.now() + Math.random();
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.fillColor = '#ffffff';
        this.strokeColor = '#333333';
        this.strokeWidth = 2;
        this.text = '';
        this.fontSize = 14;
        this.fontFamily = 'Arial';
        this.textColor = '#000000';
        this.selected = false;
        this.rotation = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));

        // Draw shape
        ctx.fillStyle = this.fillColor;
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        this.drawShape(ctx);

        // Draw text
        if (this.text) {
            this.drawText(ctx);
        }

        // Draw selection handles
        if (this.selected) {
            this.drawSelectionHandles(ctx);
        }

        ctx.restore();
    }

    drawShape(ctx) {
        // Override in subclasses
    }

    drawText(ctx) {
        ctx.fillStyle = this.textColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const lines = this.text.split('\n');
        const lineHeight = this.fontSize * 1.2;
        const startY = this.y + this.height / 2 - ((lines.length - 1) * lineHeight) / 2;
        
        lines.forEach((line, i) => {
            ctx.fillText(line, this.x + this.width / 2, startY + i * lineHeight);
        });
    }

    drawSelectionHandles(ctx) {
        ctx.fillStyle = '#667eea';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        
        const handleSize = 8;
        const handles = this.getHandles();
        
        handles.forEach(handle => {
            ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        });
    }

    getHandles() {
        return [
            { x: this.x, y: this.y, cursor: 'nw-resize' },
            { x: this.x + this.width / 2, y: this.y, cursor: 'n-resize' },
            { x: this.x + this.width, y: this.y, cursor: 'ne-resize' },
            { x: this.x + this.width, y: this.y + this.height / 2, cursor: 'e-resize' },
            { x: this.x + this.width, y: this.y + this.height, cursor: 'se-resize' },
            { x: this.x + this.width / 2, y: this.y + this.height, cursor: 's-resize' },
            { x: this.x, y: this.y + this.height, cursor: 'sw-resize' },
            { x: this.x, y: this.y + this.height / 2, cursor: 'w-resize' }
        ];
    }

    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    getHandleAtPoint(x, y) {
        const handles = this.getHandles();
        const handleSize = 8;
        
        for (let i = 0; i < handles.length; i++) {
            const handle = handles[i];
            if (x >= handle.x - handleSize && x <= handle.x + handleSize &&
                y >= handle.y - handleSize && y <= handle.y + handleSize) {
                return i;
            }
        }
        return -1;
    }

    // Get connection points for snapping connectors
    getConnectionPoints() {
        return [
            { x: this.x + this.width / 2, y: this.y, position: 'top' },                    // Top
            { x: this.x + this.width, y: this.y + this.height / 2, position: 'right' },    // Right
            { x: this.x + this.width / 2, y: this.y + this.height, position: 'bottom' },   // Bottom
            { x: this.x, y: this.y + this.height / 2, position: 'left' },                  // Left
            { x: this.x + this.width, y: this.y, position: 'top-right' },                  // Top-right
            { x: this.x, y: this.y, position: 'top-left' },                                // Top-left
            { x: this.x + this.width, y: this.y + this.height, position: 'bottom-right' }, // Bottom-right
            { x: this.x, y: this.y + this.height, position: 'bottom-left' }                // Bottom-left
        ];
    }

    // Draw connection points when hovered/selected
    drawConnectionPoints(ctx) {
        const points = this.getConnectionPoints();
        ctx.fillStyle = '#667eea';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    }

    toJSON() {
        return {
            type: this.constructor.name,
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            textColor: this.textColor,
            rotation: this.rotation
        };
    }
}

class Rectangle extends Shape {
    drawShape(ctx) {
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

class RoundedRectangle extends Shape {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.radius = 15;
    }

    drawShape(ctx) {
        const r = Math.min(this.radius, this.width / 2, this.height / 2);
        ctx.beginPath();
        ctx.moveTo(this.x + r, this.y);
        ctx.lineTo(this.x + this.width - r, this.y);
        ctx.arcTo(this.x + this.width, this.y, this.x + this.width, this.y + r, r);
        ctx.lineTo(this.x + this.width, this.y + this.height - r);
        ctx.arcTo(this.x + this.width, this.y + this.height, this.x + this.width - r, this.y + this.height, r);
        ctx.lineTo(this.x + r, this.y + this.height);
        ctx.arcTo(this.x, this.y + this.height, this.x, this.y + this.height - r, r);
        ctx.lineTo(this.x, this.y + r);
        ctx.arcTo(this.x, this.y, this.x + r, this.y, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

class Circle extends Shape {
    drawShape(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = Math.min(this.width, this.height) / 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    containsPoint(x, y) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = Math.min(this.width, this.height) / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        return dx * dx + dy * dy <= radius * radius;
    }

    // Override connection points to be on circle perimeter
    getConnectionPoints() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = Math.min(this.width, this.height) / 2;
        
        // Calculate points on circle perimeter at key angles
        const angles = [0, 45, 90, 135, 180, 225, 270, 315]; // degrees
        return angles.map(deg => {
            const rad = (deg * Math.PI) / 180;
            return {
                x: centerX + radius * Math.cos(rad),
                y: centerY + radius * Math.sin(rad),
                position: `${deg}deg`
            };
        });
    }

    // Override handles to be on circle perimeter
    getHandles() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = Math.min(this.width, this.height) / 2;
        
        // 8 resize handles on the circle perimeter
        return [
            { x: centerX, y: centerY - radius, cursor: 'n-resize' },           // Top
            { x: centerX + radius * 0.707, y: centerY - radius * 0.707, cursor: 'ne-resize' }, // Top-right
            { x: centerX + radius, y: centerY, cursor: 'e-resize' },           // Right
            { x: centerX + radius * 0.707, y: centerY + radius * 0.707, cursor: 'se-resize' }, // Bottom-right
            { x: centerX, y: centerY + radius, cursor: 's-resize' },           // Bottom
            { x: centerX - radius * 0.707, y: centerY + radius * 0.707, cursor: 'sw-resize' }, // Bottom-left
            { x: centerX - radius, y: centerY, cursor: 'w-resize' },           // Left
            { x: centerX - radius * 0.707, y: centerY - radius * 0.707, cursor: 'nw-resize' }  // Top-left
        ];
    }
}

class Diamond extends Shape {
    drawShape(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, this.y);
        ctx.lineTo(this.x + this.width, centerY);
        ctx.lineTo(centerX, this.y + this.height);
        ctx.lineTo(this.x, centerY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    containsPoint(x, y) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Check if point is inside diamond using cross product
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        return dx / (this.width / 2) + dy / (this.height / 2) <= 1;
    }

    // Override connection points to be on diamond edges
    getConnectionPoints() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        return [
            // Primary points (4 vertices)
            { x: centerX, y: this.y, position: 'top' },
            { x: this.x + this.width, y: centerY, position: 'right' },
            { x: centerX, y: this.y + this.height, position: 'bottom' },
            { x: this.x, y: centerY, position: 'left' },
            // Mid-edge points (4 edges)
            { x: centerX + halfWidth / 2, y: centerY - halfHeight / 2, position: 'top-right' },
            { x: centerX + halfWidth / 2, y: centerY + halfHeight / 2, position: 'bottom-right' },
            { x: centerX - halfWidth / 2, y: centerY + halfHeight / 2, position: 'bottom-left' },
            { x: centerX - halfWidth / 2, y: centerY - halfHeight / 2, position: 'top-left' }
        ];
    }

    // Override handles to be on diamond vertices
    getHandles() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        return [
            { x: centerX, y: this.y, cursor: 'n-resize' },
            { x: centerX + this.width * 0.35, y: centerY - this.height * 0.35, cursor: 'ne-resize' },
            { x: this.x + this.width, y: centerY, cursor: 'e-resize' },
            { x: centerX + this.width * 0.35, y: centerY + this.height * 0.35, cursor: 'se-resize' },
            { x: centerX, y: this.y + this.height, cursor: 's-resize' },
            { x: centerX - this.width * 0.35, y: centerY + this.height * 0.35, cursor: 'sw-resize' },
            { x: this.x, y: centerY, cursor: 'w-resize' },
            { x: centerX - this.width * 0.35, y: centerY - this.height * 0.35, cursor: 'nw-resize' }
        ];
    }
}

class Parallelogram extends Shape {
    drawShape(ctx) {
        const skew = this.width * 0.15;
        
        ctx.beginPath();
        ctx.moveTo(this.x + skew, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width - skew, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

class Document extends Shape {
    drawShape(ctx) {
        const waveHeight = this.height * 0.1;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height - waveHeight);
        
        // Wave at bottom
        ctx.quadraticCurveTo(
            this.x + this.width * 0.75, this.y + this.height - waveHeight * 2,
            this.x + this.width / 2, this.y + this.height - waveHeight
        );
        ctx.quadraticCurveTo(
            this.x + this.width * 0.25, this.y + this.height,
            this.x, this.y + this.height - waveHeight
        );
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

class Database extends Shape {
    drawShape(ctx) {
        const ellipseHeight = this.height * 0.2;
        
        ctx.beginPath();
        // Top ellipse
        ctx.ellipse(this.x + this.width / 2, this.y + ellipseHeight / 2, 
                   this.width / 2, ellipseHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Sides
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + ellipseHeight / 2);
        ctx.lineTo(this.x, this.y + this.height - ellipseHeight / 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x + this.width, this.y + ellipseHeight / 2);
        ctx.lineTo(this.x + this.width, this.y + this.height - ellipseHeight / 2);
        ctx.stroke();
        
        // Bottom ellipse
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height - ellipseHeight / 2,
                   this.width / 2, ellipseHeight / 2, 0, 0, Math.PI);
        ctx.stroke();
    }
}

class Arrow extends Shape {
    constructor(x1, y1, x2, y2) {
        super(Math.min(x1, x2), Math.min(y1, y2), 
              Math.abs(x2 - x1), Math.abs(y2 - y1));
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.fillColor = 'transparent';
        // Store initial offset for proper movement
        this._offsetX1 = x1 - this.x;
        this._offsetY1 = y1 - this.y;
        this._offsetX2 = x2 - this.x;
        this._offsetY2 = y2 - this.y;
        // Connection tracking
        this.startConnection = null; // { shapeId, position }
        this.endConnection = null;   // { shapeId, position }
        // Waypoints for multi-segment lines
        this.waypoints = []; // Array of {x, y} between start and end
    }

    // Override getHandles to include waypoints
    getHandles() {
        const handles = [
            { x: this.x1, y: this.y1, cursor: 'move', type: 'endpoint' },
            { x: this.x2, y: this.y2, cursor: 'move', type: 'endpoint' }
        ];
        
        // Add waypoint handles
        this.waypoints.forEach((wp, index) => {
            handles.push({ x: wp.x, y: wp.y, cursor: 'move', type: 'waypoint', index });
        });
        
        return handles;
    }

    // Update x1, y1, x2, y2 when position changes
    updateEndpoints() {
        this.x1 = this.x + this._offsetX1;
        this.y1 = this.y + this._offsetY1;
        this.x2 = this.x + this._offsetX2;
        this.y2 = this.y + this._offsetY2;
    }

    drawShape(ctx) {
        const headLength = 15;
        
        // Draw line segments
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        
        // Draw through waypoints
        this.waypoints.forEach(wp => {
            ctx.lineTo(wp.x, wp.y);
        });
        
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
        
        // Draw arrow head at the end
        const lastPoint = this.waypoints.length > 0 ? 
            this.waypoints[this.waypoints.length - 1] : 
            { x: this.x1, y: this.y1 };
        const angle = Math.atan2(this.y2 - lastPoint.y, this.x2 - lastPoint.x);
        
        ctx.beginPath();
        ctx.moveTo(this.x2, this.y2);
        ctx.lineTo(
            this.x2 - headLength * Math.cos(angle - Math.PI / 6),
            this.y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(this.x2, this.y2);
        ctx.lineTo(
            this.x2 - headLength * Math.cos(angle + Math.PI / 6),
            this.y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }

    containsPoint(x, y) {
        // Check if point is near line
        const dist = this.distanceToLine(x, y);
        return dist < 10;
    }

    distanceToLine(x, y) {
        // Check distance to each segment
        const points = [{ x: this.x1, y: this.y1 }, ...this.waypoints, { x: this.x2, y: this.y2 }];
        let minDist = Infinity;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            const A = x - p1.x;
            const B = y - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;
            
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            
            if (lenSq !== 0) param = dot / lenSq;
            
            let xx, yy;
            
            if (param < 0) {
                xx = p1.x;
                yy = p1.y;
            } else if (param > 1) {
                xx = p2.x;
                yy = p2.y;
            } else {
                xx = p1.x + param * C;
                yy = p1.y + param * D;
            }
            
            const dx = x - xx;
            const dy = y - yy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
            }
        }
        
        return minDist;
    }
    
    // Add waypoint at the closest point on the line
    addWaypointAt(x, y) {
        const points = [{ x: this.x1, y: this.y1 }, ...this.waypoints, { x: this.x2, y: this.y2 }];
        let closestSegment = 0;
        let minDist = Infinity;
        let closestPoint = { x, y };
        
        // Find which segment is closest
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            const A = x - p1.x;
            const B = y - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;
            
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = lenSq !== 0 ? dot / lenSq : -1;
            param = Math.max(0, Math.min(1, param));
            
            const xx = p1.x + param * C;
            const yy = p1.y + param * D;
            
            const dx = x - xx;
            const dy = y - yy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
                closestSegment = i;
                closestPoint = { x: xx, y: yy };
            }
        }
        
        // Insert waypoint at the appropriate position
        this.waypoints.splice(closestSegment, 0, closestPoint);
        this.updateBoundingBox();
    }
    
    // Update bounding box to include all waypoints
    updateBoundingBox() {
        const allPoints = [{ x: this.x1, y: this.y1 }, ...this.waypoints, { x: this.x2, y: this.y2 }];
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        allPoints.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        
        this.x = minX;
        this.y = minY;
        this.width = maxX - minX;
        this.height = maxY - minY;
    }

    // Update connections when shapes move
    updateConnections(shapes) {
        if (this.startConnection) {
            const shape = shapes.find(s => s.id === this.startConnection.shapeId);
            if (shape) {
                const point = shape.getConnectionPoints().find(p => p.position === this.startConnection.position);
                if (point) {
                    this.x1 = point.x;
                    this.y1 = point.y;
                }
            }
        }
        if (this.endConnection) {
            const shape = shapes.find(s => s.id === this.endConnection.shapeId);
            if (shape) {
                const point = shape.getConnectionPoints().find(p => p.position === this.endConnection.position);
                if (point) {
                    this.x2 = point.x;
                    this.y2 = point.y;
                }
            }
        }
        // Update bounding box
        this.x = Math.min(this.x1, this.x2);
        this.y = Math.min(this.y1, this.y2);
        this.width = Math.abs(this.x2 - this.x1);
        this.height = Math.abs(this.y2 - this.y1);
        this._offsetX1 = this.x1 - this.x;
        this._offsetY1 = this.y1 - this.y;
        this._offsetX2 = this.x2 - this.x;
        this._offsetY2 = this.y2 - this.y;
    }

    toJSON() {
        const json = super.toJSON();
        json.x1 = this.x1;
        json.y1 = this.y1;
        json.x2 = this.x2;
        json.y2 = this.y2;
        json.startConnection = this.startConnection;
        json.endConnection = this.endConnection;
        json.waypoints = this.waypoints;
        return json;
    }
}

class Line extends Arrow {
    drawShape(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        
        // Draw through waypoints
        this.waypoints.forEach(wp => {
            ctx.lineTo(wp.x, wp.y);
        });
        
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
    }
}

class TextBox extends Shape {
    drawShape(ctx) {
        // Text box has transparent fill by default
        if (this.fillColor !== 'transparent') {
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        if (this.strokeWidth > 0) {
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}
