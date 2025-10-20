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
        this.inlineEditor = null; // Inline text editor element
        this.editingShape = null; // Shape currently being edited
        
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
            // Ctrl+Click on connector to add waypoint
            if (e.ctrlKey || e.metaKey) {
                const clickedShape = this.getShapeAtPoint(pos.x, pos.y);
                if (clickedShape && (clickedShape instanceof Arrow || clickedShape instanceof Line)) {
                    clickedShape.addWaypointAt(pos.x, pos.y);
                    this.selectShape(clickedShape);
                    this.saveState();
                    this.render();
                    return;
                }
            }
            // Check if clicking on a connection point to start drawing connector
            const connectionPointSnap = this.findNearestConnectionPoint(pos.x, pos.y, null);
            if (connectionPointSnap && this.isNearConnectionPoint(pos.x, pos.y, connectionPointSnap.point)) {
                // Auto-activate arrow connector tool
                this.currentTool = 'draw';
                this.currentShapeType = 'arrow';
                this.canvas.style.cursor = 'crosshair';
                
                // Start drawing arrow from this connection point
                this.dragStartX = connectionPointSnap.point.x;
                this.dragStartY = connectionPointSnap.point.y;
                this.isDragging = true;
                this.hoveredShape = connectionPointSnap.shape;
                
                this.drawingShape = new Arrow(
                    connectionPointSnap.point.x,
                    connectionPointSnap.point.y,
                    connectionPointSnap.point.x,
                    connectionPointSnap.point.y
                );
                
                this.drawingShape.startConnection = {
                    shapeId: connectionPointSnap.shape.id,
                    position: connectionPointSnap.point.position
                };
                
                this.render();
                return;
            }
            
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
                // Check if hovering over a connection point
                const connectionPointSnap = this.findNearestConnectionPoint(pos.x, pos.y, null);
                if (connectionPointSnap && this.isNearConnectionPoint(pos.x, pos.y, connectionPointSnap.point)) {
                    this.canvas.style.cursor = 'crosshair';
                    this.hoveredShape = connectionPointSnap.shape;
                    this.render();
                    return;
                } else if (this.hoveredShape) {
                    this.hoveredShape = null;
                    this.render();
                }
                
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
                let newShapeCreated = null;
                
                // Set end connection if snapped
                if (isConnector) {
                    const snapResult = this.findNearestConnectionPoint(this.drawingShape.x2, this.drawingShape.y2, this.drawingShape);
                    if (snapResult) {
                        this.drawingShape.endConnection = {
                            shapeId: snapResult.shape.id,
                            position: snapResult.point.position
                        };
                    } else if (this.drawingShape.startConnection) {
                        // No snap found - create a new shape at the endpoint
                        const sourceShape = this.shapes.find(s => s.id === this.drawingShape.startConnection.shapeId);
                        
                        // Create a rectangle at the endpoint (default shape)
                        const newShape = new Rectangle(
                            this.drawingShape.x2 - 60,  // Center around endpoint
                            this.drawingShape.y2 - 40,
                            120,
                            80
                        );
                        
                        // Copy some styling from source if it exists
                        if (sourceShape && !(sourceShape instanceof Arrow) && !(sourceShape instanceof Line)) {
                            newShape.fillColor = sourceShape.fillColor;
                            newShape.strokeColor = sourceShape.strokeColor;
                        }
                        
                        this.addShape(newShape);
                        newShapeCreated = newShape;
                        
                        // Find closest connection point on new shape
                        const points = newShape.getConnectionPoints();
                        let closestPoint = points[0];
                        let minDist = Infinity;
                        
                        points.forEach(point => {
                            const dist = Math.sqrt(
                                Math.pow(point.x - this.drawingShape.x2, 2) + 
                                Math.pow(point.y - this.drawingShape.y2, 2)
                            );
                            if (dist < minDist) {
                                minDist = dist;
                                closestPoint = point;
                            }
                        });
                        
                        // Connect to the new shape
                        this.drawingShape.x2 = closestPoint.x;
                        this.drawingShape.y2 = closestPoint.y;
                        this.drawingShape.endConnection = {
                            shapeId: newShape.id,
                            position: closestPoint.position
                        };
                        this.drawingShape.updateBoundingBox();
                    }
                }
                this.addShape(this.drawingShape);
                
                // Select the newly created shape, otherwise select the connector
                if (newShapeCreated) {
                    this.selectShape(newShapeCreated);
                } else {
                    this.selectShape(this.drawingShape);
                }
                this.saveState();
                
                // Switch back to select tool automatically
                this.setTool('select');
                if (window.app) {
                    window.app.setActiveTool('selectBtn');
                }
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
        
        // Handle Arrow/Line differently
        if (shape instanceof Arrow || shape instanceof Line) {
            // Check if it's a waypoint handle
            if (handle.type === 'waypoint') {
                // Move the waypoint
                shape.waypoints[handle.index].x = x;
                shape.waypoints[handle.index].y = y;
                shape.updateBoundingBox();
                return;
            }
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
        
        // Draw green highlight on hovered shape when dragging connector
        const isDraggingConnector = this.drawingShape && (this.drawingShape instanceof Arrow || this.drawingShape instanceof Line);
        const isResizingConnector = this.isResizing && this.selectedShape && (this.selectedShape instanceof Arrow || this.selectedShape instanceof Line);
        
        if (this.hoveredShape && (isDraggingConnector || isResizingConnector)) {
            this.drawGreenHighlight(this.hoveredShape);
            this.hoveredShape.drawConnectionPoints(this.ctx);
        } else if (this.hoveredShape && this.currentTool === 'select') {
            // Just show connection points when hovering in select mode
            this.hoveredShape.drawConnectionPoints(this.ctx);
        }
        
        // Draw shape being created with green highlight if snapped
        if (this.drawingShape) {
            if (isDraggingConnector && this.hoveredShape) {
                // Draw connector in green when snapped
                this.drawGreenConnector(this.drawingShape);
            } else {
                this.drawingShape.draw(this.ctx);
            }
        }
        
        // Draw green highlight on connector being resized if snapped
        if (isResizingConnector && this.hoveredShape) {
            this.drawGreenConnector(this.selectedShape);
        }
        
        this.ctx.restore();
    }
    
    // Draw green highlight around shape
    drawGreenHighlight(shape) {
        this.ctx.save();
        this.ctx.strokeStyle = '#10b981'; // Green color
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#10b981';
        this.ctx.shadowBlur = 10;
        
        // Draw outline based on shape type
        if (shape instanceof Circle) {
            const centerX = shape.x + shape.width / 2;
            const centerY = shape.y + shape.height / 2;
            const radius = Math.min(shape.width, shape.height) / 2;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (shape instanceof Diamond) {
            const centerX = shape.x + shape.width / 2;
            const centerY = shape.y + shape.height / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, shape.y - 3);
            this.ctx.lineTo(shape.x + shape.width + 3, centerY);
            this.ctx.lineTo(centerX, shape.y + shape.height + 3);
            this.ctx.lineTo(shape.x - 3, centerY);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (shape instanceof RoundedRectangle) {
            const r = Math.min(shape.radius || 15, shape.width / 2, shape.height / 2);
            this.ctx.beginPath();
            this.ctx.moveTo(shape.x + r - 3, shape.y - 3);
            this.ctx.lineTo(shape.x + shape.width - r + 3, shape.y - 3);
            this.ctx.arcTo(shape.x + shape.width + 3, shape.y - 3, shape.x + shape.width + 3, shape.y + r - 3, r);
            this.ctx.lineTo(shape.x + shape.width + 3, shape.y + shape.height - r + 3);
            this.ctx.arcTo(shape.x + shape.width + 3, shape.y + shape.height + 3, shape.x + shape.width - r + 3, shape.y + shape.height + 3, r);
            this.ctx.lineTo(shape.x + r - 3, shape.y + shape.height + 3);
            this.ctx.arcTo(shape.x - 3, shape.y + shape.height + 3, shape.x - 3, shape.y + shape.height - r + 3, r);
            this.ctx.lineTo(shape.x - 3, shape.y + r - 3);
            this.ctx.arcTo(shape.x - 3, shape.y - 3, shape.x + r - 3, shape.y - 3, r);
            this.ctx.closePath();
            this.ctx.stroke();
        } else {
            // Rectangle and other shapes
            this.ctx.strokeRect(shape.x - 3, shape.y - 3, shape.width + 6, shape.height + 6);
        }
        
        this.ctx.restore();
    }
    
    // Draw connector in green
    drawGreenConnector(connector) {
        this.ctx.save();
        this.ctx.strokeStyle = '#10b981'; // Green color
        this.ctx.lineWidth = connector.strokeWidth + 1;
        this.ctx.shadowColor = '#10b981';
        this.ctx.shadowBlur = 8;
        
        if (connector instanceof Arrow) {
            const headLength = 15;
            const angle = Math.atan2(connector.y2 - connector.y1, connector.x2 - connector.x1);
            
            // Draw line
            this.ctx.beginPath();
            this.ctx.moveTo(connector.x1, connector.y1);
            this.ctx.lineTo(connector.x2, connector.y2);
            this.ctx.stroke();
            
            // Draw arrow head
            this.ctx.beginPath();
            this.ctx.moveTo(connector.x2, connector.y2);
            this.ctx.lineTo(
                connector.x2 - headLength * Math.cos(angle - Math.PI / 6),
                connector.y2 - headLength * Math.sin(angle - Math.PI / 6)
            );
            this.ctx.moveTo(connector.x2, connector.y2);
            this.ctx.lineTo(
                connector.x2 - headLength * Math.cos(angle + Math.PI / 6),
                connector.y2 - headLength * Math.sin(angle + Math.PI / 6)
            );
            this.ctx.stroke();
        } else if (connector instanceof Line) {
            this.ctx.beginPath();
            this.ctx.moveTo(connector.x1, connector.y1);
            this.ctx.lineTo(connector.x2, connector.y2);
            this.ctx.stroke();
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
    
    // Check if point is very near to a connection point (tighter threshold for clicking)
    isNearConnectionPoint(x, y, connectionPoint) {
        const clickRadius = 8 / this.zoom; // 8 pixels in canvas space
        const distance = Math.sqrt(
            Math.pow(connectionPoint.x - x, 2) + 
            Math.pow(connectionPoint.y - y, 2)
        );
        return distance < clickRadius;
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
        // Create inline editor
        this.editingShape = shape;
        
        // Remove existing editor if any
        if (this.inlineEditor) {
            this.closeInlineEditor();
        }
        
        // Create editor element
        this.inlineEditor = document.createElement('div');
        this.inlineEditor.contentEditable = 'true';
        this.inlineEditor.className = 'inline-text-editor';
        this.inlineEditor.textContent = shape.text || '';
        
        // Position the editor
        const rect = this.canvas.getBoundingClientRect();
        const editorX = rect.left + (shape.x + shape.width / 2) * this.zoom + this.panX;
        const editorY = rect.top + (shape.y + shape.height / 2) * this.zoom + this.panY;
        
        this.inlineEditor.style.cssText = `
            position: fixed;
            left: ${editorX}px;
            top: ${editorY}px;
            transform: translate(-50%, -50%);
            min-width: ${Math.max(shape.width * this.zoom, 100)}px;
            max-width: ${shape.width * this.zoom * 1.5}px;
            padding: 8px;
            background: white;
            border: 2px solid #667eea;
            border-radius: 4px;
            font-size: ${shape.fontSize * this.zoom}px;
            font-family: ${shape.fontFamily};
            color: ${shape.textColor};
            text-align: center;
            outline: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-wrap: break-word;
        `;
        
        document.body.appendChild(this.inlineEditor);
        
        // Focus and select all text
        this.inlineEditor.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(this.inlineEditor);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Handle clicks outside to close
        const closeOnClickOutside = (e) => {
            if (!this.inlineEditor.contains(e.target)) {
                this.closeInlineEditor();
                document.removeEventListener('mousedown', closeOnClickOutside);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('mousedown', closeOnClickOutside);
        }, 100);
        
        // Handle Enter and Escape keys
        this.inlineEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closeInlineEditor(false); // Don't save
                document.removeEventListener('mousedown', closeOnClickOutside);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.closeInlineEditor();
                document.removeEventListener('mousedown', closeOnClickOutside);
            }
        });
        
        // Handle input to allow Shift+Enter for new lines
        this.inlineEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.shiftKey) {
                // Allow default behavior for Shift+Enter (new line)
            }
        });
    }
    
    closeInlineEditor(save = true) {
        if (!this.inlineEditor) return;
        
        if (save && this.editingShape) {
            const newText = this.inlineEditor.textContent.trim();
            if (this.editingShape.text !== newText) {
                this.editingShape.text = newText;
                this.saveState();
                this.render();
                this.updatePropertiesPanel();
            }
        }
        
        this.inlineEditor.remove();
        this.inlineEditor = null;
        this.editingShape = null;
    }

    updatePropertiesPanel() {
        window.app.updatePropertiesPanel(this.selectedShape);
    }

    // Get bounds of all shapes
    getContentBounds() {
        if (this.shapes.length === 0) {
            return { minX: 0, minY: 0, maxX: this.canvas.width, maxY: this.canvas.height };
        }
        
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        this.shapes.forEach(shape => {
            if (shape instanceof Arrow || shape instanceof Line) {
                // For connectors, use x1, y1, x2, y2
                minX = Math.min(minX, shape.x1, shape.x2);
                minY = Math.min(minY, shape.y1, shape.y2);
                maxX = Math.max(maxX, shape.x1, shape.x2);
                maxY = Math.max(maxY, shape.y1, shape.y2);
            } else {
                minX = Math.min(minX, shape.x);
                minY = Math.min(minY, shape.y);
                maxX = Math.max(maxX, shape.x + shape.width);
                maxY = Math.max(maxY, shape.y + shape.height);
            }
        });
        
        return { minX, minY, maxX, maxY };
    }
    
    // Export with trimmed bounds
    exportTrimmed(format = 'png') {
        const padding = 20; // Add some padding around content
        const bounds = this.getContentBounds();
        
        // Calculate dimensions
        const contentWidth = bounds.maxX - bounds.minX + (padding * 2);
        const contentHeight = bounds.maxY - bounds.minY + (padding * 2);
        
        // Create temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = contentWidth;
        tempCanvas.height = contentHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Fill white background for JPG
        if (format === 'jpeg') {
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, contentWidth, contentHeight);
        }
        
        // Translate to account for offset and padding
        tempCtx.translate(-bounds.minX + padding, -bounds.minY + padding);
        
        // Draw all shapes
        this.shapes.forEach(shape => {
            shape.selected = false; // Don't show selection handles in export
            shape.draw(tempCtx);
        });
        
        // Restore selection state
        if (this.selectedShape) {
            this.selectedShape.selected = true;
        }
        
        return tempCanvas;
    }

    exportAsPNG() {
        const tempCanvas = this.exportTrimmed('png');
        const link = document.createElement('a');
        link.download = 'flowchart.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }

    exportAsJPG() {
        const tempCanvas = this.exportTrimmed('jpeg');
        const link = document.createElement('a');
        link.download = 'flowchart.jpg';
        link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
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
