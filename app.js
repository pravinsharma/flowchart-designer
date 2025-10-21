// Main Application

class FlowchartApp {
    constructor() {
        this.canvas = new FlowchartCanvas('flowchartCanvas');
        this.init();
        window.app = this; // Make accessible globally
    }

    init() {
        this.setupTheme();
        this.setupToolbar();
        this.setupPalette();
        this.setupModals();
        this.setupContextMenu();
        this.setupKeyboardShortcuts();
        this.setupPropertiesPanel();
        
        // Save initial state
        this.canvas.saveState();
    }

    setupToolbar() {
        // Tool buttons
        document.getElementById('selectBtn').addEventListener('click', () => {
            this.setActiveTool('selectBtn');
            this.canvas.setTool('select');
        });

        document.getElementById('panBtn').addEventListener('click', () => {
            this.setActiveTool('panBtn');
            this.canvas.setTool('pan');
        });

        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.canvas.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.canvas.zoomOut();
        });

        document.getElementById('zoomResetBtn').addEventListener('click', () => {
            this.canvas.resetZoom();
        });

        // Undo/Redo
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.canvas.undo();
        });

        document.getElementById('redoBtn').addEventListener('click', () => {
            this.canvas.redo();
        });

        // Grid and Guidelines
        document.getElementById('gridBtn').addEventListener('click', () => {
            const enabled = this.canvas.toggleGrid();
            this.toggleButtonState('gridBtn', enabled);
        });

        document.getElementById('snapBtn').addEventListener('click', () => {
            const enabled = this.canvas.toggleGridSnapping();
            this.toggleButtonState('snapBtn', enabled);
        });

        document.getElementById('guidelinesBtn').addEventListener('click', () => {
            const enabled = this.canvas.toggleGuidelines();
            this.toggleButtonState('guidelinesBtn', enabled);
        });

        // Grouping
        document.getElementById('groupBtn').addEventListener('click', () => {
            this.canvas.groupShapes();
        });

        document.getElementById('ungroupBtn').addEventListener('click', () => {
            this.canvas.ungroupShapes();
        });

        // Alignment buttons
        document.getElementById('alignLeftBtn').addEventListener('click', () => {
            this.canvas.alignShapes('left');
        });

        document.getElementById('alignCenterBtn').addEventListener('click', () => {
            this.canvas.alignShapes('center');
        });

        document.getElementById('alignRightBtn').addEventListener('click', () => {
            this.canvas.alignShapes('right');
        });

        document.getElementById('alignTopBtn').addEventListener('click', () => {
            this.canvas.alignShapes('top');
        });

        document.getElementById('alignMiddleBtn').addEventListener('click', () => {
            this.canvas.alignShapes('middle');
        });

        document.getElementById('alignBottomBtn').addEventListener('click', () => {
            this.canvas.alignShapes('bottom');
        });

        document.getElementById('distributeHBtn').addEventListener('click', () => {
            this.canvas.alignShapes('distribute-horizontal');
        });

        document.getElementById('distributeVBtn').addEventListener('click', () => {
            this.canvas.alignShapes('distribute-vertical');
        });

        // Delete and Clear
        document.getElementById('deleteBtn').addEventListener('click', () => {
            this.canvas.deleteSelected();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.canvas.clear();
        });

        // Export, Save, Load
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.showExportModal();
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.canvas.exportAsJSON();
        });

        document.getElementById('loadBtn').addEventListener('click', () => {
            document.getElementById('loadFileInput').click();
        });

        document.getElementById('loadFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        this.canvas.loadFromJSON(event.target.result);
                        this.showNotification('Flowchart loaded successfully!');
                    } catch (error) {
                        alert('Error loading file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    setupPalette() {
        const shapeItems = document.querySelectorAll('.shape-item');
        shapeItems.forEach(item => {
            item.addEventListener('click', () => {
                const shapeType = item.getAttribute('data-shape');
                this.canvas.setShapeType(shapeType);
                this.setActiveTool('selectBtn'); // Visual feedback
            });
        });
    }

    setupModals() {
        // Text Modal
        const textModal = document.getElementById('textModal');
        const textOkBtn = document.getElementById('textOkBtn');
        const textCancelBtn = document.getElementById('textCancelBtn');
        
        textOkBtn.addEventListener('click', () => {
            this.applyTextToShape();
            this.closeModal(textModal);
        });

        textCancelBtn.addEventListener('click', () => {
            this.closeModal(textModal);
        });

        // Export Modal
        const exportModal = document.getElementById('exportModal');
        
        document.getElementById('exportPNG').addEventListener('click', () => {
            this.canvas.exportAsPNG();
            this.closeModal(exportModal);
            this.showNotification('Exported as PNG!');
        });

        document.getElementById('exportJPG').addEventListener('click', () => {
            this.canvas.exportAsJPG();
            this.closeModal(exportModal);
            this.showNotification('Exported as JPG!');
        });

        document.getElementById('exportSVG').addEventListener('click', () => {
            this.canvas.exportAsSVG();
            this.closeModal(exportModal);
            this.showNotification('Exported as SVG!');
        });

        document.getElementById('exportPDF').addEventListener('click', () => {
            this.canvas.exportAsPDF();
            this.closeModal(exportModal);
            this.showNotification('Exported as PDF!');
        });

        document.getElementById('exportJSON').addEventListener('click', () => {
            this.canvas.exportAsJSON();
            this.closeModal(exportModal);
            this.showNotification('Exported as JSON!');
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal(btn.closest('.modal'));
            });
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        
        this.canvas.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const pos = this.canvas.getMousePos(e);
            const shape = this.canvas.getShapeAtPoint(pos.x, pos.y);
            
            if (shape) {
                // Only select the shape if it's not already part of the current selection
                if (!shape.selected) {
                    this.canvas.selectShape(shape);
                }
                contextMenu.style.left = e.clientX + 'px';
                contextMenu.style.top = e.clientY + 'px';
                contextMenu.classList.add('active');
            }
        });

        document.addEventListener('click', () => {
            contextMenu.classList.remove('active');
        });

        document.getElementById('ctxEdit').addEventListener('click', () => {
            if (this.canvas.selectedShape) {
                this.showTextModal(this.canvas.selectedShape);
            }
        });

        document.getElementById('ctxDuplicate').addEventListener('click', () => {
            if (this.canvas.selectedShapes.length > 0) {
                this.canvas.duplicateShape(this.canvas.selectedShape);
            }
        });

        document.getElementById('ctxGroup').addEventListener('click', () => {
            this.canvas.groupShapes();
        });

        document.getElementById('ctxUngroup').addEventListener('click', () => {
            this.canvas.ungroupShapes();
        });

        document.getElementById('ctxBringFront').addEventListener('click', () => {
            if (this.canvas.selectedShapes.length > 0) {
                this.canvas.bringToFront(this.canvas.selectedShape);
            }
        });

        document.getElementById('ctxSendBack').addEventListener('click', () => {
            if (this.canvas.selectedShapes.length > 0) {
                this.canvas.sendToBack(this.canvas.selectedShape);
            }
        });

        document.getElementById('ctxDelete').addEventListener('click', () => {
            this.canvas.deleteSelected();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Delete
            if (e.key === 'Delete' && this.canvas.selectedShape) {
                this.canvas.deleteSelected();
            }
            
            // Undo/Redo and Select All
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.canvas.undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.canvas.redo();
                } else if (e.key === 'a') {
                    e.preventDefault();
                    this.canvas.selectAll();
                }
            }
            
            // Tools
            if (e.key === 'v' || e.key === 'V') {
                document.getElementById('selectBtn').click();
            } else if (e.key === 'h' || e.key === 'H') {
                document.getElementById('panBtn').click();
            }
            
            // Zoom
            if (e.key === '+' || e.key === '=') {
                this.canvas.zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                this.canvas.zoomOut();
            } else if (e.key === '0') {
                this.canvas.resetZoom();
            }
            
            // Grouping shortcuts
            if (e.key === 'g' || e.key === 'G') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.canvas.ungroupShapes();
                    } else {
                        this.canvas.groupShapes();
                    }
                } else {
                    document.getElementById('gridBtn').click();
                }
            } else if (e.key === 's' || e.key === 'S') {
                if (!e.ctrlKey && !e.metaKey) {
                    document.getElementById('snapBtn').click();
                }
            } else if (e.key === 'l' || e.key === 'L') {
                if (!e.ctrlKey && !e.metaKey) {
                    document.getElementById('guidelinesBtn').click();
                }
            }
            
            // Alignment shortcuts (using Alt key)
            if (e.altKey) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.canvas.alignShapes('left');
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.canvas.alignShapes('right');
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.canvas.alignShapes('top');
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.canvas.alignShapes('bottom');
                } else if (e.key === 'h' || e.key === 'H') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.canvas.alignShapes('distribute-horizontal');
                    } else {
                        this.canvas.alignShapes('center');
                    }
                } else if (e.key === 'v' || e.key === 'V') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.canvas.alignShapes('distribute-vertical');
                    } else {
                        this.canvas.alignShapes('middle');
                    }
                }
            }
            
            // Theme toggle (Alt + T)
            if (e.altKey && (e.key === 't' || e.key === 'T')) {
                e.preventDefault();
                const currentTheme = document.body.getAttribute('data-theme') || 'light';
                this.setTheme(currentTheme === 'light' ? 'dark' : 'light');
            }
            
            // Escape
            if (e.key === 'Escape') {
                this.canvas.selectShape(null);
                this.canvas.currentShapeType = null;
                document.getElementById('selectBtn').click();
            }
        });
    }

    setupPropertiesPanel() {
        document.getElementById('closePropsBtn').addEventListener('click', () => {
            document.getElementById('propertiesPanel').classList.remove('active');
        });
    }

    setupTheme() {
        // Get saved theme preference or detect system preference
        const savedTheme = localStorage.getItem('theme') || 'system';
        this.setTheme(savedTheme);

        // Theme toggle button click handler
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const themeMenu = document.getElementById('themeMenu');
        
        themeToggleBtn.addEventListener('click', () => {
            themeMenu.classList.toggle('active');
        });

        // Theme option click handlers
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.setTheme(theme);
                themeMenu.classList.remove('active');
            });
        });

        // Close theme menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!themeToggleBtn.contains(e.target) && !themeMenu.contains(e.target)) {
                themeMenu.classList.remove('active');
            }
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (localStorage.getItem('theme') === 'system') {
                this.setTheme('system');
            }
        });
    }

    setTheme(theme) {
        localStorage.setItem('theme', theme);
        
        // Remove existing theme class
        document.body.removeAttribute('data-theme');
        
        if (theme === 'system') {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.setAttribute('data-theme', 'dark');
                this.updateThemeIcon('dark');
            } else {
                document.body.setAttribute('data-theme', 'light');
                this.updateThemeIcon('light');
            }
        } else {
            document.body.setAttribute('data-theme', theme);
            this.updateThemeIcon(theme);
        }

        // Update theme option active states
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });

        // Update connector colors
        this.canvas.shapes.forEach(shape => {
            if (shape instanceof Arrow || shape instanceof Line) {
                shape.updateThemeColor();
            }
        });

        // Redraw canvas with new theme colors
        this.canvas.render();
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggleBtn i');
        icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Update alignment buttons state based on selection
    updateAlignmentButtons() {
        // Get count of alignable shapes (excluding connectors)
        const alignableCount = this.canvas.selectedShapes.filter(
            shape => !(shape instanceof Arrow || shape instanceof Line)
        ).length;

        // Enable/disable buttons based on selection count
        const alignButtons = [
            'alignLeftBtn', 'alignCenterBtn', 'alignRightBtn',
            'alignTopBtn', 'alignMiddleBtn', 'alignBottomBtn'
        ];
        
        alignButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            btn.classList.toggle('enabled', alignableCount >= 2);
        });

        // Distribution buttons require at least 3 shapes
        const distributeButtons = ['distributeHBtn', 'distributeVBtn'];
        distributeButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            btn.classList.toggle('enabled', alignableCount >= 3);
        });
    }

    updatePropertiesPanel(shape) {
        const panel = document.getElementById('propertiesContent');
        this.updateAlignmentButtons();
        
        // Show multi-select info if multiple shapes selected
        if (this.canvas.selectedShapes.length > 1) {
            panel.innerHTML = `
                <div class="no-selection">
                    <i class="fas fa-object-group"></i>
                    <p><strong>${this.canvas.selectedShapes.length} shapes selected</strong></p>
                    <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                        Move, delete, or duplicate multiple shapes together
                    </p>
                </div>
            `;
            return;
        }
        
        if (!shape) {
            panel.innerHTML = `
                <div class="no-selection">
                    <i class="fas fa-info-circle"></i>
                    <p>Select a shape to edit properties</p>
                </div>
            `;
            return;
        }

        panel.innerHTML = `
            <div class="property-group">
                <label>Text</label>
                <textarea id="propText" rows="3">${shape.text || ''}</textarea>
            </div>
            
            <div class="property-group">
                <label>Font Size</label>
                <input type="number" id="propFontSize" value="${shape.fontSize}" min="8" max="72">
            </div>
            
            <div class="property-group">
                <label>Font Family</label>
                <select id="propFontFamily">
                    <option value="Arial" ${shape.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                    <option value="Helvetica" ${shape.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                    <option value="Times New Roman" ${shape.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                    <option value="Courier New" ${shape.fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
                    <option value="Verdana" ${shape.fontFamily === 'Verdana' ? 'selected' : ''}>Verdana</option>
                </select>
            </div>
            
            <div class="color-picker-group">
                <div class="color-picker">
                    <label>Fill Color</label>
                    <input type="color" id="propFillColor" value="${shape.fillColor === 'transparent' ? '#ffffff' : shape.fillColor}">
                </div>
                <div class="color-picker">
                    <label>Stroke Color</label>
                    <input type="color" id="propStrokeColor" value="${shape.strokeColor}">
                </div>
            </div>
            
            <div class="color-picker-group">
                <div class="color-picker">
                    <label>Text Color</label>
                    <input type="color" id="propTextColor" value="${shape.textColor}">
                </div>
                <div class="property-group">
                    <label>Stroke Width</label>
                    <input type="number" id="propStrokeWidth" value="${shape.strokeWidth}" min="0" max="10">
                </div>
            </div>
            
            <div class="property-group">
                <label>Position X</label>
                <input type="number" id="propX" value="${Math.round(shape.x)}">
            </div>
            
            <div class="property-group">
                <label>Position Y</label>
                <input type="number" id="propY" value="${Math.round(shape.y)}">
            </div>
            
            <div class="property-group">
                <label>Width</label>
                <input type="number" id="propWidth" value="${Math.round(shape.width)}" min="10">
            </div>
            
            <div class="property-group">
                <label>Height</label>
                <input type="number" id="propHeight" value="${Math.round(shape.height)}" min="10">
            </div>
        `;

        // Add event listeners for property changes
        this.attachPropertyListeners(shape);
    }

    attachPropertyListeners(shape) {
        const updateProperty = (id, property, isNumber = false) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    shape[property] = isNumber ? parseFloat(e.target.value) : e.target.value;
                    this.canvas.render();
                });
                element.addEventListener('change', () => {
                    this.canvas.saveState();
                });
            }
        };

        updateProperty('propText', 'text');
        updateProperty('propFontSize', 'fontSize', true);
        updateProperty('propFontFamily', 'fontFamily');
        updateProperty('propFillColor', 'fillColor');
        updateProperty('propStrokeColor', 'strokeColor');
        updateProperty('propTextColor', 'textColor');
        updateProperty('propStrokeWidth', 'strokeWidth', true);
        updateProperty('propX', 'x', true);
        updateProperty('propY', 'y', true);
        updateProperty('propWidth', 'width', true);
        updateProperty('propHeight', 'height', true);
    }

    showTextModal(shape) {
        const modal = document.getElementById('textModal');
        const textInput = document.getElementById('textInput');
        const textSize = document.getElementById('textSize');
        const textFont = document.getElementById('textFont');
        
        this.editingShape = shape;
        textInput.value = shape.text || '';
        textSize.value = shape.fontSize || 14;
        textFont.value = shape.fontFamily || 'Arial';
        
        this.openModal(modal);
        textInput.focus();
    }

    applyTextToShape() {
        if (this.editingShape) {
            this.editingShape.text = document.getElementById('textInput').value;
            this.editingShape.fontSize = parseInt(document.getElementById('textSize').value);
            this.editingShape.fontFamily = document.getElementById('textFont').value;
            this.canvas.saveState();
            this.canvas.render();
            this.updatePropertiesPanel(this.editingShape);
        }
    }

    showExportModal() {
        this.openModal(document.getElementById('exportModal'));
    }

    openModal(modal) {
        modal.classList.add('active');
    }

    closeModal(modal) {
        modal.classList.remove('active');
    }

    setActiveTool(toolId) {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(toolId).classList.add('active');
    }

    toggleButtonState(buttonId, enabled) {
        const btn = document.getElementById(buttonId);
        if (enabled) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    showNotification(message) {
        // Simple notification - you can enhance this
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FlowchartApp();
});

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
