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
    }

    drawShape(ctx) {
        const headLength = 15;
        const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
        
        // Draw arrow head
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
        const A = x - this.x1;
        const B = y - this.y1;
        const C = this.x2 - this.x1;
        const D = this.y2 - this.y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = this.x1;
            yy = this.y1;
        } else if (param > 1) {
            xx = this.x2;
            yy = this.y2;
        } else {
            xx = this.x1 + param * C;
            yy = this.y1 + param * D;
        }
        
        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    toJSON() {
        const json = super.toJSON();
        json.x1 = this.x1;
        json.y1 = this.y1;
        json.x2 = this.x2;
        json.y2 = this.y2;
        return json;
    }
}

class Line extends Arrow {
    drawShape(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
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
