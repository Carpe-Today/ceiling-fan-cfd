// Enhanced Particle Animation Logic
// Based on CFD principles and visualization design

// Updates the positions and properties of particles based on physics
function updateEnhancedParticles(particles, simParams, isMobile, deltaTime) {

    // --- Validate deltaTime --- 
    if (!isFinite(deltaTime) || deltaTime <= 0) {
        console.warn(`Invalid deltaTime detected: ${deltaTime}. Skipping particle updates for this frame.`);
        return; // Skip updates if deltaTime is invalid
    }

    const room_width = simParams.roomWidth;
    const room_length = simParams.roomLength;
    const room_height = simParams.roomHeight;
    const fan_height_from_floor = simParams.fanHeight;
    const diameter = simParams.fanDiameter;
    const radius = diameter / 2;
    const rpm = simParams.fanRPM;
    const speedFactor = rpm / 200;
    const direction = simParams.rotationDirection === 'forward' ? -1 : 1;
    const cfm = simParams.fanCFM;
    const cfmFactor = cfm / 5000;
    
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1;
    
    // Max velocity for color mapping
    const maxVelocity = 0.15 * (1 + speedFactor * 0.5); // Adjust based on expected max speed
    
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue;
        
        const particle = particles[i];

        // --- Validate Velocity Before Update ---
        if (!particle.velocity || !isFinite(particle.velocity.x) || !isFinite(particle.velocity.y) || !isFinite(particle.velocity.z)) {
            console.warn(`Invalid velocity detected for particle ${i} before update. Resetting velocity.`, particle.velocity);
            particle.velocity = new THREE.Vector3(0, 0, 0); // Reset to zero vector
        }
        
        // --- CFD Principle: Apply Forces (Simplified Pressure/Entrainment) ---
        applyForces(particle, fan_height_from_floor, radius, direction, speedFactor);

        // --- Validate Velocity After Forces ---
        if (!isFinite(particle.velocity.x) || !isFinite(particle.velocity.y) || !isFinite(particle.velocity.z)) {
            console.warn(`Invalid velocity detected for particle ${i} after applying forces. Resetting velocity.`, particle.velocity);
            particle.velocity.set(0, 0, 0); // Reset to zero vector
        }
        
        // --- Update Position based on Velocity ---
        const deltaX = particle.velocity.x * deltaTime * 60; // Scale by deltaTime
        const deltaY = particle.velocity.y * deltaTime * 60;
        const deltaZ = particle.velocity.z * deltaTime * 60;

        // --- Validate Position Change ---
        if (!isFinite(deltaX) || !isFinite(deltaY) || !isFinite(deltaZ)) {
            console.warn(`Invalid position change detected for particle ${i}. Skipping position update.`, {deltaX, deltaY, deltaZ});
        } else {
            particle.position.x += deltaX;
            particle.position.y += deltaY;
            particle.position.z += deltaZ;
        }

        // --- Validate Position After Update ---
        if (!isFinite(particle.position.x) || !isFinite(particle.position.y) || !isFinite(particle.position.z)) {
            console.warn(`Invalid position detected for particle ${i} after update. Resetting particle.`, particle.position);
            resetParticle(particle, simParams); // Reset the particle entirely
            continue; // Skip remaining updates for this particle in this frame
        }
        
        // --- CFD Principle: Boundary Layer Effects & Wall Interaction ---
        handleBoundaryCollisions(particle, room_width, room_length, room_height, direction, speedFactor);

        // --- Validate Position After Collisions ---
        if (!isFinite(particle.position.x) || !isFinite(particle.position.y) || !isFinite(particle.position.z)) {
            console.warn(`Invalid position detected for particle ${i} after collisions. Resetting particle.`, particle.position);
            resetParticle(particle, simParams); // Reset the particle entirely
            continue; // Skip remaining updates for this particle in this frame
        }
        
        // --- Visualization: Update Particle Trails (Data only, rendering elsewhere) ---
        // Ensure position is valid before adding to trail
        if (isFinite(particle.position.x) && isFinite(particle.position.y) && isFinite(particle.position.z)) {
            updateTrailData(particle);
        } else {
             console.warn(`Skipping trail update for particle ${i} due to invalid position.`, particle.position);
        }
        
        // --- Visualization: Velocity-Based Color Coding (Data/State only, rendering elsewhere) ---
        // updateParticleColor(particle, maxVelocity); // Color update logic moved to index.html or advanced_effects.js
        
        // --- Increment Age ---
        particle.age += 1;
        
        // --- CFD Principle: Conservation of Mass/Continuity (Reset Logic) ---
        if (particle.age > particle.lifetime) {
            resetParticle(particle, simParams); // Pass simParams
        }
    }
}

