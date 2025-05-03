// Trail Rendering Implementation
// This adds dynamic visual effects to the particle system

function createTrailMaterials() {
    // Create an array of materials with different opacities for trail segments
    const trailMaterials = [];
    const baseColor = new THREE.Color(0x00aaff);
    
    // Create 10 materials with decreasing opacity
    for (let i = 0; i < 10; i++) {
        const opacity = 0.8 - (i * 0.07); // Fade from 0.8 to 0.1
        const material = new THREE.LineBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: opacity,
            blending: THREE.AdditiveBlending // Makes trails more vibrant when overlapping
        });
        trailMaterials.push(material);
    }
    
    return trailMaterials;
}

// Create trail objects (Line geometries) for each particle
// Returns an object containing the array of line objects and the materials
function initializeTrails(scene, particles) { // Added scene parameter
    const trailObjects = [];
    const trailMaterials = createTrailMaterials();
    
    for (let i = 0; i < particles.length; i++) {
        // Create a line geometry (initially empty)
        const geometry = new THREE.BufferGeometry();
        // Use the first material (most opaque) by default
        const trail = new THREE.Line(geometry, trailMaterials[0]);
        scene.add(trail); // Use scene parameter
        trailObjects.push(trail);
    }
    
    // Return both the lines and the materials for updating
    return { lines: trailObjects, materials: trailMaterials }; 
}

// Update trail geometries based on particle positions
function updateTrails(particles, trailObjects, simParams, isMobile) { // Added simParams, isMobile
    const trailLines = trailObjects.lines;
    const trailMaterials = trailObjects.materials;
    const rpm = simParams.fanRPM;
    
    // For mobile, update fewer trails per frame for better performance
    const updateFactor = isMobile ? 5 : 1; // Use isMobile parameter
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of trails each frame
        if (isMobile && i % updateFactor !== 0) continue; // Use isMobile parameter
        
        const particle = particles[i];
        const trail = trailLines[i];
        
        if (particle.trail && particle.trail.length > 1) {
            // Create points array from trail positions and validate them
            const points = [];
            let validPoints = true;
            for (let j = 0; j < particle.trail.length; j++) {
                const p = particle.trail[j];
                if (p && isFinite(p.x) && isFinite(p.y) && isFinite(p.z)) {
                    points.push(p);
                } else {
                    validPoints = false;
                    console.warn(`Invalid point detected in trail for particle ${i} at index ${j}:`, p);
                    break; // Stop processing this trail if an invalid point is found
                }
            }
            
            // Only update geometry if all points are valid and there are enough points
            if (validPoints && points.length > 1) {
                // Update geometry with new points
                trail.geometry.dispose(); // Clean up old geometry
                trail.geometry = new THREE.BufferGeometry().setFromPoints(points);
                
                // Set material based on particle velocity (for color coding)
                const speed = particle.velocity.length();
                const maxVelocity = 0.15 * (1 + rpm / 200 * 0.5); // Use rpm from simParams
                const ratio = Math.min(1, speed / (maxVelocity + 1e-6)); // Add epsilon to prevent division by zero
                
                // Get material index based on velocity (faster = more vibrant)
                const materialIndex = Math.min(trailMaterials.length - 1, Math.floor((1 - ratio) * trailMaterials.length));
                trail.material = trailMaterials[materialIndex];
                
                // Set color based on velocity (blue -> cyan -> green -> yellow -> red)
                const color = new THREE.Color();
                color.setHSL(0.7 * (1 - ratio), 0.9, 0.6);
                trail.material.color.copy(color);
                
                // Make trail visible
                trail.visible = true;
            } else {
                // Hide trail if points are invalid or not enough points
                trail.visible = false;
            }
        } else {
            // Hide trail if not enough points
            trail.visible = false;
        }
    }
}

// Clean up trails when resetting simulation
function cleanupTrails(scene, trailObjects) { // Added scene parameter
    if (trailObjects && trailObjects.lines) {
        for (let i = 0; i < trailObjects.lines.length; i++) {
            const trail = trailObjects.lines[i];
            scene.remove(trail); // Use scene parameter
            trail.geometry.dispose();
            // Materials are shared, dispose them separately if needed, but usually not required
            // if (trail.material) trail.material.dispose(); 
        }
    }
    // Return an empty structure
    return { lines: [], materials: [] }; 
}

// Add velocity-based particle size variation
function updateParticleSizes(particles, simParams, isMobile) { // Added simParams, isMobile
    const rpm = simParams.fanRPM;
    
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1; // Use isMobile parameter
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue; // Use isMobile parameter
        
        const particle = particles[i];
        const speed = particle.velocity.length();
        const maxVelocity = 0.15 * (1 + rpm / 200 * 0.5); // Use rpm from simParams
        const ratio = Math.min(1, speed / maxVelocity);
        
        // Faster particles are slightly larger (1.0 to 1.5 times base size)
        const sizeFactor = 1.0 + ratio * 0.5;
        particle.scale.set(sizeFactor, sizeFactor, sizeFactor);
    }
}

// Add pulsing effect to particles based on age
function addPulsingEffect(particles, isMobile) { // Added isMobile
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1; // Use isMobile parameter
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue; // Use isMobile parameter
        
        const particle = particles[i];
        
        // Subtle pulsing based on age
        const pulseFrequency = 0.1; // Lower = slower pulse
        const pulseAmplitude = 0.15; // Higher = more pronounced pulse
        const pulseFactor = 1.0 + Math.sin(particle.age * pulseFrequency) * pulseAmplitude;
        
        // Apply pulse to opacity
        if (particle.material.transparent) {
            const baseOpacity = 0.8;
            particle.material.opacity = baseOpacity * pulseFactor;
        }
    }
}
