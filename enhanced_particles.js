// Enhanced Particle System Implementation
// Based on CFD principles and visualization design

function createEnhancedParticles() {
    // Remove existing particles if any
    for (let i = 0; i < particles.length; i++) {
        scene.remove(particles[i]);
    }
    particles = [];
    
    // Calculate particle count based on room volume with significantly increased density
    const length = parseFloat(roomLength.value);
    const width = parseFloat(roomWidth.value);
    const height = parseFloat(roomHeight.value);
    const room_volume = length * width * height;
    const base_room_volume = 3000;
    const base_particle_count = 5000; // Doubled from 2500 to 5000 for higher density
    
    // Scale particle count with room volume, with higher minimum and maximum limits
    const mobileFactor = isMobile ? 0.5 : 1.0; // Reduced mobile factor for performance
    let particle_count = Math.min(15000 * mobileFactor, Math.max(3000 * mobileFactor, 
        Math.floor(base_particle_count * mobileFactor * (room_volume / base_room_volume))));
    
    particleCountElement.textContent = particle_count;
    
    // Get fan parameters for proper distribution
    const diameter = parseFloat(fanDiameter.value);
    const radius = diameter / 2;
    const fan_height_from_floor = parseFloat(fanHeight.value);
    const cfm = parseFloat(fanCFM.value);
    const rpm = parseFloat(fanRPM.value);
    
    // Create particle geometry with different sizes based on position
    // Base geometry is smaller for higher density without visual clutter
    const baseGeometry = new THREE.SphereGeometry(0.025, 8, 8);
    
    // Create particles with improved distribution
    for (let i = 0; i < particle_count; i++) {
        // Create particle with color that will be modified based on velocity
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00aaff,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(baseGeometry, material);
        
        // Improved distribution: 25% at fan level, 25% at floor level, 
        // 40% stratified from floor to ceiling, 10% near walls for return flow
        const distribution = Math.random();
        
        if (distribution < 0.25) {
            // Fan level particles with improved distribution around blades
            const angle = Math.random() * Math.PI * 2;
            
            // Concentrate more particles near blade tips for better visualization
            // of the high-velocity regions using power distribution
            const distanceFactor = Math.pow(Math.random(), 0.7); // Bias toward outer edge
            const distance = radius * 0.2 + (radius * 0.8 * distanceFactor);
            
            particle.position.x = Math.cos(angle) * distance;
            particle.position.z = Math.sin(angle) * distance;
            particle.position.y = fan_height_from_floor;
            
            // Slightly larger particles at fan for better visibility of initial flow
            particle.scale.set(1.2, 1.2, 1.2);
            
        } else if (distribution < 0.5) {
            // Floor level particles with improved distribution pattern
            // Use concentric rings pattern for better visualization of floor washing
            const ringFactor = Math.random();
            let distance, angle;
            
            if (ringFactor < 0.3) {
                // Inner ring - directly under fan
                distance = Math.random() * radius * 1.2;
            } else if (ringFactor < 0.7) {
                // Middle ring - primary impact zone
                distance = radius * 1.2 + Math.random() * radius * 1.5;
            } else {
                // Outer ring - near walls
                distance = radius * 2.7 + Math.random() * (Math.min(width, length) / 2 - radius * 2.7) * 0.9;
            }
            
            angle = Math.random() * Math.PI * 2;
            particle.position.x = Math.cos(angle) * distance;
            particle.position.z = Math.sin(angle) * distance;
            particle.position.y = 0.05 + Math.random() * 0.1; // Slightly above floor
            
        } else if (distribution < 0.9) {
            // Stratified distribution from floor to ceiling
            // Divide height into 20 sections (increased from 10) for smoother distribution
            const section = Math.floor(Math.random() * 20);
            const sectionHeight = height / 20;
            
            // Horizontal position varies based on height for better circulation visualization
            const heightFactor = section / 20; // 0 at floor, 1 at ceiling
            let x, z;
            
            if (heightFactor < 0.3) {
                // Lower room - particles spread outward
                const distance = (Math.random() * 0.3 + 0.7) * Math.min(width, length) / 2 * 0.9;
                const angle = Math.random() * Math.PI * 2;
                x = Math.cos(angle) * distance;
                z = Math.sin(angle) * distance;
            } else if (heightFactor > 0.7) {
                // Upper room - particles move inward toward fan
                const distance = Math.random() * Math.min(width, length) / 2 * 0.7;
                const angle = Math.random() * Math.PI * 2;
                x = Math.cos(angle) * distance;
                z = Math.sin(angle) * distance;
            } else {
                // Mid room - transitional zone
                x = (Math.random() - 0.5) * width * 0.8;
                z = (Math.random() - 0.5) * length * 0.8;
            }
            
            particle.position.x = x;
            particle.position.z = z;
            particle.position.y = section * sectionHeight + (Math.random() * sectionHeight);
            
        } else {
            // Wall/corner particles for return flow visualization
            // Randomly select a wall or corner
            const wallSelection = Math.random();
            let x, z;
            
            if (wallSelection < 0.25) {
                // Left wall
                x = -width / 2 * 0.95;
                z = (Math.random() - 0.5) * length * 0.9;
            } else if (wallSelection < 0.5) {
                // Right wall
                x = width / 2 * 0.95;
                z = (Math.random() - 0.5) * length * 0.9;
            } else if (wallSelection < 0.75) {
                // Front wall
                x = (Math.random() - 0.5) * width * 0.9;
                z = -length / 2 * 0.95;
            } else {
                // Back wall
                x = (Math.random() - 0.5) * width * 0.9;
                z = length / 2 * 0.95;
            }
            
            // Distribute along wall height with bias toward upper portion
            // for better return flow visualization
            const heightFactor = Math.pow(Math.random(), 0.7); // Bias toward upper portion
            particle.position.x = x;
            particle.position.z = z;
            particle.position.y = height * 0.3 + heightFactor * height * 0.7;
        }
        
        // Initial velocity with improved physics based on CFD principles
        // Direction and magnitude vary based on position
        initializeParticleVelocity(particle, fan_height_from_floor, rpm, cfm, diameter);
        
        // Particle properties for enhanced visualization
        particle.age = Math.floor(Math.random() * 100);
        particle.lifetime = 100 + Math.floor(Math.random() * 150); // Increased max lifetime
        
        // Add trail property for streamline visualization
        particle.trail = [];
        particle.trailLength = 5 + Math.floor(Math.random() * 5); // Variable trail length
        
        // Add to scene
        scene.add(particle);
        particles.push(particle);
    }
}

