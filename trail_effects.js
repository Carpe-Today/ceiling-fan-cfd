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

// Create trail objects for each particle
function initializeTrails(particles) {
    const trailObjects = [];
    const trailMaterials = createTrailMaterials();
    
    for (let i = 0; i < particles.length; i++) {
        // Create a line geometry (initially empty)
        const geometry = new THREE.BufferGeometry();
        // Use the first material (most opaque) by default
        const trail = new THREE.Line(geometry, trailMaterials[0]);
        scene.add(trail);
        trailObjects.push(trail);
    }
    
    return trailObjects;
}

// Update trail geometries based on particle positions
function updateTrails(particles, trailObjects, trailMaterials) {
    // For mobile, update fewer trails per frame for better performance
    const updateFactor = isMobile ? 5 : 1;
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of trails each frame
        if (isMobile && i % updateFactor !== 0) continue;
        
        const particle = particles[i];
        const trail = trailObjects[i];
        
        if (particle.trail && particle.trail.length > 1) {
            // Create points array from trail positions
            const points = [];
            for (let j = 0; j < particle.trail.length; j++) {
                points.push(particle.trail[j]);
            }
            
            // Update geometry with new points
            trail.geometry.dispose(); // Clean up old geometry
            trail.geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            // Set material based on particle velocity (for color coding)
            const speed = particle.velocity.length();
            const maxVelocity = 0.15 * (1 + parseFloat(fanRPM.value) / 200 * 0.5);
            const ratio = Math.min(1, speed / maxVelocity);
            
            // Get material index based on velocity (faster = more vibrant)
            const materialIndex = Math.min(9, Math.floor((1 - ratio) * 10));
            trail.material = trailMaterials[materialIndex];
            
            // Set color based on velocity (blue -> cyan -> green -> yellow -> red)
            const color = new THREE.Color();
            color.setHSL(0.7 * (1 - ratio), 0.9, 0.6);
            trail.material.color.copy(color);
        }
    }
}

// Clean up trails when resetting simulation
function cleanupTrails(trailObjects) {
    for (let i = 0; i < trailObjects.length; i++) {
        scene.remove(trailObjects[i]);
        trailObjects[i].geometry.dispose();
        trailObjects[i].material.dispose();
    }
    return [];
}

// Add velocity-based particle size variation
function updateParticleSizes(particles) {
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1;
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue;
        
        const particle = particles[i];
        const speed = particle.velocity.length();
        const maxVelocity = 0.15 * (1 + parseFloat(fanRPM.value) / 200 * 0.5);
        const ratio = Math.min(1, speed / maxVelocity);
        
        // Faster particles are slightly larger (1.0 to 1.5 times base size)
        const sizeFactor = 1.0 + ratio * 0.5;
        particle.scale.set(sizeFactor, sizeFactor, sizeFactor);
    }
}

// Add pulsing effect to particles based on age
function addPulsingEffect(particles) {
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1;
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue;
        
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
