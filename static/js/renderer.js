class Renderer {
    constructor(canvasId, heatmapId, uiId, floorPlan) {
        this.canvasFromId = (id) => document.getElementById(id);

        this.canvas = this.canvasFromId(canvasId);
        this.heatmapCanvas = this.canvasFromId(heatmapId);
        this.uiCanvas = this.canvasFromId(uiId);

        this.ctx = this.canvas.getContext('2d');
        this.hmCtx = this.heatmapCanvas.getContext('2d');
        this.uiCtx = this.uiCanvas.getContext('2d');

        this.floorPlan = floorPlan;
        this.width = 800; // Default, will resize
        this.height = 600;

        // Viewport Transform
        this.scale = 1.0;
        this.offset = { x: 0, y: 0 };
        this.showGrid = true;
        this.showHeatmap = true;
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
    }

    toggleHeatmap() {
        this.showHeatmap = !this.showHeatmap;
        if (!this.showHeatmap) this.clear(this.hmCtx);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;

        [this.canvas, this.heatmapCanvas, this.uiCanvas].forEach(c => {
            c.width = width;
            c.height = height;
        });
    }

    clear(ctx) {
        ctx.clearRect(0, 0, this.width, this.height);
    }

    resetTransform(ctx) {
        ctx.setTransform(this.scale, 0, 0, this.scale, this.offset.x, this.offset.y);
    }

    drawGrid() {
        if (!this.showGrid) return;

        const step = 40; // Grid size
        const ctx = this.ctx;

        // Calculate visible range
        const startX = -this.offset.x / this.scale;
        const startY = -this.offset.y / this.scale;
        const endX = (this.width - this.offset.x) / this.scale;
        const endY = (this.height - this.offset.y) / this.scale;

        // Snap to grid
        const left = Math.floor(startX / step) * step;
        const top = Math.floor(startY / step) * step;

        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1 / this.scale;
        ctx.beginPath();

        for (let x = left; x < endX; x += step) {
            ctx.moveTo(x, 0); // Infinite vertical lines? No, limit to reasonable?
            // Actually usually draw from top to bottom of view
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }

        for (let y = top; y < endY; y += step) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
    }

    drawWalls() {
        this.clear(this.ctx);
        this.resetTransform(this.ctx);

        // Draw Blueprint Grid
        if (this.showGrid) this.drawGrid();

        // Draw Walls
        this.ctx.lineCap = 'round';

        this.floorPlan.walls.forEach(wall => {
            let width = 4;
            let color = '#374151'; // standard wall

            if (wall.type === 'wall_thick') {
                width = 8;
                color = '#1f2937';
            } else if (wall.type === 'window') {
                width = 4;
                color = '#60a5fa'; // Blue-ish
            } else if (wall.type === 'door') {
                width = 4;
                color = '#d97706'; // Wood-ish
            }

            this.ctx.lineWidth = width; // / this.scale? No, usually walls scale with zoom
            this.ctx.strokeStyle = color;

            this.ctx.beginPath();
            this.ctx.moveTo(wall.start.x, wall.start.y);
            this.ctx.lineTo(wall.end.x, wall.end.y);
            this.ctx.stroke();
        });
    }

    // Explicit render router to UI layer
    drawRouterOnUI() {
        this.resetTransform(this.uiCtx);

        // 1. Draw Boosters
        if (this.floorPlan.boosters) {
            this.floorPlan.boosters.forEach(b => this.drawBooster(b));
        }

        // 2. Draw Router
        if (!this.floorPlan.router) return;

        const { x, y } = this.floorPlan.router;

        // Draw Router Icon (Fixed size in screen space)
        const radius = 8 / this.scale; // Adjust size to be consistent visually regardless of zoom

        this.uiCtx.fillStyle = '#0d6efd';
        this.uiCtx.beginPath();
        this.uiCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.uiCtx.fill();

        // Ring
        this.uiCtx.strokeStyle = '#fff';
        this.uiCtx.lineWidth = 2 / this.scale;
        this.uiCtx.beginPath();
        this.uiCtx.arc(x, y, radius + (2 / this.scale), 0, Math.PI * 2);
        this.uiCtx.stroke();
    }

    drawBooster(pos) {
        const radius = 6 / this.scale;
        const x = pos.x;
        const y = pos.y;

        this.uiCtx.fillStyle = '#198754'; // Success Green
        this.uiCtx.beginPath();
        this.uiCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.uiCtx.fill();

        this.uiCtx.strokeStyle = '#fff';
        this.uiCtx.lineWidth = 2 / this.scale;
        this.uiCtx.beginPath();
        this.uiCtx.arc(x, y, radius + (1 / this.scale), 0, Math.PI * 2);
        this.uiCtx.stroke();
    }

    drawHeatmap(signalMatrix, resolution) {
        // Heatmap is tricky with Pan/Zoom.
        // The matrix corresponds to world coordinates.
        // We can draw it to an offscreen canvas or just drawRects with transform.
        this.clear(this.hmCtx);
        this.resetTransform(this.hmCtx);

        if (!signalMatrix || !this.showHeatmap) return;

        // matrix[r][c] corresponds to world (c*res, r*res)
        const rows = signalMatrix.length;
        const cols = signalMatrix[0].length;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const rssi = signalMatrix[r][c];
                if (rssi <= -100) continue; // Optimization

                const color = this.rssiToColor(rssi);
                this.hmCtx.fillStyle = color;
                // Use a slight overlap to fix hairline cracks
                this.hmCtx.fillRect(c * resolution, r * resolution, resolution + 0.5, resolution + 0.5);
            }
        }
    }

    drawPreviewLine(start, end) {
        this.clear(this.uiCtx);
        this.drawRouterOnUI(); // Keep router visible
        if (!start || !end) return;

        this.resetTransform(this.uiCtx);
        this.uiCtx.strokeStyle = '#0d6efd';
        this.uiCtx.lineWidth = 2;
        this.uiCtx.setLineDash([5, 5]);
        this.uiCtx.beginPath();
        this.uiCtx.moveTo(start.x, start.y);
        this.uiCtx.lineTo(end.x, end.y);
        this.uiCtx.stroke();
        this.uiCtx.setLineDash([]);
    }

    drawPreviewRect(start, w, h) {
        this.clear(this.uiCtx);
        this.drawRouterOnUI();

        this.resetTransform(this.uiCtx);
        this.uiCtx.fillStyle = 'rgba(13, 110, 253, 0.2)';
        this.uiCtx.strokeStyle = '#0d6efd';
        this.uiCtx.lineWidth = 2;
        this.uiCtx.beginPath();
        this.uiCtx.fillRect(start.x, start.y, w, h);
        this.uiCtx.rect(start.x, start.y, w, h);
        this.uiCtx.stroke();
    }

    // Coordinate Transform Helpers
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.offset.x) / this.scale,
            y: (sy - this.offset.y) / this.scale
        };
    }

    rssiToColor(rssi) {
        // Re-implement gradient
        let val = Math.max(-90, Math.min(rssi, -30));
        const norm = (val + 90) / 60;
        const hue = (1 - norm) * 240;
        return `hsla(${hue}, 100%, 50%, 0.5)`; // Fixed alpha
    }
}
