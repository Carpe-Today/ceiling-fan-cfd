// Fan Physics Implementation for CFD Simulation
// Implements proper fan orientation and physics based on CFD principles

// Function to ensure proper fan orientation and physics
function ensureProperFanOrientation() {
    // Get fan parameters
    const room_height = parseFloat(roomHeight.value);
    const fan_height_from_floor = parseFloat(fanHeight.value);
    
    // Verify fan is positioned correctly (not too close to floor or ceiling)
    if (fan_height_from_floor < room_height * 0.5) {
        console.warn("Fan height too low - adjusting to proper height");
        fanHeight.value = (room_height * 0.8).toFixed(1);
        createFan(); // Recreate fan at proper height
    } else if (fan_height_from_floor > room_height * 0.95) {
        console.warn("Fan too close to ceiling - adjusting to proper height");
        fanHeight.value = (room_height * 0.9).toFixed(1);
        createFan(); // Recreate fan at proper height
    }
    
    // Verify blade group is positioned at fan height, not on floor
    if (fan && fan.children.length > 3) {
        const bladeGroup = fan.children[3];
        if (bladeGroup && Math.abs(bladeGroup.position.y - fan_height_from_floor) > 0.1) {
            console.warn("Blade group not at proper height - fixing position");
            bladeGroup.position.y = fan_height_from_floor;
        }
    }
    
    // Verify fan is oriented horizontally (parallel to floor)
    if (fan) {
        // Reset any potential rotation that might have occurred
        fan.rotation.x = 0;
        fan.rotation.z = 0;
        
        // Ensure blade group is also properly oriented
        if (fan.children.length > 3) {
            const bladeGroup = fan.children[3];
            if (bladeGroup) {
                bladeGroup.rotation.x = 0;
                bladeGroup.rotation.z = 0;
            }
        }
    }
}

