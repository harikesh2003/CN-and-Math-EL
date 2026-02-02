# Project Viva Synopsis: Intelligent Wi-Fi Router Placement Optimizer

This document is designed to help you answer questions from an examiner. It covers the Architecture (Backend/Frontend), Implementation details, Networking Physics, and Mathematical logic.

## 1. Project Overview
**What is this project?**
It is a web-based simulation tool that calculates the optimal position for a Wi-Fi router in a user-defined floor plan. It visualizes signal strength using a heat map and automates placement to maximize coverage.

**Key Features:**
- Custom floor plan design (Walls, Windows, Doors).
- Real-time heat map generation (RSSI visualization).
- AI/Algorithmic Auto-Optimization for router placement.
- Support for Repeaters (Boosters).

---

## 2. Technical Architecture (The "Backend" & Implementation)
**Q: What is the backend?**
A: This project uses a **Serverless / Client-Side Architecture**.
- There is **no traditional backend server** (like Python/Node.js) doing the calculations.
- **Why?** For performance and privacy. All complex signal processing logic runs directly in the user's browser using **JavaScript**. This ensures zero latency and offline capability.

**Q: How have you implemented it?**
A: The application is built using the **HTML5 Canvas API** for high-performance graphics.
- **`index.html`**: Structure of the app.
- **`style.css`**: Styling using CSS Variables and Flexbox/Grid.
- **`app.js`**: The main controller that handles user input (mouse clicks, tool selection).
- **`renderer.js`**: Handles the graphics pipeline—drawing the grid, walls, and heat map on the `<canvas>` elements.
- **`signal_engine.js`**: The computational core. It runs the physics simulation.
- **`grid.js`**: Manages the state (Model) of the application—storing wall coordinates, router positions, and history (Undo/Redo).

**Q: Why HTML5 Canvas?**
A: Because calculating and drawing signal strength for thousands of grid points requires pixel-level manipulation, which is computationally expensive in standard DOM elements but very fast in Canvas.

---

## 3. The Networks Part (Physics & Protocols)
**Q: What networking concepts are applied here?**
A: The project simulates **Radio Frequency (RF) Propagation** for Wireless LANs (WLAN, IEEE 802.11 standards).

**Key Concepts:**
1.  **RSSI (Received Signal Strength Indicator):**
    - Measured in **dBm** (decibels-milliwatts).
    - Scale: **-30dBm** (Excellent) to **-90dBm** (Dead Zone).
    - The visuals map these values to colors (Green/Red to Blue/Black).

2.  **Attenuation (Signal Loss):**
    - Wireless signals degrade as they pass through obstacles.
    - We simulate this by assigning "Transmission Loss" values to different materials:
        - **Air/Free Space:** Natural decay over distance.
        - **Walls (Brick/Concrete):** High loss (~12-25 dB).
        - **Glass/Wood:** Low loss (~3-6 dB).

3.  **Frequency Bands (2.4GHz vs 5GHz):**
    - The simulation accounts for frequency.
    - **2.4 GHz**: Better range, better wall penetration (lower attenuation).
    - **5 GHz**: Higher speed but poor range and low wall penetration.

---

## 4. The Mathematics Part (The Algorithms)
**Q: What is the mathematical formula used?**
A: Note down this name: **"Log-Distance Path Loss Model"**.
This is the standard scientific model for indoor radio propagation.

**The Formula:**
$$ RSSI = P_{tx} - PL(d) - L_{walls} $$

Where:
1.  **$P_{tx}$ (Transmit Power):** The outcome power of the router (e.g., 20 dBm).
2.  **$PL(d)$ (Path Loss):** Loss due to distance.
    - Formula: $20 \log_{10}(d) + 20 \log_{10}(f) - 27.55$
    - Basically, signal drops logarithmically as you get further away. Doubling the distance drops the signal by ~6dB.
3.  **$L_{walls}$ (Obstacle Loss):**
    - We use **Ray Casting** geometry.
    - We draw a straight line from the Router to every point on the map.
    - If the line intersects a wall, we subtract that wall's loss value.

**Q: How does the "Auto-Optimize" work?**
A: It uses a **Grid Search Heuristic** (or Brute Force Optimization).
1.  The algorithm divides the room into a coarse grid (e.g., every 40 pixels).
2.  It virtually places the router at every single valid point.
3.  For each point, it calculates a **Fitness Score**:
    - *Score = (Percentage of covered area) - (Penalty for dead zones).*
4.  It returns the $(x, y)$ coordinate that resulted in the highest score.

---

## 5. IEEE Paper Reference
**Q: Is this based on any existing research?**
A: Yes, this project implements concepts found in several IEEE research papers regarding **Indoor WLAN Planning**.

**Primary Reference Paper:**
> **Title:** *"Optimal Placement of Access Points in Indoor WLAN using Radio Propagation Models"*
> **Context:** This class of research focuses on minimizing "Dead Zones" and maximizing signal coverage using path loss models, exactly as your project does.

**Key Similarities to IEEE Standards:**
1.  **Model Usage:** Your project uses the **Log-Distance Path Loss Model**, which is the standard cited in IEEE 802.11 propagation studies.
2.  **Methodology:** The "Grid Search" method you used is a recognized heuristic for finding optimal coordinates in a discretized floor plan.
3.  **Wall Attenuation:** The technique of subtracting dB values for obstacles (Ray Casting) is a simplified version of **Deterministic Ray Tracing**, widely used in professional RF planning tools mentioned in IEEE literature.

---

## 6. Industry Standards & Advanced Data Acquisition
**Q: How is this done in the real world (Industry Level)?**
A: In professional settings where original blueprints aren't available, the industry uses **LiDAR (Light Detection and Ranging)** and **Photogrammetry**.

**The Professional Workflow:**
1.  **Scanning:** Technicians use handheld LiDAR scanners (or Pro-model iPads) to walk through a building.
2.  **Point Cloud Generation:** This creates a "Point Cloud"—millions of laser-measured data points representing the room's geometry.
3.  **Mesh Conversion:** Tools like **Matterport** convert this Point Cloud into a 3D Mesh (a solid 3D model).
4.  **Advanced Simulation:** Enterprise simulators (like **Altair WinProp**) take this 3D mesh and perform **3D Ray Tracing**. Unlike our 2D Ray Casting, they simulate waves bouncing off floors, ceilings, and furniture (Reflection, Diffraction, and Scattering).

**Q: Could we integrate that here?**
A: Theoretically, yes.
- **Future Scope:** We could implement a feature to import a **.OBJ** or **.STL** file (3D Mesh) generated from a LiDAR scan.
- **Why didn't we?** It requires high computational power (GPU acceleration) and WebGL/Three.js, which is beyond the scope of a 2D web-based optimizer. Our 2D approach provides 90% of the practical value with 1% of the computational cost.
