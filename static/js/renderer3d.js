// ThreeRenderer - V1 3D Visualization
class ThreeRenderer {
    constructor(containerId, floorPlan) {
        this.container = document.getElementById(containerId);
        this.floorPlan = floorPlan;

        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f9fa); // Light gray background
        this.scene.fog = new THREE.Fog(0xf8f9fa, 500, 2000);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 5000);
        this.camera.position.set(0, 800, 800); // High angle view
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        this.container.innerHTML = ''; // Clear existing canvases
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below ground

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(500, 1000, 500);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Ground Plane (for Raycasting)
        const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
        const planeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, depthWrite: false });
        this.ground = new THREE.Mesh(planeGeometry, planeMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(2000, 100, 0xccd5ae, 0xe2e8f0);
        // gridHelper.rotation.x = Math.PI / 2;
        this.scene.add(gridHelper);

        // Raycaster
        this.raycaster = new THREE.Raycaster();

        // Groups for easy clearing
        this.wallGroup = new THREE.Group();
        this.scene.add(this.wallGroup);

        this.routerGroup = new THREE.Group();
        this.scene.add(this.routerGroup);

        this.heatmapGroup = new THREE.Group();
        this.scene.add(this.heatmapGroup);

        this.previewGroup = new THREE.Group();
        this.scene.add(this.previewGroup);

        // Start Loop
        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    // --- Drawing Logic ---

    clearWalls() {
        this.wallGroup.clear();
    }

    drawWalls() {
        this.clearWalls();

        this.floorPlan.walls.forEach(wall => {
            const length = Math.sqrt(Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.y - wall.start.y, 2));
            const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
            const midX = (wall.start.x + wall.end.x) / 2;
            const midY = (wall.start.y + wall.end.y) / 2;

            let height = 30; // 3 meters scaled
            let thickness = 4;
            let color = 0x334155;
            let yPos = height / 2;
            let opacity = 1.0;
            let transparent = false;

            if (wall.type === 'window') {
                height = 15;
                yPos = 15; // Raised
                color = 0x38bdf8;
                opacity = 0.5;
                transparent = true;
            } else if (wall.type === 'door') {
                height = 22;
                yPos = 11;
                color = 0xfbbf24;
            }

            const geometry = new THREE.BoxGeometry(length, height, thickness);
            const material = new THREE.MeshPhongMaterial({
                color: color,
                transparent: transparent,
                opacity: opacity
            });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.position.set(midX, yPos, midY);
            mesh.rotation.y = -angle; // Three.js Y rotation is counter-clockwise?
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            this.wallGroup.add(mesh);
        });
    }

    drawRouterOnUI() {
        this.routerGroup.clear();
        if (!this.floorPlan.router) return;

        const { x, y } = this.floorPlan.router;

        // Router Mesh
        const geometry = new THREE.CylinderGeometry(5, 5, 2, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0x0d6efd, emissive: 0x0d6efd, emissiveIntensity: 0.5 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 10, y); // Slightly above ground

        // Antenna
        const antGeo = new THREE.CylinderGeometry(0.5, 0.5, 10, 8);
        const ant = new THREE.Mesh(antGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
        ant.position.set(0, 5, 0);
        mesh.add(ant);

        this.routerGroup.add(mesh);

        // Point Light
        const light = new THREE.PointLight(0x0d6efd, 1, 300);
        light.position.set(x, 20, y);
        this.routerGroup.add(light);
    }

    drawPreviewLine(start, end) {
        this.previewGroup.clear();
        if (!start || !end) return;

        const points = [];
        points.push(new THREE.Vector3(start.x, 2, start.y));
        points.push(new THREE.Vector3(end.x, 2, end.y));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x0d6efd });
        const line = new THREE.Line(geometry, material);
        this.previewGroup.add(line);
    }

    drawPreviewRect(start, w, h) {
        this.previewGroup.clear();

        const geometry = new THREE.BoxGeometry(w, 20, h);
        geometry.translate(w / 2, 10, h / 2); // anchor top-left

        const material = new THREE.MeshBasicMaterial({ color: 0x4f46e5, transparent: true, opacity: 0.2, wireframe: false });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(start.x, 0, start.y);

        const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial({ color: 0x4f46e5 }));
        wireframe.position.set(start.x, 0, start.y);

        this.previewGroup.add(mesh);
        this.previewGroup.add(wireframe);
    }

    drawHeatmap(signalMatrix, resolution) {
        this.heatmapGroup.clear();
        if (!signalMatrix) return;

        const rows = signalMatrix.length;
        const cols = signalMatrix[0].length;

        // Optimization: Create a texture instead of thousands of meshes
        const canvas = document.createElement('canvas');
        canvas.width = cols;
        canvas.height = rows;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(cols, rows);
        const data = imgData.data;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const rssi = signalMatrix[r][c];
                const index = (r * cols + c) * 4;

                if (rssi <= -100) {
                    data[index + 3] = 0; // Transparent
                } else {
                    const color = this.rssiToColorParams(rssi); // Returns {r,g,b,a}
                    data[index] = color.r;
                    data[index + 1] = color.g;
                    data[index + 2] = color.b;
                    data[index + 3] = 180; // Semi-transparent
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;

        const width = cols * resolution;
        const height = rows * resolution;

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);

        // Center alignment correction
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(width / 2 - this.floorPlan.width / 2, 1, height / 2 - this.floorPlan.height / 2);
        // Note: Coordinates in system are usually positive, but plane geometry centers.
        // Let's assume floorPlan starts at 0,0 top-left (which is -Z in 3D usually, or +Z?)
        // In this app, 2D coordinates are X+, Y+.
        // In 3D Three.js: X is Right, Z is Towards Viewer (effectively Down in 2D top-down), Y is Up.
        // So 2D (x, y) -> 3D (x, 0, y).

        // Plane is created centered.
        // If 2D range is [0, W] [0, H]
        // Plane center should be at W/2, H/2.
        mesh.position.set(width / 2, 1, height / 2);

        this.heatmapGroup.add(mesh);
    }

    rssiToColorParams(rssi) {
        let val = Math.max(-90, Math.min(rssi, -30));
        const norm = (val + 90) / 60;
        const hue = (1 - norm) * 240;

        // HSL to RGB conversion simplified or use canvas logic
        // Easier: simply return hue and let Three use HSL? No, Texture data needs RGB.
        // Quick HSL to RGB
        const s = 1.0;
        const l = 0.5;

        const k = n => (n + hue / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

        return {
            r: Math.floor(f(0) * 255),
            g: Math.floor(f(8) * 255),
            b: Math.floor(f(4) * 255)
        };
    }

    // --- Dynamic Updates ---

    updateRouterPos(x, y) {
        // Fast update without clearing groups
        if (this.routerGroup.children.length === 0) {
            this.floorPlan.router = { x, y };
            this.drawRouterOnUI();
            return;
        }

        // Assume children[0] is mesh, children[1] is light
        this.routerGroup.children.forEach(child => {
            child.position.x = x;
            child.position.z = y;
        });
    }

    highlightWall(mesh, enable) {
        if (!mesh) return;
        if (enable) {
            mesh.material.emissive.setHex(0x22d3ee); // Cyan Glow
            mesh.material.emissiveIntensity = 0.5;
        } else {
            mesh.material.emissive.setHex(0x000000);
            mesh.material.emissiveIntensity = 0.0;
        }
    }

    getIntersectedObject(coords, objects) {
        this.raycaster.setFromCamera(coords, this.camera);
        const intersects = this.raycaster.intersectObjects(objects);
        if (intersects.length > 0) return intersects[0].object;
        return null;
    }

    // Raycast for Mouse Interaction
    getRayIntersection(coords) {
        // coords: { x: -1 to 1, y: -1 to 1 }
        this.raycaster.setFromCamera(coords, this.camera);
        const intersects = this.raycaster.intersectObject(this.ground);
        if (intersects.length > 0) {
            return intersects[0].point;
        }
        return null;
    }
}