// Function to apply momentum transfer from fan to particles
function applyFanMomentumTransfer(particles, deltaTime) {
    // Get fan parameters
    const fan_height = parseFloat(fanHeight.value);
    const diameter = parseFloat(fanDiameter.value);
    const radius = diameter / 2;
    const rpm = parseFloat(fanRPM.value);
    const cfm = parseFloat(fanCFM.value);
    const direction = rotationDirection.value === 'forward' ? -1 : 1; // -1 = downward, 1 = upward
    
    // Calculate fan influence zone
    const verticalInfluence = radius * 2; // How far vertically the fan directly influences
    const horizontalInfluence = radius * 1.2; // Horizontal influence zone
    
    // Calculate momentum transfer strength based on fan parameters
    const momentumStrength = (cfm / 5000) * (rpm / 200) * 0.02;
    
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1;
    
    // Apply momentum transfer to particles in fan influence zone
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue;
        
        const particle = particles[i];
        
        // Calculate particle position relative to fan
        const dx = particle.position.x;
        const dz = particle.position.z;
        const horizontalDistance = Math.sqrt(dx*dx + dz*dz);
        const verticalDistance = Math.abs(particle.position.y - fan_height);
        
        // Check if particle is in fan influence zone
        if (horizontalDistance < horizontalInfluence) {
            // Direct fan jet influence (strongest near center, diminishes with distance)
            if (direction < 0 && particle.position.y <= fan_height && verticalDistance < verticalInfluence) {
                // Downward jet (forward rotation)
                const influenceFactor = (1 - horizontalDistance/horizontalInfluence) * (1 - verticalDistance/verticalInfluence);
                particle.velocity.y -= momentumStrength * influenceFactor * deltaTime * 60;
                
                // Add slight outward radial component
                const radialFactor = 0.3 * influenceFactor;
                if (horizontalDistance > 0.001) {
                    particle.velocity.x += (dx / horizontalDistance) * momentumStrength * radialFactor * deltaTime * 60;
                    particle.velocity.z += (dz / horizontalDistance) * momentumStrength * radialFactor * deltaTime * 60;
                }
                
                // Add rotational component (swirl)
                const swirlStrength = 0.2 * influenceFactor * momentumStrength;
                particle.velocity.x += -dz / (horizontalDistance + 0.001) * swirlStrength * deltaTime * 60;
                particle.velocity.z += dx / (horizontalDistance + 0.001) * swirlStrength * deltaTime * 60;
            } 
            else if (direction > 0 && particle.position.y >= fan_height && verticalDistance < verticalInfluence) {
                // Upward jet (reverse rotation)
                const influenceFactor = (1 - horizontalDistance/horizontalInfluence) * (1 - verticalDistance/verticalInfluence);
                particle.velocity.y += momentumStrength * influenceFactor * deltaTime * 60;
                
                // Add slight outward radial component
                const radialFactor = 0.3 * influenceFactor;
                if (horizontalDistance > 0.001) {
                    particle.velocity.x += (dx / horizontalDistance) * momentumStrength * radialFactor * deltaTime * 60;
                    particle.velocity.z += (dz / horizontalDistance) * momentumStrength * radialFactor * deltaTime * 60;
                }
                
                // Add rotational component (swirl) - opposite direction
                const swirlStrength = 0.2 * influenceFactor * momentumStrength;
                particle.velocity.x += dz / (horizontalDistance + 0.001) * swirlStrength * deltaTime * 60;
                particle.velocity.z += -dx / (horizontalDistance + 0.001) * swirlStrength * deltaTime * 60;
            }
        }
        
        // Fan intake effect (weaker, but wider area)
        if (direction < 0 && particle.position.y > fan_height && horizontalDistance < radius * 2.5) {
            // Intake for downward flow (pull from above)
            const intakeFactor = 0.3 * (1 - horizontalDistance/(radius * 2.5));
            
            // Pull towards fan center
            if (horizontalDistance > 0.001) {
                particle.velocity.x -= (dx / horizontalDistance) * momentumStrength * intakeFactor * deltaTime * 60;
                particle.velocity.z -= (dz / horizontalDistance) * momentumStrength * intakeFactor * deltaTime * 60;
            }
            
            // Pull downward
            particle.velocity.y -= momentumStrength * intakeFactor * 0.5 * deltaTime * 60;
        }
        else if (direction > 0 && particle.position.y < fan_height && horizontalDistance < radius * 2.5) {
            // Intake for upward flow (pull from below)
            const intakeFactor = 0.3 * (1 - horizontalDistance/(radius * 2.5));
            
            // Pull towards fan center
            if (horizontalDistance > 0.001) {
                particle.velocity.x -= (dx / horizontalDistance) * momentumStrength * intakeFactor * deltaTime * 60;
                particle.velocity.z -= (dz / horizontalDistance) * momentumStrength * intakeFactor * deltaTime * 60;
            }
            
            // Pull upward
            particle.velocity.y += momentumStrength * intakeFactor * 0.5 * deltaTime * 60;
        }
    }
}

