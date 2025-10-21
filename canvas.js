// Canvas Controller

class FlowchartCanvas {
    constructor(canvasId) {
                this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.shapes = [];
        this.selectedShape = null; // Keep for backward compatibility
        this.selectedShapes = []; // Array of selected shapes for multi-select
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
        this.hoveredConnector = null; // Track hovered connector for endpoint detection
        this.hoveredShapeForHighlight = null; // Track any hovered shape for green highlighting
        this.inlineEditor = null; // Inline text editor element
        this.editingShape = null; // Shape currently being edited
        
        // Grid and Snapping
        this.gridEnabled = true; // Show grid
        this.gridSize = 20; // Grid cell size in pixels
        this.snapToGrid = true; // Enable grid snapping
        this.snapThreshold = 10; // Snap threshold in pixels
        
        // Guidelines
        this.guidelinesEnabled = true; // Show alignment guidelines
        this.guidelines = []; // Active guidelines: { type: 'vertical'|'horizontal', position: number }
        
        // Box Selection
        this.isBoxSelecting = false; // Track if doing box select
        this.boxSelectStart = { x: 0, y: 0 }; // Box select start point
        this.boxSelectEnd = { x: 0, y: 0 }; // Box select end point
        
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
        
        // Clear hovered highlights on mouse down
        this.hoveredConnector = null;
        this.hoveredShapeForHighlight = null;
        
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
            
                        // Check if clicking near a connector endpoint (even if not selected)
            const endpointClick = this.checkConnectorEndpointClick(pos.x, pos.y);
            if (endpointClick) {
                this.selectShape(endpointClick.connector);
                this.isResizing = true;
                this.resizeHandle = endpointClick.handleIndex;
                this.dragStartX = pos.x;
                this.dragStartY = pos.y;
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
                // Shift+Click for multi-select
                if (e.shiftKey) {
                    this.toggleShapeSelection(clickedShape);
                    // Don't start dragging when Shift+Clicking
                } else {
                    // Regular click - check if clicking on already selected shape
                    if (!clickedShape.selected) {
                        this.selectShape(clickedShape);
                    }
                    
                    // Start dragging if shape is selected
                    if (clickedShape.selected) {
                        this.isDragging = true;
                        this.dragStartX = pos.x - clickedShape.x;
                        this.dragStartY = pos.y - clickedShape.y;
                        
                        // Store initial positions for all selected shapes
                        this.selectedShapes.forEach(shape => {
                            shape._dragOffsetX = pos.x - shape.x;
                            shape._dragOffsetY = pos.y - shape.y;
                        });
                    }
                }
            } else {
                // Clicked on empty space - start box select
                // Clear selection only if not holding Shift
                if (!e.shiftKey) {
                    this.selectedShapes.forEach(s => s.selected = false);
                    this.selectedShapes = [];
                    this.selectedShape = null;
                }
                
                // Start box selection
                this.isBoxSelecting = true;
                this.boxSelectStart = { x: pos.x, y: pos.y };
                this.boxSelectEnd = { x: pos.x, y: pos.y };
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
            if (this.isBoxSelecting) {
                // Update box selection rectangle
                this.boxSelectEnd = { x: pos.x, y: pos.y };
                this.render();
            } else if (this.isResizing && this.selectedShape) {
                this.resizeShape(this.selectedShape, this.resizeHandle, pos.x, pos.y);
                this.render();
            } else if (this.isDragging && this.selectedShapes.length > 0) {
                // Move all selected shapes together
                const primaryShape = this.selectedShape || this.selectedShapes[0];
                let newX = pos.x - this.dragStartX;
                let newY = pos.y - this.dragStartY;
                
                const deltaX = newX - primaryShape.x;
                const deltaY = newY - primaryShape.y;
                
                // Apply grid snapping if enabled (but not for connectors)
                if (this.snapToGrid && !(primaryShape instanceof Arrow || primaryShape instanceof Line)) {
                    const snapped = this.snapToGridPoint(newX, newY);
                    newX = snapped.x;
                    newY = snapped.y;
                }
                
                // Move primary shape
                primaryShape.x = newX;
                primaryShape.y = newY;
                
                                // Update child shapes if this is a group (BEFORE snapping)
                if (primaryShape instanceof Group) {
                    primaryShape.updateChildPositions();
                }
                
                // Apply guideline snapping if enabled (but not for connectors)
                if (!(primaryShape instanceof Arrow || primaryShape instanceof Line)) {
                    this.applyGuidelineSnapping(primaryShape);
                } else {
                    this.guidelines = []; // Clear guidelines for connectors
                }
                
                // Calculate actual movement after snapping
                const actualDeltaX = primaryShape.x - (newX - deltaX);
                const actualDeltaY = primaryShape.y - (newY - deltaY);
                
                // Move other selected shapes by the same delta
                this.selectedShapes.forEach(shape => {
                    if (shape !== primaryShape) {
                        shape.x = pos.x - shape._dragOffsetX + actualDeltaX;
                        shape.y = pos.y - shape._dragOffsetY + actualDeltaY;
                        
                        // Update child shapes if this is a group
                        if (shape instanceof Group) {
                            shape.updateChildPositions();
                        }
                        
                        // Update endpoints for Arrow/Line shapes
                        if (shape.updateEndpoints) {
                            shape.updateEndpoints();
                        }
                    }
                });
                
                // Update endpoints for primary shape
                if (primaryShape.updateEndpoints) {
                    primaryShape.updateEndpoints();
                }
                
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
                
                // Check if hovering near connector endpoint
                const endpointHover = this.checkConnectorEndpointClick(pos.x, pos.y);
                if (endpointHover) {
                    this.canvas.style.cursor = 'move';
                    // Update hoveredConnector and re-render to show highlight
                    const needsUpdate = this.hoveredConnector !== endpointHover.connector || 
                                       this.hoveredShapeForHighlight !== null;
                    if (needsUpdate) {
                        this.hoveredConnector = endpointHover.connector;
                        this.hoveredShapeForHighlight = null; // Clear shape highlight
                        this.render();
                    }
                    return;
                }
                
                // Update cursor based on what's under mouse and add hover highlighting
                const shape = this.getShapeAtPoint(pos.x, pos.y);
                if (shape) {
                    // Update hover highlight for shape
                    const needsUpdate = this.hoveredShapeForHighlight !== shape || 
                                       this.hoveredConnector !== null;
                    if (needsUpdate) {
                        this.hoveredShapeForHighlight = shape;
                        this.hoveredConnector = null; // Clear connector highlight
                        this.render();
                    }
                    
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
                    // Clear hover highlights if no shape under mouse
                    if (this.hoveredShapeForHighlight || this.hoveredConnector) {
                        this.hoveredShapeForHighlight = null;
                        this.hoveredConnector = null;
                        this.render();
                    }
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
                let width = pos.x - this.dragStartX;
                let height = pos.y - this.dragStartY;
                
                // Apply grid snapping to drawing shapes
                if (this.snapToGrid) {
                    const endX = width < 0 ? pos.x : this.dragStartX + Math.abs(width);
                    const endY = height < 0 ? pos.y : this.dragStartY + Math.abs(height);
                    const snapped = this.snapToGridPoint(endX, endY);
                    
                    if (width < 0) {
                        this.drawingShape.x = snapped.x;
                        this.drawingShape.width = this.dragStartX - snapped.x;
                    } else {
                        this.drawingShape.x = this.dragStartX;
                        this.drawingShape.width = snapped.x - this.dragStartX;
                    }
                    
                    if (height < 0) {
                        this.drawingShape.y = snapped.y;
                        this.drawingShape.height = this.dragStartY - snapped.y;
                    } else {
                        this.drawingShape.y = this.dragStartY;
                        this.drawingShape.height = snapped.y - this.dragStartY;
                    }
                } else {
                    this.drawingShape.width = Math.abs(width);
                    this.drawingShape.height = Math.abs(height);
                    this.drawingShape.x = width < 0 ? pos.x : this.dragStartX;
                    this.drawingShape.y = height < 0 ? pos.y : this.dragStartY;
                }
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
                    // Automatically enter text mode for new endpoint shape
                    this.editShapeText(newShapeCreated);
                } else {
                    this.selectShape(this.drawingShape);
                    // Automatically enter text mode if it's not a connector
                    if (!(this.drawingShape instanceof Arrow || this.drawingShape instanceof Line)) {
                        this.editShapeText(this.drawingShape);
                    }
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

                // Handle box selection completion
        if (this.isBoxSelecting) {
            this.completeBoxSelection(e.shiftKey);
            this.isBoxSelecting = false;
        }
        
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = -1;
        this.hoveredConnector = null; // Clear on mouse up
        this.hoveredShapeForHighlight = null;
        this.guidelines = []; // Clear guidelines on mouse up
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
        // Clear all selections
        this.selectedShapes.forEach(s => s.selected = false);
        this.selectedShapes = [];
        
        if (shape) {
            shape.selected = true;
            this.selectedShapes.push(shape);
        }
        
        this.selectedShape = shape; // Keep for backward compatibility
        this.render();
        this.updatePropertiesPanel();
    }
    
    // Toggle selection of a shape (for Shift+Click)
    toggleShapeSelection(shape) {
        if (shape.selected) {
            // Deselect shape
            shape.selected = false;
            const index = this.selectedShapes.indexOf(shape);
            if (index > -1) {
                this.selectedShapes.splice(index, 1);
            }
        } else {
            // Add to selection
            shape.selected = true;
            this.selectedShapes.push(shape);
        }
        
        // Update selectedShape to last selected for backward compatibility
        this.selectedShape = this.selectedShapes.length > 0 ? this.selectedShapes[this.selectedShapes.length - 1] : null;
        this.render();
        this.updatePropertiesPanel();
    }
    
    // Select all shapes
    selectAll() {
        this.selectedShapes = [...this.shapes];
        this.shapes.forEach(shape => shape.selected = true);
        this.selectedShape = this.selectedShapes.length > 0 ? this.selectedShapes[0] : null;
        this.render();
        this.updatePropertiesPanel();
    }
    
    // Group selected shapes
    groupShapes() {
        if (this.selectedShapes.length < 2) {
            alert('Select at least 2 shapes to create a group');
            return;
        }
        
        // Create group from selected shapes
        const group = new Group([...this.selectedShapes]);
        
        // Remove individual shapes from canvas
        this.selectedShapes.forEach(shape => {
            const index = this.shapes.indexOf(shape);
            if (index > -1) {
                this.shapes.splice(index, 1);
            }
        });
        
                // Add group to canvas
        this.shapes.push(group);
        
        // Update all connector connections after grouping
        this.updateAllConnections();
        
        // Select the group
        this.selectShape(group);
        this.saveState();
        this.render();
    }
    
    // Ungroup selected group
    ungroupShapes() {
        if (!this.selectedShape || !(this.selectedShape instanceof Group)) {
            alert('Select a group to ungroup');
            return;
        }
        
        const group = this.selectedShape;
        
        // Update child positions one final time
        group.updateChildPositions();
        
        // Get all child shapes
        const childShapes = [...group.shapes];
        
        // Remove group from canvas
        const index = this.shapes.indexOf(group);
        if (index > -1) {
            this.shapes.splice(index, 1);
        }
        
        // Add child shapes back to canvas
        childShapes.forEach(shape => {
            // Clear group offsets
            delete shape._groupOffsetX;
            delete shape._groupOffsetY;
            this.shapes.push(shape);
        });
        
                // Select the ungrouped shapes
        this.selectedShapes = childShapes;
        childShapes.forEach(shape => shape.selected = true);
        this.selectedShape = childShapes[0];
        
        // Update all connector connections after ungrouping
        this.updateAllConnections();
        
        this.saveState();
        this.render();
        this.updatePropertiesPanel();
    }
    
    // Complete box selection
    completeBoxSelection(addToSelection = false) {
        const minX = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const maxX = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
        const minY = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const maxY = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);
        
        // Check if box has meaningful size (> 5 pixels)
        const boxWidth = maxX - minX;
        const boxHeight = maxY - minY;
        if (boxWidth < 5 && boxHeight < 5) {
            return; // Too small, ignore
        }
        
        // Clear existing selection if not adding
        if (!addToSelection) {
            this.selectedShapes.forEach(s => s.selected = false);
            this.selectedShapes = [];
        }
        
        // Find all shapes within the box
        this.shapes.forEach(shape => {
            if (this.isShapeInBox(shape, minX, minY, maxX, maxY)) {
                if (!shape.selected) {
                    shape.selected = true;
                    this.selectedShapes.push(shape);
                }
            }
        });
        
        // Update selectedShape for backward compatibility
        this.selectedShape = this.selectedShapes.length > 0 ? this.selectedShapes[this.selectedShapes.length - 1] : null;
        this.updatePropertiesPanel();
    }
    
    // Check if shape intersects with selection box
    isShapeInBox(shape, minX, minY, maxX, maxY) {
        if (shape instanceof Arrow || shape instanceof Line) {
            // For connectors, check if any point is in the box
            const points = [{ x: shape.x1, y: shape.y1 }, ...shape.waypoints, { x: shape.x2, y: shape.y2 }];
            return points.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
        } else {
            // For regular shapes, check if shape intersects with box
            return !(shape.x + shape.width < minX || 
                    shape.x > maxX || 
                    shape.y + shape.height < minY || 
                    shape.y > maxY);
        }
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
            
            // For endpoint handles, always try to snap to connection points
            const isStartHandle = handleIndex === 0;
            const isEndHandle = handleIndex === 1;
            
            if (isStartHandle || isEndHandle) {
                // Snap to connection points (allow reconnecting to any shape)
                const snapResult = this.findNearestConnectionPoint(x, y, shape);
                
                if (snapResult) {
                    // Snap to the connection point
                    x = snapResult.point.x;
                    y = snapResult.point.y;
                    this.hoveredShape = snapResult.shape;
                    
                    // Update or create connection
                    if (isStartHandle) {
                        shape.startConnection = {
                            shapeId: snapResult.shape.id,
                            position: snapResult.point.position
                        };
                    } else if (isEndHandle) {
                        shape.endConnection = {
                            shapeId: snapResult.shape.id,
                            position: snapResult.point.position
                        };
                    }
                } else {
                    // No snap - allow free positioning and clear connection
                    this.hoveredShape = null;
                    
                    if (isStartHandle) {
                        shape.startConnection = null;
                    } else if (isEndHandle) {
                        shape.endConnection = null;
                    }
                }
                
                // Update endpoint position
                if (isStartHandle) {
                    shape.x1 = x;
                    shape.y1 = y;
                } else if (isEndHandle) {
                    shape.x2 = x;
                    shape.y2 = y;
                }
                
                // Update bounding box
                shape.updateBoundingBox();
            }
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
        
        // Draw grid if enabled
        if (this.gridEnabled) {
            this.drawGrid();
        }
        
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
        
        // Draw green highlight on hovered connector (endpoint detection)
        if (this.hoveredConnector && !this.isDragging && !this.isResizing) {
            this.drawGreenConnector(this.hoveredConnector);
        }
        
                // Draw green highlight on hovered shape
        if (this.hoveredShapeForHighlight && !this.isDragging && !this.isResizing) {
            // Don't highlight if it's already selected (has purple handles)
            if (!this.hoveredShapeForHighlight.selected) {
                if (this.hoveredShapeForHighlight instanceof Arrow || this.hoveredShapeForHighlight instanceof Line) {
                    this.drawGreenConnector(this.hoveredShapeForHighlight);
                } else {
                    this.drawGreenHighlight(this.hoveredShapeForHighlight);
                }
            }
        }
        
        // Draw guidelines if enabled and active
        if (this.guidelinesEnabled && this.guidelines.length > 0) {
            this.drawGuidelines();
        }
        
        // Draw box selection rectangle
        if (this.isBoxSelecting) {
            this.drawBoxSelection();
        }
        
        this.ctx.restore();
    }
    
        // Draw grid
    drawGrid() {
        const startX = Math.floor(-this.panX / this.zoom / this.gridSize) * this.gridSize;
        const startY = Math.floor(-this.panY / this.zoom / this.gridSize) * this.gridSize;
        const endX = startX + (this.canvas.width / this.zoom) + this.gridSize;
        const endY = startY + (this.canvas.height / this.zoom) + this.gridSize;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.lineWidth = 1 / this.zoom; // Keep line width constant when zooming
        
        // Draw vertical lines
        for (let x = startX; x <= endX; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = startY; y <= endY; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    // Draw guidelines
    drawGuidelines() {
        this.ctx.save();
        this.ctx.strokeStyle = '#ff00ff'; // Magenta color for guidelines
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
        
        const startX = -this.panX / this.zoom;
        const startY = -this.panY / this.zoom;
        const endX = startX + (this.canvas.width / this.zoom);
        const endY = startY + (this.canvas.height / this.zoom);
        
        this.guidelines.forEach(guide => {
            this.ctx.beginPath();
            if (guide.type === 'vertical') {
                this.ctx.moveTo(guide.position, startY);
                this.ctx.lineTo(guide.position, endY);
            } else {
                this.ctx.moveTo(startX, guide.position);
                this.ctx.lineTo(endX, guide.position);
            }
            this.ctx.stroke();
        });
        
        this.ctx.restore();
    }
    
    // Snap point to grid
    snapToGridPoint(x, y) {
        if (!this.snapToGrid) return { x, y };
        
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }
    
    // Find alignment guidelines for a shape
    findGuidelines(shape) {
        if (!this.guidelinesEnabled || !shape) return [];
        
        const guidelines = [];
        const threshold = this.snapThreshold / this.zoom;
        
        // Get shape bounds
        const shapeLeft = shape.x;
        const shapeRight = shape.x + shape.width;
        const shapeTop = shape.y;
        const shapeBottom = shape.y + shape.height;
        const shapeCenterX = shape.x + shape.width / 2;
        const shapeCenterY = shape.y + shape.height / 2;
        
        // Check against all other shapes
        this.shapes.forEach(other => {
            if (other === shape || other instanceof Arrow || other instanceof Line) return;
            
            const otherLeft = other.x;
            const otherRight = other.x + other.width;
            const otherTop = other.y;
            const otherBottom = other.y + other.height;
            const otherCenterX = other.x + other.width / 2;
            const otherCenterY = other.y + other.height / 2;
            
            // Check vertical alignments
            if (Math.abs(shapeLeft - otherLeft) < threshold) {
                guidelines.push({ type: 'vertical', position: otherLeft, snapValue: otherLeft });
            }
            if (Math.abs(shapeRight - otherRight) < threshold) {
                guidelines.push({ type: 'vertical', position: otherRight, snapValue: otherRight });
            }
            if (Math.abs(shapeCenterX - otherCenterX) < threshold) {
                guidelines.push({ type: 'vertical', position: otherCenterX, snapValue: otherCenterX });
            }
            if (Math.abs(shapeLeft - otherRight) < threshold) {
                guidelines.push({ type: 'vertical', position: otherRight, snapValue: otherRight });
            }
            if (Math.abs(shapeRight - otherLeft) < threshold) {
                guidelines.push({ type: 'vertical', position: otherLeft, snapValue: otherLeft });
            }
            
            // Check horizontal alignments
            if (Math.abs(shapeTop - otherTop) < threshold) {
                guidelines.push({ type: 'horizontal', position: otherTop, snapValue: otherTop });
            }
            if (Math.abs(shapeBottom - otherBottom) < threshold) {
                guidelines.push({ type: 'horizontal', position: otherBottom, snapValue: otherBottom });
            }
            if (Math.abs(shapeCenterY - otherCenterY) < threshold) {
                guidelines.push({ type: 'horizontal', position: otherCenterY, snapValue: otherCenterY });
            }
            if (Math.abs(shapeTop - otherBottom) < threshold) {
                guidelines.push({ type: 'horizontal', position: otherBottom, snapValue: otherBottom });
            }
            if (Math.abs(shapeBottom - otherTop) < threshold) {
                guidelines.push({ type: 'horizontal', position: otherTop, snapValue: otherTop });
            }
        });
        
        return guidelines;
    }
    
    // Draw box selection rectangle
    drawBoxSelection() {
        const minX = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const maxX = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
        const minY = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const maxY = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);
        
        this.ctx.save();
        
        // Draw filled rectangle with transparency
        this.ctx.fillStyle = 'rgba(102, 126, 234, 0.1)'; // Light purple
        this.ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        
        // Draw border
        this.ctx.strokeStyle = '#667eea'; // Purple
        this.ctx.lineWidth = 2 / this.zoom; // Constant width at any zoom
        this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
        this.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        
        this.ctx.restore();
    }
    
    // Apply guideline snapping to shape position
    applyGuidelineSnapping(shape) {
        if (!this.guidelinesEnabled || !shape) return;
        
        const guides = this.findGuidelines(shape);
        
        // Apply snapping
        guides.forEach(guide => {
            if (guide.type === 'vertical') {
                const shapeLeft = shape.x;
                const shapeRight = shape.x + shape.width;
                const shapeCenterX = shape.x + shape.width / 2;
                
                if (Math.abs(shapeLeft - guide.snapValue) < this.snapThreshold / this.zoom) {
                    shape.x = guide.snapValue;
                } else if (Math.abs(shapeRight - guide.snapValue) < this.snapThreshold / this.zoom) {
                    shape.x = guide.snapValue - shape.width;
                } else if (Math.abs(shapeCenterX - guide.snapValue) < this.snapThreshold / this.zoom) {
                    shape.x = guide.snapValue - shape.width / 2;
                }
            } else {
                const shapeTop = shape.y;
                const shapeBottom = shape.y + shape.height;
                const shapeCenterY = shape.y + shape.height / 2;
                
                if (Math.abs(shapeTop - guide.snapValue) < this.snapThreshold / this.zoom) {
                    shape.y = guide.snapValue;
                } else if (Math.abs(shapeBottom - guide.snapValue) < this.snapThreshold / this.zoom) {
                    shape.y = guide.snapValue - shape.height;
                } else if (Math.abs(shapeCenterY - guide.snapValue) < this.snapThreshold / this.zoom) {
                    shape.y = guide.snapValue - shape.height / 2;
                }
            }
        });
        
        // Update guidelines for display
        this.guidelines = guides;
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
        this.hoveredConnector = null; // Clear when changing tools
        this.hoveredShapeForHighlight = null;
        
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
    
    // Toggle grid visibility
    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        this.render();
        return this.gridEnabled;
    }
    
    // Toggle grid snapping
    toggleGridSnapping() {
        this.snapToGrid = !this.snapToGrid;
        return this.snapToGrid;
    }
    
    // Toggle guidelines
    toggleGuidelines() {
        this.guidelinesEnabled = !this.guidelinesEnabled;
        if (!this.guidelinesEnabled) {
            this.guidelines = [];
        }
        this.render();
        return this.guidelinesEnabled;
    }
    
    // Set grid size
    setGridSize(size) {
        this.gridSize = Math.max(5, Math.min(100, size));
        this.render();
    }

        // Find nearest connection point within snap distance
    findNearestConnectionPoint(x, y, excludeShape) {
        let nearest = null;
        let minDistance = this.snapDistance / this.zoom; // Adjust for zoom level
        
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
    
        // Check if point is very near to a connection point (tighter threshold for clicking)
    isNearConnectionPoint(x, y, connectionPoint) {
        const clickRadius = 8 / this.zoom; // 8 pixels in canvas space
        const distance = Math.sqrt(
            Math.pow(connectionPoint.x - x, 2) + 
            Math.pow(connectionPoint.y - y, 2)
        );
        return distance < clickRadius;
    }

    // Check if clicking near a connector endpoint (head or tail)
    // Uses 20% of connector length from either end, with minimum radius fallback
    checkConnectorEndpointClick(x, y) {
        const minEndpointRadius = 12 / this.zoom; // Minimum 12 pixels in canvas space
        const percentageThreshold = 0.20; // 20% of connector length
        
        // Check all connectors from top to bottom
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            if (!(shape instanceof Arrow || shape instanceof Line)) continue;
            
            // Calculate connector length
            const connectorLength = Math.sqrt(
                Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2)
            );
            
            // Use 20% of length or minimum radius, whichever is larger
            const effectiveRadius = Math.max(minEndpointRadius, connectorLength * percentageThreshold);
            
            // Check start point (tail) - within 20% of length from start
            const distToStart = Math.sqrt(
                Math.pow(shape.x1 - x, 2) + Math.pow(shape.y1 - y, 2)
            );
            if (distToStart < effectiveRadius) {
                return { connector: shape, endpoint: 'start', handleIndex: 0 };
            }
            
            // Check end point (head) - within 20% of length from end
            const distToEnd = Math.sqrt(
                Math.pow(shape.x2 - x, 2) + Math.pow(shape.y2 - y, 2)
            );
            if (distToEnd < effectiveRadius) {
                return { connector: shape, endpoint: 'end', handleIndex: 1 };
            }
        }
        
        return null;
    }

    // Update all connector connections
    updateAllConnections() {
        this.shapes.forEach(shape => {
            if (shape instanceof Arrow || shape instanceof Line) {
                shape.updateConnections(this.shapes, this.getAllShapesIncludingGrouped());
            }
        });
    }
    
    // Get all shapes including those inside groups
    getAllShapesIncludingGrouped() {
        const allShapes = [];
        
        const collectShapes = (shapes) => {
            shapes.forEach(shape => {
                allShapes.push(shape);
                if (shape instanceof Group) {
                    collectShapes(shape.shapes);
                }
            });
        };
        
        collectShapes(this.shapes);
        return allShapes;
    }

        deleteSelected() {
        if (this.selectedShapes.length > 0) {
            // Delete all selected shapes
            this.selectedShapes.forEach(shape => {
                const index = this.shapes.indexOf(shape);
                if (index > -1) {
                    this.shapes.splice(index, 1);
                }
            });
            this.selectedShapes = [];
            this.selectedShape = null;
            this.saveState();
            this.render();
            this.updatePropertiesPanel();
        }
    }

        clear() {
        if (confirm('Are you sure you want to clear the canvas?')) {
            this.shapes = [];
            this.selectedShape = null;
            this.selectedShapes = [];
            this.saveState();
            this.render();
            this.updatePropertiesPanel();
        }
    }

        duplicateShape(shape) {
        if (this.selectedShapes.length > 1) {
            // Duplicate all selected shapes
            const newShapes = [];
            this.selectedShapes.forEach(s => {
                const json = s.toJSON();
                json.x += 20;
                json.y += 20;
                json.id = Date.now() + Math.random();
                const newShape = this.shapeFromJSON(json);
                this.shapes.push(newShape);
                newShapes.push(newShape);
            });
            
            // Select the duplicated shapes
            this.selectedShapes.forEach(s => s.selected = false);
            this.selectedShapes = newShapes;
            newShapes.forEach(s => s.selected = true);
            this.selectedShape = newShapes[0];
            this.saveState();
            this.render();
        } else if (shape) {
            // Single shape duplication
            const json = shape.toJSON();
            json.x += 20;
            json.y += 20;
            json.id = Date.now() + Math.random();
            const newShape = this.shapeFromJSON(json);
            this.addShape(newShape);
            this.selectShape(newShape);
            this.saveState();
        }
    }

        bringToFront(shape) {
        const shapesToMove = this.selectedShapes.length > 1 ? this.selectedShapes : [shape];
        
        shapesToMove.forEach(s => {
            const index = this.shapes.indexOf(s);
            if (index > -1) {
                this.shapes.splice(index, 1);
            }
        });
        
        // Add all shapes to the end
        shapesToMove.forEach(s => {
            this.shapes.push(s);
        });
        
        this.saveState();
        this.render();
    }

    sendToBack(shape) {
        const shapesToMove = this.selectedShapes.length > 1 ? this.selectedShapes : [shape];
        
        shapesToMove.forEach(s => {
            const index = this.shapes.indexOf(s);
            if (index > -1) {
                this.shapes.splice(index, 1);
            }
        });
        
        // Add all shapes to the beginning (in reverse order to maintain relative order)
        shapesToMove.reverse().forEach(s => {
            this.shapes.unshift(s);
        });
        
        this.saveState();
        this.render();
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
        this.selectedShapes = [];
        this.render();
        this.updatePropertiesPanel();
    }

        toJSON() {
        return {
            shapes: this.shapes.map(s => s.toJSON()),
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY,
            gridEnabled: this.gridEnabled,
            gridSize: this.gridSize,
            snapToGrid: this.snapToGrid,
            guidelinesEnabled: this.guidelinesEnabled
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
            'TextBox': TextBox,
            'Group': Group
        };

        const ShapeClass = shapeMap[json.type] || Rectangle;
        let shape;
        
        if (json.type === 'Group') {
            // Reconstruct group from child shapes
            const childShapes = json.shapes.map(s => this.shapeFromJSON(s));
            shape = new Group(childShapes);
            Object.assign(shape, json);
        } else if (json.type === 'Arrow' || json.type === 'Line') {
            shape = new ShapeClass(json.x1, json.y1, json.x2, json.y2);
            Object.assign(shape, json);
            // Restore connections for Arrow/Line
            if (json.startConnection || json.endConnection) {
                shape.startConnection = json.startConnection;
                shape.endConnection = json.endConnection;
                shape.updateConnections(this.shapes);
            }
        } else {
            shape = new ShapeClass(json.x, json.y, json.width, json.height);
            Object.assign(shape, json);
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
    
    exportAsSVG() {
        const padding = 20;
        const bounds = this.getContentBounds();
        
        // Calculate dimensions
        const contentWidth = bounds.maxX - bounds.minX + (padding * 2);
        const contentHeight = bounds.maxY - bounds.minY + (padding * 2);
        const offsetX = -bounds.minX + padding;
        const offsetY = -bounds.minY + padding;
        
        // Build SVG
        let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        svg += `<svg width="${contentWidth}" height="${contentHeight}" ` +
               `xmlns="http://www.w3.org/2000/svg" ` +
               `xmlns:xlink="http://www.w3.org/1999/xlink">\n`;
        
        // Add white background
        svg += `<rect width="${contentWidth}" height="${contentHeight}" fill="white"/>\n`;
        
        // Create group with offset
        svg += `<g transform="translate(${offsetX},${offsetY})">\n`;
        
        // Add each shape
        this.shapes.forEach(shape => {
            svg += shape.toSVG();
        });
        
        svg += `</g>\n`;
        svg += `</svg>`;
        
        // Download SVG
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'flowchart.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    exportAsPDF() {
        // Check if jsPDF is available
        if (typeof window.jspdf === 'undefined') {
            alert('PDF export library not loaded. Please refresh the page.');
            return;
        }
        
        const padding = 20;
        const bounds = this.getContentBounds();
        
        // Calculate dimensions in pixels
        const contentWidth = bounds.maxX - bounds.minX + (padding * 2);
        const contentHeight = bounds.maxY - bounds.minY + (padding * 2);
        
        // Create temporary canvas for export
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = contentWidth;
        tempCanvas.height = contentHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Fill white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, contentWidth, contentHeight);
        
        // Translate to account for offset and padding
        tempCtx.translate(-bounds.minX + padding, -bounds.minY + padding);
        
        // Draw all shapes
        this.shapes.forEach(shape => {
            const wasSelected = shape.selected;
            shape.selected = false; // Don't show selection handles
            shape.draw(tempCtx);
            shape.selected = wasSelected; // Restore selection state
        });
        
        // Convert to image data
        const imgData = tempCanvas.toDataURL('image/png');
        
        // Calculate PDF dimensions (A4 or custom)
        const pxToMm = 0.264583; // Convert pixels to mm (96 DPI)
        const pdfWidth = contentWidth * pxToMm;
        const pdfHeight = contentHeight * pxToMm;
        
        // Determine orientation
        const orientation = pdfWidth > pdfHeight ? 'landscape' : 'portrait';
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Download PDF
        pdf.save('flowchart.pdf');
    }

        loadFromJSON(json) {
        const data = JSON.parse(json);
        this.shapes = data.shapes.map(s => this.shapeFromJSON(s));
        this.zoom = data.zoom || 1;
        this.panX = data.panX || 0;
        this.panY = data.panY || 0;
        this.gridEnabled = data.gridEnabled !== undefined ? data.gridEnabled : true;
        this.gridSize = data.gridSize || 20;
        this.snapToGrid = data.snapToGrid !== undefined ? data.snapToGrid : true;
        this.guidelinesEnabled = data.guidelinesEnabled !== undefined ? data.guidelinesEnabled : true;
        this.selectedShape = null;
        this.saveState();
        this.render();
        this.updateZoomDisplay();
        this.updatePropertiesPanel();
    }

    // Alignment functions
    alignShapes(alignment) {
        if (this.selectedShapes.length < 2) return;

        // Filter out connectors from alignment operations
        const alignableShapes = this.selectedShapes.filter(
            shape => !(shape instanceof Arrow || shape instanceof Line)
        );

        if (alignableShapes.length < 2) return;

        // Get bounds of all selected shapes
        const bounds = this.getSelectionBounds(alignableShapes);

        switch (alignment) {
            case 'left':
                alignableShapes.forEach(shape => {
                    shape.x = bounds.minX;
                    if (shape instanceof Group) shape.updateChildPositions();
                });
                break;

            case 'center':
                const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
                alignableShapes.forEach(shape => {
                    shape.x = centerX - shape.width / 2;
                    if (shape instanceof Group) shape.updateChildPositions();
                });
                break;

            case 'right':
                alignableShapes.forEach(shape => {
                    shape.x = bounds.maxX - shape.width;
                    if (shape instanceof Group) shape.updateChildPositions();
                });
                break;

            case 'top':
                alignableShapes.forEach(shape => {
                    shape.y = bounds.minY;
                    if (shape instanceof Group) shape.updateChildPositions();
                });
                break;

            case 'middle':
                const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
                alignableShapes.forEach(shape => {
                    shape.y = centerY - shape.height / 2;
                    if (shape instanceof Group) shape.updateChildPositions();
                });
                break;

            case 'bottom':
                alignableShapes.forEach(shape => {
                    shape.y = bounds.maxY - shape.height;
                    if (shape instanceof Group) shape.updateChildPositions();
                });
                break;

            case 'distribute-horizontal':
                if (alignableShapes.length < 3) return;
                // Sort shapes by x position
                const sortedX = [...alignableShapes].sort((a, b) => a.x - b.x);
                const totalWidthSpace = bounds.maxX - bounds.minX;
                const spacing = totalWidthSpace / (sortedX.length - 1);
                // Keep first and last shapes in place
                for (let i = 1; i < sortedX.length - 1; i++) {
                    sortedX[i].x = bounds.minX + spacing * i;
                    if (sortedX[i] instanceof Group) sortedX[i].updateChildPositions();
                }
                break;

            case 'distribute-vertical':
                if (alignableShapes.length < 3) return;
                // Sort shapes by y position
                const sortedY = [...alignableShapes].sort((a, b) => a.y - b.y);
                const totalHeightSpace = bounds.maxY - bounds.minY;
                const spacingY = totalHeightSpace / (sortedY.length - 1);
                // Keep first and last shapes in place
                for (let i = 1; i < sortedY.length - 1; i++) {
                    sortedY[i].y = bounds.minY + spacingY * i;
                    if (sortedY[i] instanceof Group) sortedY[i].updateChildPositions();
                }
                break;
        }

        // Update all connector connections
        this.updateAllConnections();
        this.saveState();
        this.render();
    }

    // Helper function to get bounds of selected shapes
    getSelectionBounds(shapes = this.selectedShapes) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        shapes.forEach(shape => {
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y);
            maxX = Math.max(maxX, shape.x + shape.width);
            maxY = Math.max(maxY, shape.y + shape.height);
        });

        return { minX, minY, maxX, maxY };
    }
}
