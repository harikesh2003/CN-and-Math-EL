// App Controller - V3 Modern Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const CONFIG = {
        gridSize: 2000,
        txStart: 20,
        freqStart: 2.4
    };

    // --- State ---
    const floorPlan = new FloorPlan(CONFIG.gridSize, CONFIG.gridSize);
    const renderer = new Renderer('floorPlan', 'heatmap', 'uiLayer', floorPlan);
    const engine = new SignalEngine(floorPlan);

    let currentTool = 'select'; // select, router, room, wall, door, window, erase
    let isDragging = false;
    let dragStart = { x: 0, y: 0 }; // World Coords
    let panStart = { x: 0, y: 0 };  // Screen Coords

    // --- DOM Elements ---
    const canvasViewport = document.getElementById('canvasContainer'); // The Wrapper
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
        // Always clear UI first to avoid ghosts
        renderer.clear(renderer.uiCtx);

        if (!floorPlan.router) {
            renderer.clear(renderer.hmCtx);
            // Draw ghost router if needed or just nothing
            // renderer.drawRouterOnUI(); // Don't draw if null
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
        renderer.clear(renderer.uiCtx); // Explicit clear
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
            if (currentTool === 'select') canvasViewport.style.cursor = 'grab';
            else if (currentTool === 'router') canvasViewport.style.cursor = 'crosshair'; // Icon for router?
            else canvasViewport.style.cursor = 'crosshair';
        });
    });

    // --- Zoom Controls ---
    const zoomIn = () => {
        renderer.scale = Math.min(renderer.scale + 0.2, 5.0);
        renderAll();
    };
    const zoomOut = () => {
        renderer.scale = Math.max(renderer.scale - 0.2, 0.2);
        renderAll();
    };
    const zoomReset = () => {
        renderer.scale = 1.0;
        renderer.offset = { x: 0, y: 0 };
        renderAll();
    };

    document.getElementById('btnZoomIn').addEventListener('click', (e) => { e.stopPropagation(); zoomIn(); });
    document.getElementById('btnZoomOut').addEventListener('click', (e) => { e.stopPropagation(); zoomOut(); });
    document.getElementById('btnResetZoom').addEventListener('click', (e) => { e.stopPropagation(); zoomReset(); });

    // --- Mouse Interactions (Attached to VIEWPORT) ---

    const getEvtPos = (e) => {
        const rect = canvasViewport.getBoundingClientRect();
        return {
            mx: e.clientX - rect.left,
            my: e.clientY - rect.top
        };
    };

    canvasViewport.addEventListener('mousedown', (e) => {
        // Prevent default to stop text selection etc
        e.preventDefault();

        const { mx, my } = getEvtPos(e);
        const worldPos = renderer.screenToWorld(mx, my);

        // Right Click: Removed in favor of Tool
        if (e.button === 2) return;

        // Left Click
        if (e.button === 0) {
            // Pan
            if (currentTool === 'select') {
                isDragging = true;
                panStart = { x: mx, y: my };
                canvasViewport.style.cursor = 'grabbing';
                return;
            }

            // Router Placement
            if (currentTool === 'router') {
                log(`Router placed`);
                floorPlan.setRouter(worldPos.x, worldPos.y);
                renderAll();
                requestVisUpdate();
                return;
            }

            // Booster Placement
            if (currentTool === 'booster') {
                log(`Booster placed`);
                floorPlan.addBooster(worldPos.x, worldPos.y);
                renderAll();
                requestVisUpdate();
                return;
            }

            // Eraser
            if (currentTool === 'erase') {
                const hit = floorPlan.getWallAt(worldPos);
                if (hit) {
                    floorPlan.removeWall(hit);
                    renderAll();
                    requestVisUpdate();
                }
                isDragging = true; // allow drag erase
                return;
            }

            // Drawing Tools
            isDragging = true;
            dragStart = worldPos;
            panStart = { x: mx, y: my }; // used for screen-space preview
        }
    });

    canvasViewport.addEventListener('mousemove', (e) => {
        const { mx, my } = getEvtPos(e);
        const worldPos = renderer.screenToWorld(mx, my);

        if (!isDragging) {
            // Hover logic?
            return;
        }

        // Panning
        if (currentTool === 'select') {
            const dx = mx - panStart.x;
            const dy = my - panStart.y;
            renderer.offset.x += dx;
            renderer.offset.y += dy;
            panStart = { x: mx, y: my };
            renderAll();
            return;
        }

        // Router Drag (if we want to support dragging router while in router mode)
        /* 
        if (currentTool === 'router') {
             floorPlan.setRouter(worldPos.x, worldPos.y);
             renderAll();
             // throttle vis update?
        } 
        */

        // Drag Eraser
        if (currentTool === 'erase') {
            const hit = floorPlan.getWallAt(worldPos);
            if (hit) {
                floorPlan.removeWall(hit);
                renderAll();
                requestVisUpdate();
            }
            return;
        }

        // Drawing Previews
        // Clear UI layer first
        renderer.clear(renderer.uiCtx);
        renderer.drawRouterOnUI(); // Keep router visible

        if (currentTool === 'room') {
            const w = worldPos.x - dragStart.x;
            const h = worldPos.y - dragStart.y;
            renderer.drawPreviewRect(dragStart, w, h);
        }
        else if (['wall', 'door', 'window'].includes(currentTool)) {
            renderer.drawPreviewLine(dragStart, worldPos);
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;

        if (currentTool === 'select') {
            canvasViewport.style.cursor = 'grab';
            return;
        }

        // Draw tools commit
        const { mx, my } = getEvtPos(e);
        const worldPos = renderer.screenToWorld(mx, my);
        const dist = Math.sqrt(Math.pow(worldPos.x - dragStart.x, 2) + Math.pow(worldPos.y - dragStart.y, 2));

        // Cleanup UI layer (remove preview lines)
        renderer.clear(renderer.uiCtx);
        renderer.drawRouterOnUI();

        if (dist < 5 && currentTool !== 'erase') return; // too small

        if (currentTool === 'room') {
            const w = worldPos.x - dragStart.x;
            const h = worldPos.y - dragStart.y;
            floorPlan.addRoom({ x: dragStart.x, y: dragStart.y, w, h }, 'wall');
        }
        else if (['wall', 'door', 'window'].includes(currentTool)) {
            let type = currentTool;
            if (type === 'wall') {
                type = document.getElementById('wallThickness').value;
            }
            floorPlan.addWall(dragStart, worldPos, type);
        }

        renderAll();
        requestVisUpdate();
    });

    // Prevent context menu
    canvasViewport.addEventListener('contextmenu', e => e.preventDefault());

    // Resize Handle
    const handleResize = () => {
        const rect = canvasViewport.getBoundingClientRect();
        renderer.resize(rect.width, rect.height);
        renderAll();
    };
    window.addEventListener('resize', handleResize);
    // Init
    setTimeout(handleResize, 100);

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();

        // Undo: Ctrl+Z
        if (e.ctrlKey && key === 'z') {
            e.preventDefault();
            if (floorPlan.undo()) { renderAll(); requestVisUpdate(); log('Undo'); }
        }
        // Redo: Ctrl+Y or Ctrl+Shift+Z
        if ((e.ctrlKey && key === 'y') || (e.ctrlKey && e.shiftKey && key === 'z')) {
            e.preventDefault();
            if (floorPlan.redo()) { renderAll(); requestVisUpdate(); log('Redo'); }
        }

        // Delete Mode? Maybe just Esc to reset tool
        if (e.key === 'Escape') {
            // currentTool = 'select'; // logic to reset tool?
        }
        // Delete/Backspace
        if (key === 'delete' || key === 'backspace') {
            log(`Use the Eraser tool (E) to remove items.`);
        }
    });

    // --- Toolbar Actions ---
    document.getElementById('btnUndo').addEventListener('click', () => {
        if (floorPlan.undo()) { renderAll(); requestVisUpdate(); log('Undo'); }
    });
    document.getElementById('btnRedo').addEventListener('click', () => {
        if (floorPlan.redo()) { renderAll(); requestVisUpdate(); log('Redo'); }
    });
    document.getElementById('btnClear').addEventListener('click', () => {
        if (confirm('Delete Everything?')) { floorPlan.clearAll(); renderAll(); requestVisUpdate(); log('Cleared All'); }
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

    document.getElementById('toggleGrid').addEventListener('click', (e) => {
        e.preventDefault();
        renderer.toggleGrid();
        renderAll();
    });

    document.getElementById('toggleHeatmap').addEventListener('click', (e) => {
        e.preventDefault();
        renderer.toggleHeatmap();
        if (renderer.showHeatmap) requestVisUpdate();
    });

    log('Welcome to Net Plan.');
    log('Select "Router" tool to place access point.');
});