// Function to implement blade tip vortex effects
function applyBladeTipVortexEffects(particles, deltaTime) {
    // Get fan parameters
    const fan_height = parseFloat(fanHeight.value);
    const diameter = parseFloat(fanDiameter.value);
    const radius = diameter / 2;
    const rpm = parseFloat(fanRPM.value);
    const blades_count = parseInt(bladeCount.value);
    const direction = rotationDirection.value === 'forward' ? -1 : 1;
    
    // Calculate current blade positions based on rotation
    const bladePositions = [];
    if (fan && fan.children.length > 3) {
        const bladeGroup = fan.children[3];
        const currentRotation = bladeGroup.rotation.y;
        
        for (let i = 0; i < blades_count; i++) {
            const angle = currentRotation + (i / blades_count) * Math.PI * 2;
            bladePositions.push(angle);
        }
    }
    
    // For mobile, update fewer particles per frame for better performance
    const updateFactor = isMobile ? 3 : 1;
    
    // Apply vortex effects to particles near blade tips
    for (let i = 0; i < particles.length; i++) {
        // On mobile, update only a subset of particles each frame
        if (isMobile && i % updateFactor !== 0) continue;
        
        const particle = particles[i];
        
        // Calculate particle position relative to fan
        const dx = particle.position.x;
        const dz = particle.position.z;
        const horizontalDistance = Math.sqrt(dx*dx + dz*dz);
        const verticalDistance = Math.abs(particle.position.y - fan_height);
        
        // Check if particle is near blade tip region
        if (Math.abs(horizontalDistance - radius) < 0.3 && verticalDistance < 0.3) {
            // Calculate particle angle in polar coordinates
            const particleAngle = Math.atan2(dz, dx);
            
            // Find closest blade
            let minAngleDiff = Math.PI * 2;
            for (let j = 0; j < bladePositions.length; j++) {
                const angleDiff = Math.abs(normalizeAngle(particleAngle - bladePositions[j]));
                minAngleDiff = Math.min(minAngleDiff, angleDiff);
            }
            
            // Apply vortex effect if particle is close to a blade tip
            if (minAngleDiff < 0.3) {
                const vortexStrength = 0.01 * (rpm / 200) * (1 - minAngleDiff / 0.3);
                
                // Add spiral motion
                particle.velocity.x += -dz / (horizontalDistance + 0.001) * vortexStrength * deltaTime * 60;
                particle.velocity.z += dx / (horizontalDistance + 0.001) * vortexStrength * deltaTime * 60;
                
                // Add slight vertical component based on rotation direction
                particle.velocity.y += direction * vortexStrength * 0.5 * deltaTime * 60;
            }
        }
    }
}

// Helper function to normalize angle to range [0, 2π]
function normalizeAngle(angle) {
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
}

// Function to verify fan orientation is correct from multiple viewing angles
function verifyFanOrientation() {
    // Store original camera position
    const originalPosition = camera.position.clone();
    const originalTarget = orbitControls.target.clone();
    
    // Check from multiple angles
    const checkPositions = [
        { pos: new THREE.Vector3(20, 5, 0), target: new THREE.Vector3(0, 5, 0) }, // Side view
        { pos: new THREE.Vector3(0, 5, 20), target: new THREE.Vector3(0, 5, 0) }, // Front view
        { pos: new THREE.Vector3(0, 20, 0.1), target: new THREE.Vector3(0, 0, 0) } // Top view
    ];
    
    // Log verification results
    console.log("Verifying fan orientation from multiple angles:");
    
    for (let i = 0; i < checkPositions.length; i++) {
        // Set camera to check position
        camera.position.copy(checkPositions[i].pos);
        orbitControls.target.copy(checkPositions[i].target);
        orbitControls.update();
        
        // Render scene to update view
        renderer.render(scene, camera);
        
        // Verify fan orientation
        if (fan) {
            console.log(`View ${i+1}: Fan rotation: x=${fan.rotation.x.toFixed(4)}, z=${fan.rotation.z.toFixed(4)}`);
            
            // Check blade group orientation
            if (fan.children.length > 3) {
                const bladeGroup = fan.children[3];
                if (bladeGroup) {
                    console.log(`View ${i+1}: Blade group rotation: x=${bladeGroup.rotation.x.toFixed(4)}, z=${bladeGroup.rotation.z.toFixed(4)}`);
                }
            }
        }
    }
    
    // Restore original camera position
    camera.position.copy(originalPosition);
    orbitControls.target.copy(originalTarget);
    orbitControls.update();
    
    // Render scene with original view
    renderer.render(scene, camera);
    
    console.log("Fan orientation verification complete");
}


// Function to initialize fan physics data
function initializeFanPhysics() {
    // Returns an object to hold physics state, e.g., current rotation
    return {
        currentRotation: 0
    };
}

// Function to apply fan physics (rotation) in the animation loop
function applyFanPhysics(fanObject, physicsData, simParams, deltaTime) {
    if (!fanObject || !physicsData || !simParams) return;

    const rpm = simParams.fanRPM;
    const direction = simParams.rotationDirection === 'forward' ? -1 : 1; // -1 for clockwise (downward), 1 for counter-clockwise (upward)
    
    // Calculate rotation speed in radians per second
    const rotationSpeed = (rpm * 2 * Math.PI) / 60;
    
    // Update current rotation based on speed, direction, and delta time
    physicsData.currentRotation += direction * rotationSpeed * deltaTime;
    
    // Apply rotation to the blade group (assuming it's the 4th child: downrod, motor, hub, bladeGroup)
    if (fanObject.children.length > 3) {
        const bladeGroup = fanObject.children[3];
        if (bladeGroup) {
            bladeGroup.rotation.y = physicsData.currentRotation;
        }
    }
}



