// Additional Visual Effects for Enhanced CFD Simulation

// Create heat map visualization for floor and ceiling
function createHeatMapVisualization() {
    // Create grid of points for heat map
    const gridSize = 20; // 20x20 grid
    const room_width = parseFloat(roomWidth.value);
    const room_length = parseFloat(roomLength.value);
    const room_height = parseFloat(roomHeight.value);
    
    // Create floor heat map
    const floorHeatMap = createHeatMapMesh(gridSize, room_width, room_length, 0.01); // Just above floor
    scene.add(floorHeatMap);
    
    // Create ceiling heat map
    const ceilingHeatMap = createHeatMapMesh(gridSize, room_width, room_length, room_height - 0.01); // Just below ceiling
    scene.add(ceilingHeatMap);
    
    return { floorHeatMap, ceilingHeatMap };
}

// Create a heat map mesh at specified height
function createHeatMapMesh(gridSize, width, length, height) {
    // Create geometry
    const geometry = new THREE.PlaneGeometry(width, length, gridSize - 1, gridSize - 1);
    geometry.rotateX(-Math.PI / 2); // Make horizontal
    
    // Position at specified height
    geometry.translate(0, height, 0);
    
    // Create material with vertex colors
    const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        wireframe: false
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Initialize vertex colors (all blue/cool initially)
    const colors = [];
    const vertices = geometry.attributes.position.count;
    for (let i = 0; i < vertices; i++) {
        colors.push(0, 0.5, 1); // Cool blue
    }
    
    // Add color attribute to geometry
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    return mesh;
}

// Update heat maps based on particle positions and velocities
function updateHeatMaps(heatMaps, particles) {
    const { floorHeatMap, ceilingHeatMap } = heatMaps;
    
    // Reset heat values
    const floorHeat = new Array(floorHeatMap.geometry.attributes.position.count).fill(0);
    const ceilingHeat = new Array(ceilingHeatMap.geometry.attributes.position.count).fill(0);
    
    // Get room dimensions
    const room_width = parseFloat(roomWidth.value);
    const room_length = parseFloat(roomLength.value);
    const gridSize = Math.sqrt(floorHeatMap.geometry.attributes.position.count);
    
    // Calculate heat contribution from each particle
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const speed = particle.velocity.length();
        
        // Floor heat map contribution (particles near floor)
        if (particle.position.y < 0.5) {
            // Convert particle position to grid coordinates
            const gridX = Math.floor((particle.position.x + room_width/2) / room_width * (gridSize-1));
            const gridZ = Math.floor((particle.position.z + room_length/2) / room_length * (gridSize-1));
            
            if (gridX >= 0 && gridX < gridSize && gridZ >= 0 && gridZ < gridSize) {
                const index = gridZ * gridSize + gridX;
                // Add heat based on particle speed and proximity to floor
                const heatContribution = speed * 20 * (1 - particle.position.y / 0.5);
                floorHeat[index] += heatContribution;
            }
        }
        
        // Ceiling heat map contribution (particles near ceiling)
        const room_height = parseFloat(roomHeight.value);
        if (particle.position.y > room_height - 0.5) {
            // Convert particle position to grid coordinates
            const gridX = Math.floor((particle.position.x + room_width/2) / room_width * (gridSize-1));
            const gridZ = Math.floor((particle.position.z + room_length/2) / room_length * (gridSize-1));
            
            if (gridX >= 0 && gridX < gridSize && gridZ >= 0 && gridZ < gridSize) {
                const index = gridZ * gridSize + gridX;
                // Add heat based on particle speed and proximity to ceiling
                const heatContribution = speed * 20 * (1 - (room_height - particle.position.y) / 0.5);
                ceilingHeat[index] += heatContribution;
            }
        }
    }
    
    // Update floor heat map colors
    updateHeatMapColors(floorHeatMap, floorHeat);
    
    // Update ceiling heat map colors
    updateHeatMapColors(ceilingHeatMap, ceilingHeat);
}

// Update heat map colors based on heat values
function updateHeatMapColors(heatMap, heatValues) {
    const colors = heatMap.geometry.attributes.color.array;
    const maxHeat = Math.max(...heatValues, 1); // Avoid division by zero
    
    for (let i = 0; i < heatValues.length; i++) {
        const normalizedHeat = Math.min(1, heatValues[i] / maxHeat);
        
        // Convert heat to color (blue -> cyan -> green -> yellow -> red)
        const color = new THREE.Color();
        color.setHSL(0.7 * (1 - normalizedHeat), 0.9, 0.6);
        
        // Update color in buffer
        colors[i*3] = color.r;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b;
    }
    
    // Mark colors for update
    heatMap.geometry.attributes.color.needsUpdate = true;
}

// Create turbulence visualization (small random movements)
function addTurbulenceVisualization(particles) {
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1;
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue;
        
        const particle = particles[i];
        const speed = particle.velocity.length();
        
        // Add turbulence based on speed (faster = more turbulent)
        const turbulenceStrength = 0.0005 * speed * 10;
        
        // Add small random movement to particle
        particle.position.x += (Math.random() - 0.5) * turbulenceStrength;
        particle.position.y += (Math.random() - 0.5) * turbulenceStrength;
        particle.position.z += (Math.random() - 0.5) * turbulenceStrength;
    }
}

// Create vortex visualization for fan tips
function createVortexVisualization(fan, particles) {
    // Only apply to particles near blade tips
    const fan_height = parseFloat(fanHeight.value);
    const diameter = parseFloat(fanDiameter.value);
    const radius = diameter / 2;
    
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1;
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue;
        
        const particle = particles[i];
        
        // Check if particle is near blade tip
        const dx = particle.position.x;
        const dz = particle.position.z;
        const horizontalDistance = Math.sqrt(dx*dx + dz*dz);
        const verticalDistance = Math.abs(particle.position.y - fan_height);
        
        if (horizontalDistance > radius * 0.7 && horizontalDistance < radius * 1.3 && verticalDistance < 0.3) {
            // Add spiral motion to particle
            const angle = Math.atan2(dz, dx);
            const spiralStrength = 0.001 * parseFloat(fanRPM.value) / 100;
            
            // Tangential component
            particle.position.x += -Math.sin(angle) * spiralStrength;
            particle.position.z += Math.cos(angle) * spiralStrength;
            
            // Slight inward/outward component based on rotation direction
            const direction = rotationDirection.value === 'forward' ? -1 : 1;
            const radialStrength = 0.0005;
            particle.position.x += dx / horizontalDistance * radialStrength * direction;
            particle.position.z += dz / horizontalDistance * radialStrength * direction;
        }
    }
}