// Helper function to initialize particle velocity based on position and fan parameters
function initializeParticleVelocity(particle, fan_height, rpm, cfm, diameter) {
    const direction = rotationDirection.value === 'forward' ? -1 : 1;
    const speedFactor = rpm / 200;
    const radius = diameter / 2;
    
    // Calculate distance from fan center (horizontal plane)
    const dx = particle.position.x;
    const dz = particle.position.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    
    // Calculate vertical distance from fan
    const verticalDistance = Math.abs(particle.position.y - fan_height);
    
    // Calculate angle from fan center
    const angle = Math.atan2(dz, dx);
    
    // Base velocity components
    let vx = 0, vy = 0, vz = 0;
    
    // CFM-based velocity scaling - convert CFM to a velocity scale factor
    // Approximate relationship: higher CFM = higher initial velocity
    const cfmFactor = cfm / 5000; // Normalize to a reasonable range
    const baseMagnitude = 0.03 * (0.5 + cfmFactor * 0.5); // Scale base magnitude with CFM
    
    // Different velocity initialization based on position relative to fan
    if (Math.abs(particle.position.y - fan_height) < 0.5 && horizontalDistance < radius * 1.2) {
        // Near fan blades - strong directional velocity with tangential component
        
        // Calculate tangential velocity component based on distance from center and RPM
        const tangentialSpeed = (rpm / 60) * 2 * Math.PI * (horizontalDistance / radius);
        
        // Tangential component (perpendicular to radius)
        const tangentialVx = -Math.sin(angle) * tangentialSpeed * 0.02;
        const tangentialVz = Math.cos(angle) * tangentialSpeed * 0.02;
        
        // Axial component (vertical, from blade pitch)
        // Assume standard blade pitch of ~12-15 degrees
        const pitchFactor = 0.25; // Simplified representation of blade pitch effect
        const axialMagnitude = tangentialSpeed * pitchFactor * 0.04 * (1 + cfmFactor);
        
        // Combine components with direction
        vx = tangentialVx + (Math.random() - 0.5) * 0.01;
        vy = direction * axialMagnitude * (1 - (horizontalDistance / radius) * 0.3);
        vz = tangentialVz + (Math.random() - 0.5) * 0.01;
        
    } else if (particle.position.y < 0.2) {
        // Floor level - radial outward flow in forward mode, inward in reverse
        const dirFactor = direction < 0 ? 1 : -1; // Outward in forward mode, inward in reverse
        const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
        const dirX = dx / (distanceFromCenter + 0.001); // Avoid division by zero
        const dirZ = dz / (distanceFromCenter + 0.001);
        
        // Velocity magnitude decreases with distance from center in forward mode
        const distanceFactor = direction < 0 ? 
            Math.max(0.4, 1 - distanceFromCenter / (Math.min(roomWidth.value, roomLength.value) / 2)) : 
            Math.min(1.5, 0.5 + distanceFromCenter / (Math.min(roomWidth.value, roomLength.value) / 4));
        
        vx = dirFactor * dirX * baseMagnitude * distanceFactor * speedFactor;
        vy = 0.001 + Math.random() * 0.003; // Slight upward component
        vz = dirFactor * dirZ * baseMagnitude * distanceFactor * speedFactor;
        
    } else if (particle.position.y > parseFloat(roomHeight.value) * 0.9) {
        // Ceiling level - radial inward flow in forward mode, outward in reverse
        const dirFactor = direction < 0 ? -1 : 1; // Inward in forward mode, outward in reverse
        const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
        const dirX = dx / (distanceFromCenter + 0.001);
        const dirZ = dz / (distanceFromCenter + 0.001);
        
        // Velocity magnitude increases as particles get closer to fan in forward mode
        const distanceFactor = direction < 0 ? 
            Math.min(1.5, 0.5 + (radius * 2 - Math.min(distanceFromCenter, radius * 2)) / (radius * 2)) : 
            Math.max(0.4, 1 - distanceFromCenter / (Math.min(roomWidth.value, roomLength.value) / 2));
        
        vx = dirFactor * dirX * baseMagnitude * distanceFactor * speedFactor * 0.7; // Slower at ceiling
        vy = -0.001 - Math.random() * 0.002; // Slight downward component
        vz = dirFactor * dirZ * baseMagnitude * distanceFactor * speedFactor * 0.7;
        
    } else {
        // Mid-room - transitional flow
        // Direction depends on height and horizontal position
        const heightRatio = particle.position.y / parseFloat(roomHeight.value);
        const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
        const dirX = dx / (distanceFromCenter + 0.001);
        const dirZ = dz / (distanceFromCenter + 0.001);
        
        if (direction < 0) { // Forward mode
            if (heightRatio < 0.5) {
                // Lower half - generally outward and slightly upward
                vx = dirX * baseMagnitude * speedFactor * 0.5;
                vy = 0.005 + heightRatio * 0.01;
                vz = dirZ * baseMagnitude * speedFactor * 0.5;
            } else {
                // Upper half - generally inward and slightly downward
                vx = -dirX * baseMagnitude * speedFactor * 0.4;
                vy = -0.005 - (1-heightRatio) * 0.01;
                vz = -dirZ * baseMagnitude * speedFactor * 0.4;
            }
        } else { // Reverse mode
            if (heightRatio < 0.5) {
                // Lower half - generally inward and strongly upward
                vx = -dirX * baseMagnitude * speedFactor * 0.5;
                vy = 0.01 + (0.5-heightRatio) * 0.02;
                vz = -dirZ * baseMagnitude * speedFactor * 0.5;
            } else {
                // Upper half - generally outward and slightly downward
                vx = dirX * baseMagnitude * speedFactor * 0.6;
                vy = -0.002 - (heightRatio-0.5) * 0.005;
                vz = dirZ * baseMagnitude * speedFactor * 0.6;
            }
        }
    }
    
    // Add small random component for turbulence
    const turbulenceFactor = 0.005 * speedFactor;
    vx += (Math.random() - 0.5) * turbulenceFactor;
    vy += (Math.random() - 0.5) * turbulenceFactor;
    vz += (Math.random() - 0.5) * turbulenceFactor;
    
    // Set velocity
    particle.velocity = new THREE.Vector3(vx, vy, vz);
    
    // Store original velocity magnitude for color mapping
    particle.originalSpeed = Math.sqrt(vx*vx + vy*vy + vz*vz);
}
