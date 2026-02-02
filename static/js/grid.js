class FloorPlan {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.walls = []; // Array of {start: {x,y}, end: {x,y}, type: string}
        this.router = null; // {x, y}
        this.boosters = []; // Array of {x, y}

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
            router: this.router ? { ...this.router } : null,
            boosters: JSON.parse(JSON.stringify(this.boosters))
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
        this.boosters = state.boosters ? JSON.parse(JSON.stringify(state.boosters)) : [];
    }

    // --- Actions ---

    addWall(start, end, type) {
        this.walls.push({ start, end, type });
        this.saveState(); // Save AFTER change
    }

    addRoom(rect, type) {
        const { x, y, w, h } = rect;
        // Top
        this.walls.push({ start: { x, y }, end: { x: x + w, y }, type });
        // Right
        this.walls.push({ start: { x: x + w, y }, end: { x: x + w, y: y + h }, type });
        // Bottom
        this.walls.push({ start: { x: x + w, y: y + h }, end: { x, y: y + h }, type });
        // Left
        this.walls.push({ start: { x, y: y + h }, end: { x, y }, type });
        this.saveState(); // Save AFTER change
    }

    removeWall(wallObj) {
        this.walls = this.walls.filter(w => w !== wallObj);
        this.saveState(); // Save AFTER change
    }

    setRouter(x, y) {
        // Only save state if it's a distinct action, usually called by UI mouseup
        // For drag, we might not want to save every frame.
        // We will assume the UI calls this once on drop.
        this.router = { x, y };
        this.saveState(); // Save AFTER change
    }

    addBooster(x, y) {
        this.boosters.push({ x, y });
        this.saveState(); // Save AFTER change
    }

    removeBooster(boosterObj) {
        this.boosters = this.boosters.filter(b => b !== boosterObj);
        this.saveState(); // Save AFTER change
    }

    clearRouter() {
        this.router = null;
        this.saveState(); // Save AFTER change
    }

    clearWalls() {
        this.walls = [];
        this.saveState(); // Save AFTER change
    }

    clearAll() {
        this.walls = [];
        this.router = null;
        this.boosters = [];
        this.saveState(); // Save AFTER change
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