// Helper function to apply simplified forces (pressure gradient, entrainment)
function applyForces(particle, fan_height, fan_radius, direction, speedFactor) {
    // Simplified Entrainment: Pull particles towards the main jet
    const dx = particle.position.x;
    const dz = particle.position.z;
    const horizontalDistanceSq = dx*dx + dz*dz;
    const verticalDistance = particle.position.y - fan_height;
    const entrainmentStrength = 0.0005 * speedFactor;
    const epsilon = 1e-6; // Small value to prevent division by zero

    if (horizontalDistanceSq > epsilon) { // Check if particle is not exactly at the center axis
        const horizontalDistance = Math.sqrt(horizontalDistanceSq);
        const normalizedPull = new THREE.Vector3(-dx / horizontalDistance, 0, -dz / horizontalDistance);
        
        if (direction < 0) { // Forward mode (downward jet)
            if (verticalDistance < 0 && horizontalDistance < fan_radius * 2) { // Below fan, near jet
                // Pull towards center axis
                const pullForce = normalizedPull.multiplyScalar(entrainmentStrength);
                particle.velocity.add(pullForce);
                // Accelerate downwards slightly
                particle.velocity.y -= entrainmentStrength * 0.5;
            }
        } else { // Reverse mode (upward jet)
             if (verticalDistance > 0 && horizontalDistance < fan_radius * 2) { // Above fan, near jet
                // Pull towards center axis
                const pullForce = normalizedPull.multiplyScalar(entrainmentStrength);
                particle.velocity.add(pullForce);
                // Accelerate upwards slightly
                particle.velocity.y += entrainmentStrength * 0.5;
            }
        }

        // Simplified Pressure Gradient: Weak pull towards fan intake
        const intakeStrength = 0.0003 * speedFactor;
        if (direction < 0 && verticalDistance > 0) { // Forward mode, above fan
            const pullToCenter = normalizedPull.multiplyScalar(intakeStrength);
            particle.velocity.add(pullToCenter);
            particle.velocity.y -= intakeStrength * 0.2; // Slight downward pull
        } else if (direction > 0 && verticalDistance < 0) { // Reverse mode, below fan
            const pullToCenter = normalizedPull.multiplyScalar(intakeStrength);
            particle.velocity.add(pullToCenter);
            particle.velocity.y += intakeStrength * 0.2; // Slight upward pull
        }
    }
}

// Helper function for boundary collisions with improved physics
function handleBoundaryCollisions(particle, room_width, room_length, room_height, direction, speedFactor) {
    const damping = 0.6; // Energy loss on collision
    const friction = 0.05; // Slowdown parallel to surface (drag)
    const epsilon = 1e-6; // Small value to prevent division by zero

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
        const horizontalDistanceSq = dx*dx + dz*dz;
        if (horizontalDistanceSq > epsilon) { // Check distance before dividing
            const horizontalDistance = Math.sqrt(horizontalDistanceSq);
            const dirX = dx / horizontalDistance;
            const dirZ = dz / horizontalDistance;
            const dirFactor = direction < 0 ? 1 : -1;
            particle.velocity.x += dirFactor * dirX * floorWashStrength;
            particle.velocity.z += dirFactor * dirZ * floorWashStrength;
        }
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
        const horizontalDistanceSq = dx*dx + dz*dz;
        if (horizontalDistanceSq > epsilon) { // Check distance before dividing
            const horizontalDistance = Math.sqrt(horizontalDistanceSq);
            const dirX = dx / horizontalDistance;
            const dirZ = dz / horizontalDistance;
            const dirFactor = direction < 0 ? -1 : 1;
            particle.velocity.x += dirFactor * dirX * ceilingFlowStrength;
            particle.velocity.z += dirFactor * dirZ * ceilingFlowStrength;
        }
    }
}

