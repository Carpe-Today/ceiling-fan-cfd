// Enhanced Particle Animation Logic
// Based on CFD principles and visualization design

function updateEnhancedParticles(deltaTime) {
    const room_width = parseFloat(roomWidth.value);
    const room_length = parseFloat(roomLength.value);
    const room_height = parseFloat(roomHeight.value);
    const fan_height_from_floor = parseFloat(fanHeight.value);
    const diameter = parseFloat(fanDiameter.value);
    const radius = diameter / 2;
    const rpm = parseFloat(fanRPM.value);
    const speedFactor = rpm / 200;
    const direction = rotationDirection.value === 'forward' ? -1 : 1;
    const cfm = parseFloat(fanCFM.value);
    const cfmFactor = cfm / 5000;
    
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1;
    
    // Max velocity for color mapping
    const maxVelocity = 0.15 * (1 + speedFactor * 0.5); // Adjust based on expected max speed
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue;
        
        const particle = particles[i];
        
        // --- CFD Principle: Apply Forces (Simplified Pressure/Entrainment) ---
        applyForces(particle, fan_height_from_floor, radius, direction, speedFactor);
        
        // --- Update Position based on Velocity ---
        particle.position.x += particle.velocity.x * deltaTime * 60; // Scale by deltaTime
        particle.position.y += particle.velocity.y * deltaTime * 60;
        particle.position.z += particle.velocity.z * deltaTime * 60;
        
        // --- CFD Principle: Boundary Layer Effects & Wall Interaction ---
        handleBoundaryCollisions(particle, room_width, room_length, room_height, direction, speedFactor);
        
        // --- Visualization: Update Particle Trails ---
        updateTrail(particle);
        
        // --- Visualization: Velocity-Based Color Coding ---
        updateParticleColor(particle, maxVelocity);
        
        // --- Increment Age ---
        particle.age += 1;
        
        // --- CFD Principle: Conservation of Mass/Continuity (Reset Logic) ---
        if (particle.age > particle.lifetime) {
            resetParticle(particle, fan_height_from_floor, radius, room_width, room_length, room_height, rpm, cfm, diameter);
        }
    }
}

// Helper function to apply simplified forces (pressure gradient, entrainment)
function applyForces(particle, fan_height, fan_radius, direction, speedFactor) {
    // Simplified Entrainment: Pull particles towards the main jet
    const dx = particle.position.x;
    const dz = particle.position.z;
    const horizontalDistance = Math.sqrt(dx*dx + dz*dz);
    const verticalDistance = particle.position.y - fan_height;
    const entrainmentStrength = 0.0005 * speedFactor;

    if (direction < 0) { // Forward mode (downward jet)
        if (verticalDistance < 0 && horizontalDistance < fan_radius * 2) { // Below fan, near jet
            // Pull towards center axis
            const pullForce = new THREE.Vector3(-dx, 0, -dz).normalize().multiplyScalar(entrainmentStrength);
            particle.velocity.add(pullForce);
            // Accelerate downwards slightly
            particle.velocity.y -= entrainmentStrength * 0.5;
        }
    } else { // Reverse mode (upward jet)
         if (verticalDistance > 0 && horizontalDistance < fan_radius * 2) { // Above fan, near jet
            // Pull towards center axis
            const pullForce = new THREE.Vector3(-dx, 0, -dz).normalize().multiplyScalar(entrainmentStrength);
            particle.velocity.add(pullForce);
            // Accelerate upwards slightly
            particle.velocity.y += entrainmentStrength * 0.5;
        }
    }

    // Simplified Pressure Gradient: Weak pull towards fan intake
    const intakeStrength = 0.0003 * speedFactor;
    if (direction < 0 && verticalDistance > 0) { // Forward mode, above fan
        const pullToCenter = new THREE.Vector3(-dx, 0, -dz).normalize().multiplyScalar(intakeStrength);
        particle.velocity.add(pullToCenter);
        particle.velocity.y -= intakeStrength * 0.2; // Slight downward pull
    } else if (direction > 0 && verticalDistance < 0) { // Reverse mode, below fan
        const pullToCenter = new THREE.Vector3(-dx, 0, -dz).normalize().multiplyScalar(intakeStrength);
        particle.velocity.add(pullToCenter);
        particle.velocity.y += intakeStrength * 0.2; // Slight upward pull
    }
}