// Function to create the 3D fan model
function createFanModel(simParams) {
    const fanGroup = new THREE.Group();
    fanGroup.name = "CeilingFan";

    const fanHeight = simParams.fanHeight;
    const roomHeight = simParams.roomHeight;
    const fanDiameter = simParams.fanDiameter;
    const bladeCount = simParams.bladeCount;
    const downrodLength = simParams.downrodLength; // Assuming this is available in simParams or use a default

    // Materials
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4 });
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.1, roughness: 0.8 });

    // Downrod (from ceiling to motor)
    const rodHeight = Math.max(0.1, roomHeight - fanHeight - 0.5); // Adjust based on motor size
    const rodGeometry = new THREE.CylinderGeometry(0.05, 0.05, rodHeight, 16);
    const downrod = new THREE.Mesh(rodGeometry, metalMaterial);
    downrod.position.y = fanHeight + 0.5 + rodHeight / 2; // Position based on fan height and motor size
    downrod.castShadow = false; // Shadows disabled as per previous request
    downrod.receiveShadow = false;
    fanGroup.add(downrod);

    // Motor Housing
    const motorHeight = 0.4;
    const motorRadius = 0.3;
    const motorGeometry = new THREE.CylinderGeometry(motorRadius, motorRadius, motorHeight, 32);
    const motorHousing = new THREE.Mesh(motorGeometry, metalMaterial);
    motorHousing.position.y = fanHeight + motorHeight / 2; // Position motor just below downrod
    motorHousing.castShadow = false;
    motorHousing.receiveShadow = false;
    fanGroup.add(motorHousing);

    // Blade Hub
    const hubRadius = 0.1;
    const hubHeight = 0.1;
    const hubGeometry = new THREE.CylinderGeometry(hubRadius, hubRadius, hubHeight, 16);
    const bladeHub = new THREE.Mesh(hubGeometry, metalMaterial);
    bladeHub.position.y = fanHeight; // Center of hub at fan height
    bladeHub.castShadow = false;
    bladeHub.receiveShadow = false;
    fanGroup.add(bladeHub);

    // Blade Group (for unified rotation)
    const bladeGroup = new THREE.Group();
    bladeGroup.name = "bladeGroup";
    bladeGroup.position.y = fanHeight; // Blades rotate around the fan height axis
    fanGroup.add(bladeGroup);

    // Blades
    const bladeLength = fanDiameter / 2 - hubRadius;
    const bladeWidth = 0.25;
    const bladeThickness = 0.02;
    const bladeShape = new THREE.Shape();
    // Simple rectangular blade shape for now, can be refined
    bladeShape.moveTo(0, -bladeWidth / 2);
    bladeShape.lineTo(bladeLength, -bladeWidth / 2);
    bladeShape.lineTo(bladeLength, bladeWidth / 2);
    bladeShape.lineTo(0, bladeWidth / 2);
    bladeShape.lineTo(0, -bladeWidth / 2);

    const extrudeSettings = {
        steps: 1,
        depth: bladeThickness,
        bevelEnabled: false
    };

    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    bladeGeometry.translate(hubRadius, 0, -bladeThickness / 2); // Position relative to hub center
    // Add slight pitch angle
    bladeGeometry.rotateY(THREE.MathUtils.degToRad(12)); 

    for (let i = 0; i < bladeCount; i++) {
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        const angle = (i / bladeCount) * Math.PI * 2;
        blade.rotation.y = angle;
        blade.castShadow = false;
        blade.receiveShadow = false;
        bladeGroup.add(blade);
    }

    // Ensure the entire fan group is positioned correctly
    // The components are positioned relative to fanHeight, so the group's base position is (0,0,0)
    // fanGroup.position.y = fanHeight; // This would double the height offset

    return fanGroup;
}

