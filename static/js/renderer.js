class Renderer {
    constructor(canvasId, heatmapId, uiId, floorPlan) {
        this.canvasFromId = (id) => document.getElementById(id);

        this.ctx = this.canvasFromId(canvasId).getContext('2d');
        this.hmCtx = this.canvasFromId(heatmapId).getContext('2d');
        this.uiCtx = this.canvasFromId(uiId).getContext('2d');

        this.floorPlan = floorPlan;
        this.width = 800; // Default, will resize
        this.height = 600;

        // Viewport Transform
        this.scale = 1.0;
        this.offset = { x: 0, y: 0 };
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        [this.ctx, this.hmCtx, this.uiCtx].forEach(ctx => {
            ctx.canvas.width = w;
            ctx.canvas.height = h;
        });
    }

    clear(ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.restore();
    }

    resetTransform(ctx) {
        ctx.setTransform(this.scale, 0, 0, this.scale, this.offset.x, this.offset.y);
    }

    drawWalls() {
        this.clear(this.ctx);
        this.resetTransform(this.ctx);

        // Draw Blueprint Grid
        this.drawGrid();

        // Draw Walls
        this.floorPlan.walls.forEach(wall => {
            this.ctx.beginPath();
            this.ctx.moveTo(wall.start.x, wall.start.y);
            this.ctx.lineTo(wall.end.x, wall.end.y);

            // Architectural Style
            this.ctx.lineCap = 'round';
            if (wall.type === 'wall') {
                this.ctx.strokeStyle = '#334155'; // Slate 700
                this.ctx.lineWidth = 4;
            } else if (wall.type === 'window') {
                this.ctx.strokeStyle = '#38bdf8'; // Sky 400
                this.ctx.lineWidth = 3;
                // Double line for window
            } else if (wall.type === 'door') {
                this.ctx.strokeStyle = '#fbbf24'; // Amber 400
                this.ctx.lineWidth = 4;
            }

            this.ctx.stroke();

            // Nodes
            this.ctx.fillStyle = '#222';
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(wall.start.x, wall.start.y, 3, 0, Math.PI * 2);
            this.ctx.arc(wall.end.x, wall.end.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    drawGrid() {
        const step = 20;
        const left = -this.offset.x / this.scale;
        const top = -this.offset.y / this.scale;
        const right = left + (this.width / this.scale);
        const bottom = top + (this.height / this.scale);

        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();

        // Optimize loop bounds
        const startX = Math.floor(left / step) * step;
        const startY = Math.floor(top / step) * step;

        for (let x = startX; x <= right; x += step) {
            this.ctx.moveTo(x, top);
            this.ctx.lineTo(x, bottom);
        }
        for (let y = startY; y <= bottom; y += step) {
            this.ctx.moveTo(left, y);
            this.ctx.lineTo(right, y);
        }
        this.ctx.stroke();
    }

    drawRouter() {
        this.clear(this.hmCtx); // Heatmap canvas also holds router usually
        if (!this.floorPlan.router) return;

        this.resetTransform(this.hmCtx); // Important for router pos

        // Router is drawn on Heatmap layer or UI layer? 
        // Better on UI layer if heatmap is heavy. But previous logic drew heatmap then router.
        // Let's draw router on UI layer this time to separate from heatmap.
        // But heatmap is background.

        const { x, y } = this.floorPlan.router;

        // Draw on UI Context (cleared every frame usually?)
        // Let's stick to hmCtx for persistent router, or split it.
        // To be safe, we draw router AFTER heatmap on the same canvas or UI canvas.
        // Let's use UI canvas for current dynamic router.
    }

    // Explicit render router to UI layer
    drawRouterOnUI() {
        if (!this.floorPlan.router) return;
        this.resetTransform(this.uiCtx);
        const { x, y } = this.floorPlan.router;

        this.uiCtx.fillStyle = '#0d6efd';
        this.uiCtx.beginPath();
        this.uiCtx.arc(x, y, 6 / this.scale, 0, Math.PI * 2); // Inverse scale to keep size constant-ish? No, zoom should zoom it.
        this.uiCtx.arc(x, y, 6, 0, Math.PI * 2);
        this.uiCtx.fill();

        // Ring
        this.uiCtx.strokeStyle = '#fff';
        this.uiCtx.lineWidth = 2;
        this.uiCtx.beginPath();
        this.uiCtx.arc(x, y, 10, 0, Math.PI * 2);
        this.uiCtx.stroke();
    }

    drawHeatmap(signalMatrix, resolution) {
        // Heatmap is tricky with Pan/Zoom.
        // The matrix corresponds to world coordinates.
        // We can draw it to an offscreen canvas or just drawRects with transform.
        this.clear(this.hmCtx);
        this.resetTransform(this.hmCtx);

        if (!signalMatrix) return;

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

        this.uiCtx.fillRect(start.x, start.y, w, h);
        this.uiCtx.strokeRect(start.x, start.y, w, h);
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