// Helper function to update particle trail data (positions)
function updateTrailData(particle) {
    // Add current position to trail
    particle.trail.push(particle.position.clone());
    
    // Remove oldest point if trail is too long
    if (particle.trail.length > particle.trailLength) {
        particle.trail.shift();
    }
}

// Helper function to reset particle state (position, velocity, age, etc.)
function resetParticle(particle, simParams) { // Accept simParams
    const fan_height = simParams.fanHeight;
    const fan_radius = simParams.fanDiameter / 2;
    const room_width = simParams.roomWidth;
    const room_length = simParams.roomLength;
    const room_height = simParams.roomHeight;
    const direction = simParams.rotationDirection === 'forward' ? -1 : 1;

    // Reset particle with improved distribution logic based on CFD principles
    // Prioritize resetting near fan intake area for better continuity
    const resetType = Math.random();
    let x, y, z;

    if (resetType < 0.6) { 
        // Reset near fan intake (above in forward, below in reverse)
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * fan_radius * 1.5; // Slightly wider area
        const verticalOffset = direction < 0 ? 0.5 + Math.random() * 0.5 : -0.5 - Math.random() * 0.5;
        
        x = Math.cos(angle) * distance;
        z = Math.sin(angle) * distance;
        y = fan_height + verticalOffset;
        
    } else if (resetType < 0.8) {
        // Reset near walls (upper half) to represent return flow
        const wallSelection = Math.random();
        if (wallSelection < 0.25) { x = -room_width / 2 * 0.9; z = (Math.random() - 0.5) * room_length; }
        else if (wallSelection < 0.5) { x = room_width / 2 * 0.9; z = (Math.random() - 0.5) * room_length; }
        else if (wallSelection < 0.75) { x = (Math.random() - 0.5) * room_width; z = -room_length / 2 * 0.9; }
        else { x = (Math.random() - 0.5) * room_width; z = room_length / 2 * 0.9; }
        
        y = room_height * 0.5 + Math.random() * room_height * 0.5;
        
    } else {
        // Reset randomly within the room (less frequent)
        x = (Math.random() - 0.5) * room_width * 0.9;
        z = (Math.random() - 0.5) * room_length * 0.9;
        y = Math.random() * room_height;
    }

    // Validate calculated position before assigning
    if (isFinite(x) && isFinite(y) && isFinite(z)) {
        particle.position.set(x, y, z);
    } else {
        console.warn("NaN detected during particle reset position calculation. Resetting to center.");
        particle.position.set(0, fan_height, 0); // Default safe position
    }

    // Initialize velocity - initializeParticleVelocity already ensures finite values
    initializeParticleVelocity(particle, simParams); // Pass simParams
    
    // Add slight pull towards blades if reset near intake
    if (resetType < 0.6) {
        particle.velocity.y += direction * 0.01;
        // Ensure velocity is still finite after adjustment
        particle.velocity.y = isFinite(particle.velocity.y) ? particle.velocity.y : 0;
    }

    // Reset age and lifetime
    particle.age = 0;
    particle.lifetime = 100 + Math.floor(Math.random() * 150);
    
    // Reset trail
    particle.trail = [];
}

// Note: initializeParticleVelocity needs to be defined, presumably in enhanced_particles.js
// Ensure it accepts (particle, simParams) as arguments.
