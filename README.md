# Intelligent Wi-Fi Router Placement Optimizer

## Overview
A scientific web application designed to determine the optimal position for Wi-Fi routers within an indoor environment. Using algorithmic signal propagation modeling (Log-Distance Path Loss), the system simulates RF behavior accounting for wall attenuation, distance decay, and interference to maximize coverage and minimize dead zones.

## Features
- **Interactive Floor Plan Designer**: Draw walls, windows, and doors with specific attenuation factors.
- **Real-Time Signal Simulation**: Instant heatmap generation based on router placement.
- **Auto-Optimization Engine**: Algorithmic search for the mathematically optimal router position.
- **Scientific Visualization**: Color-coded signal strength (Red > -30dBm to Blue < -90dBm).
- **Configurable Hardware**: Adjust Tx Power (dBm) and Frequency (2.4GHz / 5GHz).

## Mathematical Models

### 1. Signal Propagation (Log-Distance Path Loss)
The core physical model used is the **One-Slope Log-Normal Path Loss Model**, adapted for indoor usage.

$$ RSSI = P_{tx} - L_0 - 10 \cdot n \cdot \log_{10}(d) - \sum L_{walls} $$

Where:
- **$P_{tx}$**: Transmit Power (dBm).
- **$L_0$**: Reference path loss at 1 meter (approx. 40dB for 2.4GHz).
- **$n$**: Path Loss Exponent (set to 2.0-3.0 for indoor environments).
- **$d$**: Euclidean distance between router and target point (meters).
- **$L_{walls}$**: Sum of attenuation from all obstacles intersecting the direct path (Ray Casting).

### 2. Wall Attenuation Factors
- **Concrete Wall**: 12 dB loss
- **Wood Door**: 6 dB loss
- **Glass Window**: 3 dB loss

### 3. Optimization Algorithm
The system employs a **Grid Search Heuristic**.
1. The floor plan is discretized into a coarse grid of candidate positions.
2. For each candidate $P(x,y)$, a simulation is run to calculate the global specific coverage score.
3. The score is determined by: $\sum (\text{valid\_points} \times \text{weight}) - (\text{dead\_zones} \times \text{penalty})$.
4. The position with the global maximum score is selected.

## Technical Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+).
- **Rendering**: HTML5 Canvas API for high-performance plotting.
- **Styling**: Bootstrap 5 + Custom Dark/Glassmorphism Theme.
- **Logic**: Pure Client-Side computation (ensures privacy and zero-latency).

## How to Run
1. Open `index.html` in any modern web browser (Edge, Chrome, Firefox, Safari).
2. No installation required.
3. Use the sidebar to draw your room layout.
4. Right-click to place a router manually, or click **Auto-Optimize** to let the AI decide.

## Future Scalability
- **3D Modeling**: Extension to z-axis for multi-floor optimization.
- **Genetic Algorithms**: implementing GA for multi-router usage where the search space becomes combinatorial ($N^k$).
- **Export**: PDF generation for placement reports.
