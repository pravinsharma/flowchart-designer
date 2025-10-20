// Canvas Controller

class FlowchartCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.shapes = [];
        this.selectedShape = null;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = -1;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.currentTool = 'select';
        this.currentShapeType = null;
        this.drawingShape = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.history = [];
        this.historyIndex = -1;
        this.snapDistance = 15; // Distance for snapping to connection points
        this.hoveredShape = null; // Track hovered shape for showing connection points
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        this.render();
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.render();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.panX) / this.zoom,
            y: (e.clientY - rect.top - this.panY) / this.zoom
        };
    }

    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        
        if (this.currentTool === 'pan') {
            this.isPanning = true;
            this.dragStartX = e.clientX - this.panX;
            this.dragStartY = e.clientY - this.panY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (this.currentTool === 'select') {
            // Check if clicking on a handle
            if (this.selectedShape) {
                const handleIndex = this.selectedShape.getHandleAtPoint(pos.x, pos.y);
                if (handleIndex !== -1) {
                    this.isResizing = true;
                    this.resizeHandle = handleIndex;
                    this.dragStartX = pos.x;
                    this.dragStartY = pos.y;
                    return;
                }
            }

            // Check if clicking on a shape
            const clickedShape = this.getShapeAtPoint(pos.x, pos.y);
            if (clickedShape) {
                this.selectShape(clickedShape);
                this.isDragging = true;
                this.dragStartX = pos.x - clickedShape.x;
                this.dragStartY = pos.y - clickedShape.y;
            } else {
                this.selectShape(null);
            }
        } else if (this.currentShapeType) {
            // Start drawing a new shape
            this.dragStartX = pos.x;
            this.dragStartY = pos.y;
            this.isDragging = true;
            
            if (this.currentShapeType === 'arrow' || this.currentShapeType === 'line') {
                const ShapeClass = this.currentShapeType === 'arrow' ? Arrow : Line;
                
                // Check if starting near a connection point
                const startSnapResult = this.findNearestConnectionPoint(pos.x, pos.y, null);
                let startX = pos.x;
                let startY = pos.y;
                
                if (startSnapResult) {
                    startX = startSnapResult.point.x;
                    startY = startSnapResult.point.y;
                    this.hoveredShape = startSnapResult.shape;
                }
                
                this.drawingShape = new ShapeClass(startX, startY, startX, startY);
                
                // Set start connection if snapped
                if (startSnapResult) {
                    this.drawingShape.startConnection = {
                        shapeId: startSnapResult.shape.id,
                        position: startSnapResult.point.position
                    };
                }
            } else {
                this.drawingShape = this.createShape(this.currentShapeType, pos.x, pos.y, 0, 0);
            }
        }
        
        this.render();
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);

        if (this.isPanning) {
            this.panX = e.clientX - this.dragStartX;
            this.panY = e.clientY - this.dragStartY;
            this.render();
            return;
        }

        if (this.currentTool === 'select') {
            if (this.isResizing && this.selectedShape) {
                this.resizeShape(this.selectedShape, this.resizeHandle, pos.x, pos.y);
                this.render();
            } else if (this.isDragging && this.selectedShape) {
                this.selectedShape.x = pos.x - this.dragStartX;
                this.selectedShape.y = pos.y - this.dragStartY;
                // Update endpoints for Arrow/Line shapes
                if (this.selectedShape.updateEndpoints) {
                    this.selectedShape.updateEndpoints();
                }
                // Update all connector connections when shapes move
                this.updateAllConnections();
                this.render();
            } else {
                // Update cursor based on what's under mouse
                const shape = this.getShapeAtPoint(pos.x, pos.y);
                if (shape) {
                    if (shape.selected) {
                        const handleIndex = shape.getHandleAtPoint(pos.x, pos.y);
                        if (handleIndex !== -1) {
                            const handles = shape.getHandles();
                            this.canvas.style.cursor = handles[handleIndex].cursor;
                        } else {
                            this.canvas.style.cursor = 'move';
                        }
                    } else {
                        this.canvas.style.cursor = 'pointer';
                    }
                } else {
                    this.canvas.style.cursor = 'default';
                }
            }
        } else if (this.isDragging && this.drawingShape) {
            // Update drawing shape
            if (this.currentShapeType === 'arrow' || this.currentShapeType === 'line') {
                this.drawingShape.x2 = pos.x;
                this.drawingShape.y2 = pos.y;
                
                // Snap endpoint to connection points (excluding start shape if connected)
                let excludeShape = this.drawingShape;
                if (this.drawingShape.startConnection) {
                    const startShape = this.shapes.find(s => s.id === this.drawingShape.startConnection.shapeId);
                    // Allow snapping to the same shape we started from
                    excludeShape = null;
                }
                
                const snapResult = this.findNearestConnectionPoint(pos.x, pos.y, excludeShape);
                if (snapResult) {
                    this.drawingShape.x2 = snapResult.point.x;
                    this.drawingShape.y2 = snapResult.point.y;
                    this.hoveredShape = snapResult.shape;
                } else {
                    this.hoveredShape = null;
                }
                
                this.drawingShape.x = Math.min(this.drawingShape.x1, this.drawingShape.x2);
                this.drawingShape.y = Math.min(this.drawingShape.y1, this.drawingShape.y2);
                this.drawingShape.width = Math.abs(this.drawingShape.x2 - this.drawingShape.x1);
                this.drawingShape.height = Math.abs(this.drawingShape.y2 - this.drawingShape.y1);
                // Update offsets for proper movement later
                if (this.drawingShape.updateEndpoints) {
                    this.drawingShape._offsetX1 = this.drawingShape.x1 - this.drawingShape.x;
                    this.drawingShape._offsetY1 = this.drawingShape.y1 - this.drawingShape.y;
                    this.drawingShape._offsetX2 = this.drawingShape.x2 - this.drawingShape.x;
                    this.drawingShape._offsetY2 = this.drawingShape.y2 - this.drawingShape.y;
                }
            } else {
                const width = pos.x - this.dragStartX;
                const height = pos.y - this.dragStartY;
                this.drawingShape.width = Math.abs(width);
                this.drawingShape.height = Math.abs(height);
                this.drawingShape.x = width < 0 ? pos.x : this.dragStartX;
                this.drawingShape.y = height < 0 ? pos.y : this.dragStartY;
            }
            this.render();
        }
    }

    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
            return;
        }

        if (this.isDragging && this.drawingShape) {
            // For connectors, check if there's any movement
            const isConnector = this.drawingShape instanceof Arrow || this.drawingShape instanceof Line;
            const hasSize = isConnector ? 
                (Math.abs(this.drawingShape.x2 - this.drawingShape.x1) > 5 || Math.abs(this.drawingShape.y2 - this.drawingShape.y1) > 5) :
                (this.drawingShape.width > 10 && this.drawingShape.height > 10);
            
            if (hasSize) {
                // Set end connection if snapped
                if (this.hoveredShape && isConnector) {
                    const snapResult = this.findNearestConnectionPoint(this.drawingShape.x2, this.drawingShape.y2, this.drawingShape);
                    if (snapResult) {
                        this.drawingShape.endConnection = {
                            shapeId: snapResult.shape.id,
                            position: snapResult.point.position
                        };
                    }
                }
                this.addShape(this.drawingShape);
                this.selectShape(this.drawingShape);
                this.saveState();
            }
            this.drawingShape = null;
            this.currentShapeType = null;
            this.hoveredShape = null;
        } else if (this.isDragging || this.isResizing) {
            this.saveState();
        }

        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = -1;
        this.render();
    }

    handleDoubleClick(e) {
        if (this.currentTool === 'select' && this.selectedShape) {
            this.editShapeText(this.selectedShape);
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, this.zoom * delta));
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
        this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
        this.zoom = newZoom;
        
        this.render();
        this.updateZoomDisplay();
    }

    createShape(type, x, y, width, height) {
        const shapeMap = {
            'rectangle': Rectangle,
            'rounded': RoundedRectangle,
            'circle': Circle,
            'diamond': Diamond,
            'process': Rectangle,
            'decision': Diamond,
            'terminator': RoundedRectangle,
            'data': Parallelogram,
            'document': Document,
            'database': Database,
            'text': TextBox
        };

        const ShapeClass = shapeMap[type] || Rectangle;
        const shape = new ShapeClass(x, y, width || 120, height || 80);
        
        // Set default colors based on type
        if (type === 'text') {
            shape.fillColor = 'transparent';
            shape.strokeColor = 'transparent';
        }
        
        return shape;
    }

    addShape(shape) {
        this.shapes.push(shape);
        this.render();
    }

    removeShape(shape) {
        const index = this.shapes.indexOf(shape);
        if (index > -1) {
            this.shapes.splice(index, 1);
            if (this.selectedShape === shape) {
                this.selectedShape = null;
            }
            this.saveState();
            this.render();
        }
    }

    selectShape(shape) {
        if (this.selectedShape) {
            this.selectedShape.selected = false;
        }
        this.selectedShape = shape;
        if (shape) {
            shape.selected = true;
        }
        this.render();
        this.updatePropertiesPanel();
    }

    getShapeAtPoint(x, y) {
        // Check from top to bottom (reverse order)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if (this.shapes[i].containsPoint(x, y)) {
                return this.shapes[i];
            }
        }
        return null;
    }

    resizeShape(shape, handleIndex, x, y) {
        const handles = shape.getHandles();
        const handle = handles[handleIndex];
        
        // Handle Arrow/Line differently (they have only 2 handles)
        if (shape instanceof Arrow || shape instanceof Line) {
            // Snap to connection points
            const snapResult = this.findNearestConnectionPoint(x, y, shape);
            if (snapResult) {
                x = snapResult.point.x;
                y = snapResult.point.y;
                this.hoveredShape = snapResult.shape;
                
                // Set connection
                if (handleIndex === 0) {
                    shape.startConnection = {
                        shapeId: snapResult.shape.id,
                        position: snapResult.point.position
                    };
                } else if (handleIndex === 1) {
                    shape.endConnection = {
                        shapeId: snapResult.shape.id,
                        position: snapResult.point.position
                    };
                }
            } else {
                this.hoveredShape = null;
                // Clear connection
                if (handleIndex === 0) {
                    shape.startConnection = null;
                } else if (handleIndex === 1) {
                    shape.endConnection = null;
                }
            }
            
            if (handleIndex === 0) {
                shape.x1 = x;
                shape.y1 = y;
            } else if (handleIndex === 1) {
                shape.x2 = x;
                shape.y2 = y;
            }
            // Update bounding box
            shape.x = Math.min(shape.x1, shape.x2);
            shape.y = Math.min(shape.y1, shape.y2);
            shape.width = Math.abs(shape.x2 - shape.x1);
            shape.height = Math.abs(shape.y2 - shape.y1);
            // Update offsets
            shape._offsetX1 = shape.x1 - shape.x;
            shape._offsetY1 = shape.y1 - shape.y;
            shape._offsetX2 = shape.x2 - shape.x;
            shape._offsetY2 = shape.y2 - shape.y;
            return;
        }
        
        switch (handleIndex) {
            case 0: // Top-left
                shape.width += shape.x - x;
                shape.height += shape.y - y;
                shape.x = x;
                shape.y = y;
                break;
            case 1: // Top
                shape.height += shape.y - y;
                shape.y = y;
                break;
            case 2: // Top-right
                shape.width = x - shape.x;
                shape.height += shape.y - y;
                shape.y = y;
                break;
            case 3: // Right
                shape.width = x - shape.x;
                break;
            case 4: // Bottom-right
                shape.width = x - shape.x;
                shape.height = y - shape.y;
                break;
            case 5: // Bottom
                shape.height = y - shape.y;
                break;
            case 6: // Bottom-left
                shape.width += shape.x - x;
                shape.x = x;
                shape.height = y - shape.y;
                break;
            case 7: // Left
                shape.width += shape.x - x;
                shape.x = x;
                break;
        }
        
        // Ensure minimum size
        if (shape.width < 20) shape.width = 20;
        if (shape.height < 20) shape.height = 20;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Draw all shapes
        this.shapes.forEach(shape => shape.draw(this.ctx));
        
        // Draw connection points on hovered shape
        if (this.hoveredShape && (this.currentShapeType === 'arrow' || this.currentShapeType === 'line' || 
            (this.isResizing && this.selectedShape && (this.selectedShape instanceof Arrow || this.selectedShape instanceof Line)))) {
            this.hoveredShape.drawConnectionPoints(this.ctx);
        }
        
        // Draw shape being created
        if (this.drawingShape) {
            this.drawingShape.draw(this.ctx);
        }
        
        this.ctx.restore();
    }

    setTool(tool) {
        this.currentTool = tool;
        this.currentShapeType = null;
        
        if (tool === 'pan') {
            this.canvas.style.cursor = 'grab';
        } else if (tool === 'select') {
            this.canvas.style.cursor = 'default';
        }
    }

    setShapeType(type) {
        this.currentTool = 'draw';
        this.currentShapeType = type;
        this.canvas.style.cursor = 'crosshair';
    }

    zoomIn() {
        this.zoom = Math.min(5, this.zoom * 1.2);
        this.render();
        this.updateZoomDisplay();
    }

    zoomOut() {
        this.zoom = Math.max(0.1, this.zoom / 1.2);
        this.render();
        this.updateZoomDisplay();
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
        this.updateZoomDisplay();
    }

    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.zoom * 100) + '%';
        }
    }

    // Find nearest connection point within snap distance
    findNearestConnectionPoint(x, y, excludeShape) {
        let nearest = null;
        let minDistance = this.snapDistance / this.zoom; // Adjust for zoom level
        
        for (const shape of this.shapes) {
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

    // Update all connector connections
    updateAllConnections() {
        this.shapes.forEach(shape => {
            if (shape instanceof Arrow || shape instanceof Line) {
                shape.updateConnections(this.shapes);
            }
        });
    }

    deleteSelected() {
        if (this.selectedShape) {
            this.removeShape(this.selectedShape);
        }
    }

    clear() {
        if (confirm('Are you sure you want to clear the canvas?')) {
            this.shapes = [];
            this.selectedShape = null;
            this.saveState();
            this.render();
            this.updatePropertiesPanel();
        }
    }

    duplicateShape(shape) {
        const json = shape.toJSON();
        json.x += 20;
        json.y += 20;
        json.id = Date.now() + Math.random();
        const newShape = this.shapeFromJSON(json);
        this.addShape(newShape);
        this.selectShape(newShape);
        this.saveState();
    }

    bringToFront(shape) {
        const index = this.shapes.indexOf(shape);
        if (index > -1) {
            this.shapes.splice(index, 1);
            this.shapes.push(shape);
            this.saveState();
            this.render();
        }
    }

    sendToBack(shape) {
        const index = this.shapes.indexOf(shape);
        if (index > -1) {
            this.shapes.splice(index, 1);
            this.shapes.unshift(shape);
            this.saveState();
            this.render();
        }
    }

    saveState() {
        const state = this.toJSON();
        this.historyIndex++;
        this.history = this.history.slice(0, this.historyIndex);
        this.history.push(state);
        
        // Limit history to 50 states
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    loadState(state) {
        this.shapes = state.shapes.map(s => this.shapeFromJSON(s));
        this.selectedShape = null;
        this.render();
        this.updatePropertiesPanel();
    }

    toJSON() {
        return {
            shapes: this.shapes.map(s => s.toJSON()),
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };
    }

    shapeFromJSON(json) {
        const shapeMap = {
            'Rectangle': Rectangle,
            'RoundedRectangle': RoundedRectangle,
            'Circle': Circle,
            'Diamond': Diamond,
            'Parallelogram': Parallelogram,
            'Document': Document,
            'Database': Database,
            'Arrow': Arrow,
            'Line': Line,
            'TextBox': TextBox
        };

        const ShapeClass = shapeMap[json.type] || Rectangle;
        let shape;
        
        if (json.type === 'Arrow' || json.type === 'Line') {
            shape = new ShapeClass(json.x1, json.y1, json.x2, json.y2);
        } else {
            shape = new ShapeClass(json.x, json.y, json.width, json.height);
        }
        
        Object.assign(shape, json);
        // Restore connections for Arrow/Line
        if ((json.type === 'Arrow' || json.type === 'Line') && (json.startConnection || json.endConnection)) {
            shape.startConnection = json.startConnection;
            shape.endConnection = json.endConnection;
            shape.updateConnections(this.shapes);
        }
        return shape;
    }

    editShapeText(shape) {
        window.app.showTextModal(shape);
    }

    updatePropertiesPanel() {
        window.app.updatePropertiesPanel(this.selectedShape);
    }

    exportAsPNG() {
        const link = document.createElement('a');
        link.download = 'flowchart.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    exportAsJPG() {
        const link = document.createElement('a');
        link.download = 'flowchart.jpg';
        link.href = this.canvas.toDataURL('image/jpeg');
        link.click();
    }

    exportAsJSON() {
        const json = JSON.stringify(this.toJSON(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'flowchart.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    loadFromJSON(json) {
        const data = JSON.parse(json);
        this.shapes = data.shapes.map(s => this.shapeFromJSON(s));
        this.zoom = data.zoom || 1;
        this.panX = data.panX || 0;
        this.panY = data.panY || 0;
        this.selectedShape = null;
        this.saveState();
        this.render();
        this.updateZoomDisplay();
        this.updatePropertiesPanel();
    }
}