// Helper function for boundary collisions with improved physics
function handleBoundaryCollisions(particle, room_width, room_length, room_height, direction, speedFactor) {
    const damping = 0.6; // Energy loss on collision
    const friction = 0.05; // Slowdown parallel to surface (drag)

    // Walls (X)
    if (particle.position.x < -room_width / 2) {
        particle.position.x = -room_width / 2;
        particle.velocity.x *= -damping;
        // Apply friction to vertical and Z velocity
        particle.velocity.y *= (1 - friction);
        particle.velocity.z *= (1 - friction);
        // Slight push upwards along wall
        particle.velocity.y += 0.002 * speedFactor;
    } else if (particle.position.x > room_width / 2) {
        particle.position.x = room_width / 2;
        particle.velocity.x *= -damping;
        particle.velocity.y *= (1 - friction);
        particle.velocity.z *= (1 - friction);
        particle.velocity.y += 0.002 * speedFactor;
    }

    // Walls (Z)
    if (particle.position.z < -room_length / 2) {
        particle.position.z = -room_length / 2;
        particle.velocity.z *= -damping;
        // Apply friction to vertical and X velocity
        particle.velocity.y *= (1 - friction);
        particle.velocity.x *= (1 - friction);
        particle.velocity.y += 0.002 * speedFactor;
    } else if (particle.position.z > room_length / 2) {
        particle.position.z = room_length / 2;
        particle.velocity.z *= -damping;
        particle.velocity.y *= (1 - friction);
        particle.velocity.x *= (1 - friction);
        particle.velocity.y += 0.002 * speedFactor;
    }

    // Floor
    if (particle.position.y < 0) {
        particle.position.y = 0;
        particle.velocity.y *= -damping;
        // Apply friction to X and Z velocity
        particle.velocity.x *= (1 - friction * 2); // Higher friction on floor
        particle.velocity.z *= (1 - friction * 2);

        // Floor washing effect - push outwards (forward) or inwards (reverse)
        const floorWashStrength = 0.01 * speedFactor;
        const dx = particle.position.x;
        const dz = particle.position.z;
        const horizontalDistance = Math.sqrt(dx*dx + dz*dz);
        const dirX = dx / (horizontalDistance + 0.001);
        const dirZ = dz / (horizontalDistance + 0.001);
        const dirFactor = direction < 0 ? 1 : -1;
        particle.velocity.x += dirFactor * dirX * floorWashStrength;
        particle.velocity.z += dirFactor * dirZ * floorWashStrength;
    }
    
    // Ceiling
    else if (particle.position.y > room_height) {
        particle.position.y = room_height;
        particle.velocity.y *= -damping;
        // Apply friction to X and Z velocity
        particle.velocity.x *= (1 - friction);
        particle.velocity.z *= (1 - friction);

        // Ceiling return flow - push inwards (forward) or outwards (reverse)
        const ceilingFlowStrength = 0.008 * speedFactor;
        const dx = particle.position.x;
        const dz = particle.position.z;
        const horizontalDistance = Math.sqrt(dx*dx + dz*dz);
        const dirX = dx / (horizontalDistance + 0.001);
        const dirZ = dz / (horizontalDistance + 0.001);
        const dirFactor = direction < 0 ? -1 : 1;
        particle.velocity.x += dirFactor * dirX * ceilingFlowStrength;
        particle.velocity.z += dirFactor * dirZ * ceilingFlowStrength;
    }
}

// Helper function to update particle trails
function updateTrail(particle) {
    // Add current position to trail
    particle.trail.push(particle.position.clone());
    
    // Remove oldest point if trail is too long
    if (particle.trail.length > particle.trailLength) {
        particle.trail.shift();
    }
    
    // TODO: Implement actual trail rendering in the animate loop using Line geometry
}

// Helper function for velocity-based color coding
function updateParticleColor(particle, maxVelocity) {
    const speed = particle.velocity.length();
    const ratio = Math.min(1, speed / maxVelocity);
    
    // Simple Blue -> Red gradient
    const color = new THREE.Color();
    color.setHSL(0.7 * (1 - ratio), 0.9, 0.6);
    
    particle.material.color.copy(color);
    
    // Optional: Adjust opacity based on age or speed
    // particle.material.opacity = 0.5 + ratio * 0.5; 
}

// Helper function to reset particle state (position, velocity, age, etc.)
function resetParticle(particle, fan_height, fan_radius, room_width, room_length, room_height, rpm, cfm, diameter) {
    // Reset particle with improved distribution logic based on CFD principles
    // Prioritize resetting near fan intake area for better continuity
    const resetType = Math.random();
    const direction = rotationDirection.value === 'forward' ? -1 : 1;

    if (resetType < 0.6) { 
        // Reset near fan intake (above in forward, below in reverse)
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * fan_radius * 1.5; // Slightly wider area
        const verticalOffset = direction < 0 ? 0.5 + Math.random() * 0.5 : -0.5 - Math.random() * 0.5;
        
        particle.position.x = Math.cos(angle) * distance;
        particle.position.z = Math.sin(angle) * distance;
        particle.position.y = fan_height + verticalOffset;
        
        // Initialize velocity towards fan blades
        initializeParticleVelocity(particle, fan_height, rpm, cfm, diameter);
        // Add slight pull towards blades
        particle.velocity.y += direction * 0.01;
        
    } else if (resetType < 0.8) {
        // Reset near walls (upper half) to represent return flow
        const wallSelection = Math.random();
        let x, z;
        if (wallSelection < 0.25) { x = -room_width / 2 * 0.9; z = (Math.random() - 0.5) * room_length; }
        else if (wallSelection < 0.5) { x = room_width / 2 * 0.9; z = (Math.random() - 0.5) * room_length; }
        else if (wallSelection < 0.75) { x = (Math.random() - 0.5) * room_width; z = -room_length / 2 * 0.9; }
        else { x = (Math.random() - 0.5) * room_width; z = room_length / 2 * 0.9; }
        
        particle.position.x = x;
        particle.position.z = z;
        particle.position.y = room_height * 0.5 + Math.random() * room_height * 0.5;
        
        // Initialize velocity moving away from wall, towards fan intake
        initializeParticleVelocity(particle, fan_height, rpm, cfm, diameter);
        
    } else {
        // Reset randomly within the room (less frequent)
        particle.position.x = (Math.random() - 0.5) * room_width * 0.9;
        particle.position.z = (Math.random() - 0.5) * room_length * 0.9;
        particle.position.y = Math.random() * room_height;
        initializeParticleVelocity(particle, fan_height, rpm, cfm, diameter);
    }

    // Reset age and lifetime
    particle.age = 0;
    particle.lifetime = 100 + Math.floor(Math.random() * 150);
    
    // Reset trail
    particle.trail = [];
}
