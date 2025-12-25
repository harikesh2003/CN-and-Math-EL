class SignalEngine {
    constructor(floorPlan) {
        this.floorPlan = floorPlan;
        this.resolution = 10; // 10px blocks for Heatmap
    }

    /**
     * Compute signal strength for the entire grid
     */
    computeHeatmap(txPower, frequency) {
        const rows = Math.ceil(this.floorPlan.height / this.resolution);
        const cols = Math.ceil(this.floorPlan.width / this.resolution);

        let matrix = new Array(rows).fill(0).map(() => new Array(cols).fill(-100));
        let coverageCount = 0;
        let deadZoneCount = 0;
        let totalPoints = rows * cols;

        if (!this.floorPlan.router) return { matrix, stats: { coverage: 0, dead: 100 } };

        const router = this.floorPlan.router;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Center of the block
                const x = c * this.resolution + (this.resolution / 2);
                const y = r * this.resolution + (this.resolution / 2);

                const rssi = MathUtils.calculateRSSI(
                    router,
                    txPower,
                    parseFloat(frequency),
                    { x, y },
                    this.floorPlan.walls
                );

                matrix[r][c] = rssi;

                if (rssi > -75) coverageCount++;
                else deadZoneCount++;
            }
        }

        return {
            matrix,
            stats: {
                coverage: Math.round((coverageCount / totalPoints) * 100),
                dead: Math.round((deadZoneCount / totalPoints) * 100)
            }
        };
    }

    /**
     * Find best router position
     * Strategy: Coarse Grid Search
     */
    async findOptimalPosition(txPower, frequency, progressCallback) {
        const step = 40; // Check every 40px
        const width = this.floorPlan.width;
        const height = this.floorPlan.height;

        let bestScore = -Infinity;
        let bestPos = null;

        let candidates = [];

        // 1. Generate Candidates
        for (let x = step / 2; x < width; x += step) {
            for (let y = step / 2; y < height; y += step) {
                // Skip if inside a wall (simple check if very close to wall center?)
                // For now just try all open space
                candidates.push({ x, y });
            }
        }

        const total = candidates.length;

        // Chunk processing to prevent UI freeze
        for (let i = 0; i < total; i++) {
            const pos = candidates[i];

            // Calculate Score for this position
            // We use a simplified score: Sum of RSSI values or simple Coverage %
            // To be faster, we calculate coverage on a coarser grid (e.g. 20px)
            const score = this.evaluatePosition(pos, txPower, frequency);

            if (score > bestScore) {
                bestScore = score;
                bestPos = pos;
            }

            // Yield to UI every 20 iterations
            if (i % 20 === 0) {
                progressCallback((i / total) * 100, bestPos);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        return bestPos;
    }

    /**
     * Evaluate a single router position
     * Returns a score (higher is better)
     */
    evaluatePosition(pos, txPower, frequency) {
        const evalRes = 40; // Very coarse for speed
        const rows = Math.ceil(this.floorPlan.height / evalRes);
        const cols = Math.ceil(this.floorPlan.width / evalRes);

        let validPoints = 0;
        let sumRssi = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * evalRes;
                const y = r * evalRes;

                const rssi = MathUtils.calculateRSSI(
                    pos, txPower, parseFloat(frequency), { x, y }, this.floorPlan.walls
                );

                // Fitness function: 
                // We want to maximize signal > -75dBm
                // Penalty for very weak signals

                if (rssi > -70) {
                    sumRssi += 10; // Excellent
                } else if (rssi > -80) {
                    sumRssi += 5; // Okay
                } else {
                    sumRssi -= 5; // Bad
                }
            }
        }
        return sumRssi;
    }
}
