/**
 * Math Utilities for Wi-Fi Signal Calculation
 */

const MathUtils = {
    // Constants
    SCALE_PX_PER_METER: 20, // 20 pixels = 1 meter
    FREQUENCY_FACTOR: {
        '2.4': 28, // Constant for 2.4GHz
        '5.0': 34  // Higher loss for 5GHz
    },

    // Attenuation values (dB)
    WALL_LOSS: {
        'wall': 12,      // Standard Brick/Drywall
        'wall_thick': 25, // Concrete/Load Bearing
        'window': 3,     // Glass
        'door': 6        // Wood
    },

    /**
     * Calculate Euclidean distance between two points
     */
    distance: (p1, p2) => {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    },

    /**
     * Check if line segment (p1, p2) intersects with line segment (q1, q2)
     * Returns intersection point or null
     */
    getIntersection: (p1, p2, q1, q2) => {
        // Standard line intersection formula
        const det = (p2.x - p1.x) * (q2.y - q1.y) - (q2.x - q1.x) * (p2.y - p1.y);
        if (det === 0) return null; // Parallel lines

        const lambda = ((q2.y - q1.y) * (q2.x - p1.x) + (q1.x - q2.x) * (q2.y - p1.y)) / det;
        const gamma = ((p1.y - p2.y) * (q2.x - p1.x) + (p2.x - p1.x) * (q2.y - p1.y)) / det;

        if ((0 < lambda && lambda < 1) && (0 < gamma && gamma < 1)) {
            return {
                x: p1.x + lambda * (p2.x - p1.x),
                y: p1.y + lambda * (p2.y - p1.y)
            };
        }
        return null;
    },

    /**
     * Calculate Signal Strength (RSSI) in dBm
     * FSPL Model + Wall Attenuation
     * 
     * @param {Object} txPos - Router position {x, y}
     * @param {number} txPower - Transmit power in dBm
     * @param {number} frequency - 2.4 or 5.0
     * @param {Object} targetPos - Target grid point {x, y}
     * @param {Array} walls - List of walls [{start, end, type}]
     */
    calculateRSSI: (txPos, txPower, frequency, targetPos, walls) => {
        const d_px = MathUtils.distance(txPos, targetPos);
        const d_m = d_px / MathUtils.SCALE_PX_PER_METER;

        // Prevent singularity at d=0
        if (d_m < 0.1) return txPower;

        // 1. Free Space Path Loss (Simplified Indoor Model)
        // PL = 20log10(d) + 20log10(f) - 27.55 (Free Space) -> This is often too optimistic for indoors
        // One-Slope Model: PL = L0 + 10n log10(d)
        // L0 approx 40dB for 2.4GHz at 1m. n approx 2.5 to 3.5 for indoors.

        let pathLossExp = 2.0; // Free space mostly, walls handle the rest
        let L0 = (frequency === 2.4) ? 40 : 47;

        // Basic Path Loss
        let pl = L0 + 10 * pathLossExp * Math.log10(d_m);

        // 2. Wall Attenuation (Ray Casting)
        let wallLoss = 0;
        for (let wall of walls) {
            if (MathUtils.getIntersection(txPos, targetPos, wall.start, wall.end)) {
                wallLoss += MathUtils.WALL_LOSS[wall.type] || 0;
            }
        }

        let rssi = txPower - pl - wallLoss;

        // Clamp reasonable values
        return Math.max(-100, Math.min(rssi, txPower));
    }
};
