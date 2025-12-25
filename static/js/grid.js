class FloorPlan {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.walls = []; // Array of {start: {x,y}, end: {x,y}, type: string}
        this.router = null; // {x, y}

        // History for Undo/Redo
        this.history = [];
        this.historyStep = -1;

        // Initial state
        this.saveState();
    }

    // --- History Management ---
    saveState() {
        // Remove any "redo" states if we diverge
        if (this.historyStep < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyStep + 1);
        }

        // Deep copy
        const state = {
            walls: JSON.parse(JSON.stringify(this.walls)),
            router: this.router ? { ...this.router } : null
        };

        this.history.push(state);
        this.historyStep++;
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep]);
            return true;
        }
        return false;
    }

    restoreState(state) {
        this.walls = JSON.parse(JSON.stringify(state.walls));
        this.router = state.router ? { ...state.router } : null;
    }

    // --- Actions ---

    addWall(start, end, type) {
        this.saveState();
        this.walls.push({ start, end, type });
    }

    addRoom(rect, type) {
        this.saveState();
        const { x, y, w, h } = rect;
        // Top
        this.walls.push({ start: { x, y }, end: { x: x + w, y }, type });
        // Right
        this.walls.push({ start: { x: x + w, y }, end: { x: x + w, y: y + h }, type });
        // Bottom
        this.walls.push({ start: { x: x + w, y: y + h }, end: { x, y: y + h }, type });
        // Left
        this.walls.push({ start: { x, y: y + h }, end: { x, y }, type });
    }

    removeWall(wallObj) {
        this.saveState();
        this.walls = this.walls.filter(w => w !== wallObj);
    }

    setRouter(x, y) {
        // Only save state if it's a distinct action, usually called by UI mouseup
        // For drag, we might not want to save every frame.
        // We will assume the UI calls this once on drop.
        this.saveState();
        this.router = { x, y };
    }

    clearRouter() {
        this.saveState();
        this.router = null;
    }

    clearWalls() {
        this.saveState();
        this.walls = [];
    }

    // --- Utils ---
    getWallAt(point, tolerance = 5) {
        return this.walls.find(wall => {
            const A = point.x - wall.start.x;
            const B = point.y - wall.start.y;
            const C = wall.end.x - wall.start.x;
            const D = wall.end.y - wall.start.y;

            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = -1;
            if (len_sq != 0) param = dot / len_sq;

            let xx, yy;

            if (param < 0) { xx = wall.start.x; yy = wall.start.y; }
            else if (param > 1) { xx = wall.end.x; yy = wall.end.y; }
            else { xx = wall.start.x + param * C; yy = wall.start.y + param * D; }

            const dx = point.x - xx;
            const dy = point.y - yy;
            return Math.sqrt(dx * dx + dy * dy) < tolerance;
        });
    }
}
