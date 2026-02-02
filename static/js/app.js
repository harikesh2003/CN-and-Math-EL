// App Controller - V3 Modern Dashboard Logic (3D Enhanced)

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const CONFIG = {
        gridSize: 2000,
        txStart: 20,
        freqStart: 2.4,
        snap: 20 // 1 Meter approx
    };

    // --- State ---
    const floorPlan = new FloorPlan(CONFIG.gridSize, CONFIG.gridSize);
    // Use ThreeRenderer instead of Canvas Renderer
    const renderer = new ThreeRenderer('canvasContainer', floorPlan);
    const engine = new SignalEngine(floorPlan);

    let currentTool = 'select'; // select (pan), room, wall, door, window, erase
    let isDragging = false;
    let dragStart = { x: 0, y: 0 }; // World Coords

    // --- DOM Elements ---
    const canvasContainer = document.getElementById('canvasContainer');
    const uiRefs = {
        txPower: document.getElementById('txPower'),
        txPowerVal: document.getElementById('txPowerVal'),
        freq: document.getElementById('frequency'),
        coverage: document.getElementById('coverageVal'),
        dead: document.getElementById('deadZoneVal'),
        log: document.getElementById('optimizationLog')
    };

    function log(msg) {
        const line = document.createElement('div');
        line.className = 'log-entry';
        line.innerHTML = `<span style="opacity:0.5">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
        uiRefs.log.appendChild(line);
        uiRefs.log.scrollTop = uiRefs.log.scrollHeight;
    }

    // --- Core Logic ---
    function updateSimulation(full = false) {
        if (!floorPlan.router) {
            renderer.heatmapGroup.clear();
            renderer.drawRouterOnUI();
            return;
        }

        const tx = parseInt(uiRefs.txPower.value);
        const freq = uiRefs.freq.value;

        if (full) {
            // Heavy Calculate
            const result = engine.computeHeatmap(tx, freq);
            renderer.drawHeatmap(result.matrix, engine.resolution);

            // Stats
            uiRefs.coverage.innerText = `${result.stats.coverage}%`;
            uiRefs.dead.innerText = `${result.stats.dead}%`;
        }

        renderer.drawRouterOnUI();
    }

    const renderAll = () => {
        renderer.drawWalls();
        renderer.drawRouterOnUI();
    };

    // debouncer
    let debounceTimer;
    const requestVisUpdate = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => updateSimulation(true), 150);
    };

    // --- Tool Selection ---
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Toggle
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Logic
            currentTool = btn.dataset.tool;
            log(`Tool selected: ${currentTool}`);

            // Cursor update
            if (currentTool === 'select') {
                canvasContainer.style.cursor = 'default';
                renderer.controls.enabled = true; // Enable Orbit
            } else {
                canvasContainer.style.cursor = 'crosshair';
                renderer.controls.enabled = false; // Disable Orbit while drawing
            }
        });
    });

    // --- Zoom Controls (Handled by OrbitControls now) ---
    document.getElementById('btnZoomIn').addEventListener('click', () => {
        renderer.camera.position.y -= 100;
        renderer.controls.update();
    });
    document.getElementById('btnZoomOut').addEventListener('click', () => {
        renderer.camera.position.y += 100;
        renderer.controls.update();
    });
    document.getElementById('btnResetZoom').addEventListener('click', () => {
        renderer.camera.position.set(0, 800, 800);
        renderer.controls.target.set(0, 0, 0);
        renderer.controls.update();
    });

    // --- Mouse Interactions ---

    // Helper: Get World Position via Raycast
    const get3DPos = (e) => {
        const rect = renderer.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        return { x, y }; // Return NDC
    };

    let routerDrag = false;
    let hoveredWall = null;

    canvasContainer.addEventListener('mousedown', (e) => {
        const ndc = get3DPos(e);
        const pt = renderer.getRayIntersection(ndc);

        // 1. Check Router Drag (Left Click)
        if (e.button === 0 && currentTool === 'select') {
            // Raycast against router group
            const routerHit = renderer.getIntersectedObject(ndc, renderer.routerGroup.children);
            if (routerHit) {
                routerDrag = true;
                renderer.controls.enabled = false;
                canvasContainer.style.cursor = 'grabbing';
                return;
            }
        }

        // 2. Right Click (Place Router)
        if (e.button === 2) {
            if (pt) {
                const snapP = {
                    x: Math.round(pt.x / CONFIG.snap) * CONFIG.snap,
                    y: Math.round(pt.z / CONFIG.snap) * CONFIG.snap
                };
                log(`Router placed at ${snapP.x}, ${snapP.y}`);
                floorPlan.setRouter(snapP.x, snapP.y);
                renderAll();
                requestVisUpdate();
            }
            return;
        }

        // 3. Drawing Start
        if (e.button === 0 && currentTool !== 'select' && pt) {
            const snapP = {
                x: Math.round(pt.x / CONFIG.snap) * CONFIG.snap,
                y: Math.round(pt.z / CONFIG.snap) * CONFIG.snap
            };

            isDragging = true;
            dragStart = snapP;

            if (currentTool === 'erase') {
                const hit = floorPlan.getWallAt(snapP, 30);
                if (hit) {
                    floorPlan.removeWall(hit);
                    renderAll();
                    requestVisUpdate();
                }
            }
        }
    });

    canvasContainer.addEventListener('mousemove', (e) => {
        const ndc = get3DPos(e);
        const pt = renderer.getRayIntersection(ndc); // Ground intersection
        if (!pt) return;

        // Dynamic Router Drag
        if (routerDrag) {
            renderer.updateRouterPos(pt.x, pt.z);
            floorPlan.router.x = pt.x;
            floorPlan.router.y = pt.z;

            // Fast Heatmap Update (Low Res)
            // Throttle this in real app, but let's try direct
            // To avoid lag, maybe just clear effects or show simple radius?
            // requestVisUpdate() is debounced 150ms.
            requestVisUpdate();
            return;
        }

        // Hover Effects (Select Mode)
        if (currentTool === 'select' && !isDragging) {
            const wallHit = renderer.getIntersectedObject(ndc, renderer.wallGroup.children);

            if (hoveredWall && hoveredWall !== wallHit) {
                renderer.highlightWall(hoveredWall, false);
                hoveredWall = null;
                canvasContainer.style.cursor = 'default';
            }

            if (wallHit) {
                renderer.highlightWall(wallHit, true);
                hoveredWall = wallHit;
                canvasContainer.style.cursor = 'pointer';
            }

            // Check Router Hover
            const routerHit = renderer.getIntersectedObject(ndc, renderer.routerGroup.children);
            if (routerHit) canvasContainer.style.cursor = 'grab';
            return;
        }

        if (!isDragging) return;

        // Drawing Logic
        if (currentTool === 'erase') {
            const hit = floorPlan.getWallAt({ x: pt.x, y: pt.z }, 30);
            if (hit) { floorPlan.removeWall(hit); renderAll(); requestVisUpdate(); }
            return;
        }

        const snapP = {
            x: Math.round(pt.x / CONFIG.snap) * CONFIG.snap,
            y: Math.round(pt.z / CONFIG.snap) * CONFIG.snap
        };

        // Preview
        renderer.previewGroup.clear();
        if (currentTool === 'room') {
            const w = snapP.x - dragStart.x;
            const h = snapP.y - dragStart.y;
            renderer.drawPreviewRect(dragStart, w, h);
        } else if (['wall', 'door', 'window'].includes(currentTool)) {
            renderer.drawPreviewLine(dragStart, snapP);
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (routerDrag) {
            routerDrag = false;
            renderer.controls.enabled = true;
            canvasContainer.style.cursor = 'grab';
            renderAll(); // Final snap/render
            requestVisUpdate(); // Final high-res calc
            log('Router moved.');
            return;
        }

        if (!isDragging) return;
        isDragging = false;

        if (currentTool === 'select') return;

        const ndc = get3DPos(e);
        const pt = renderer.getRayIntersection(ndc);
        if (!pt) return;

        const snapP = {
            x: Math.round(pt.x / CONFIG.snap) * CONFIG.snap,
            y: Math.round(pt.z / CONFIG.snap) * CONFIG.snap
        };

        if (currentTool === 'erase') return;

        // Commit target
        if (currentTool === 'room') {
            const w = snapP.x - dragStart.x;
            const h = snapP.y - dragStart.y;
            if (Math.abs(w) > 5 && Math.abs(h) > 5)
                floorPlan.addRoom({ x: dragStart.x, y: dragStart.y, w, h }, 'wall');
        } else if (['wall', 'door', 'window'].includes(currentTool)) {
            const d = Math.sqrt(Math.pow(snapP.x - dragStart.x, 2) + Math.pow(snapP.y - dragStart.y, 2));
            if (d > 5)
                floorPlan.addWall(dragStart, snapP, currentTool);
        }

        renderer.previewGroup.clear();
        renderAll();
        requestVisUpdate();
    });

    // Resize Handle
    const handleResize = () => {
        const rect = canvasContainer.getBoundingClientRect();
        renderer.resize(rect.width, rect.height);
        renderAll();
    };
    window.addEventListener('resize', handleResize);
    // Init
    setTimeout(handleResize, 100);

    // --- Toolbar Actions ---
    document.getElementById('btnUndo').addEventListener('click', () => {
        if (floorPlan.undo()) { renderAll(); requestVisUpdate(); log('Undo'); }
    });
    document.getElementById('btnRedo').addEventListener('click', () => {
        if (floorPlan.redo()) { renderAll(); requestVisUpdate(); log('Redo'); }
    });
    document.getElementById('btnClear').addEventListener('click', () => {
        if (confirm('Delete Everything?')) { floorPlan.clearWalls(); renderAll(); requestVisUpdate(); log('Cleared All'); }
    });

    // --- Config Actions ---
    uiRefs.txPower.addEventListener('input', () => {
        uiRefs.txPowerVal.innerText = uiRefs.txPower.value;
        requestVisUpdate();
    });
    uiRefs.freq.addEventListener('change', requestVisUpdate);

    // --- Optimization ---
    document.getElementById('btnOptimize').addEventListener('click', async () => {
        const btn = document.getElementById('btnOptimize');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> AI Optimizing...';

        log('Starting detailed analysis...');
        const tx = parseInt(uiRefs.txPower.value);
        const freq = uiRefs.freq.value;

        const bestPos = await engine.findOptimalPosition(tx, freq, (p) => { });

        if (bestPos) {
            floorPlan.setRouter(bestPos.x, bestPos.y);
            renderAll();
            requestVisUpdate();
            log('Optimization successful.');
        } else {
            log('Could not improve current state.');
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-magic me-2"></i> Auto-Optimize Placement';
    });

    // Disable context menu
    canvasContainer.addEventListener('contextmenu', e => e.preventDefault());

    log('Welcome to Wi-Fi Architect 3D.');
    log('Hold LEFT Click to Draw. Right Click to place Router.');
    log('Left Click + Drag to Rotate (Select Mode).');
});
