const h3 = require('h3-js');
const ethers = require('ethers'); // Import the main ethers object
const readlineSync = require('readline-sync'); // For synchronous user input

/**
 * Prompts the user to enter the latitude and longitude for each vertex.
 * Returns a list of [latitude, longitude] pairs.
 */
function getUserCoordinates() {
    const coords = [];
    console.log("\n--- Enter Polygon Coordinates ---");

    let numVertices;
    while (true) {
        const input = readlineSync.question("Enter the total number of vertices (3 or more) for the land parcel: ");
        numVertices = parseInt(input);
        if (numVertices >= 3 && !isNaN(numVertices)) {
            break;
        } else {
            console.log("Must enter at least 3 vertices for a polygon.");
        }
    }

    console.log(`Collecting ${numVertices} (Latitude, Longitude) pairs:`);

    for (let i = 0; i < numVertices; i++) {
        while (true) {
            try {
                const latInput = readlineSync.question(`  Enter Latitude for Vertex ${i + 1}: `);
                const lngInput = readlineSync.question(`  Enter Longitude for Vertex ${i + 1}: `);

                const latitude = parseFloat(latInput);
                const longitude = parseFloat(lngInput);

                if (!isNaN(latitude) && !isNaN(longitude) &&
                    latitude >= -90 && latitude <= 90 &&
                    longitude >= -180 && longitude <= 180) {
                    
                    coords.push([latitude, longitude]);
                    break;
                } else {
                    console.log("Invalid latitude/longitude range. Please check your input.");
                }
            } catch (e) {
                console.log("Invalid input. Please enter a valid number (e.g., 34.0522).");
            }
        }
    }

    return coords;
}

/**
 * Helper to calculate the centroid (geometric center) of a polygon.
 * Used as a fallback for very small polygons.
 */
function getPolygonCentroid(coords) {
    let latSum = 0;
    let lngSum = 0;
    const numPoints = coords.length;

    for (const point of coords) {
        latSum += point[0];
        lngSum += point[1];
    }

    return [latSum / numPoints, lngSum / numPoints];
}

/**
 * Processes the coordinates to create a single, immutable H_Geometry ID.
 * @param {Array<Array<number>>} polygonCoords - List of [lat, lng] pairs.
 * @param {number} resolution - H3 resolution (0-15).
 * @returns {string} The final Keccak-256 hash prefixed with '0x'.
 */
function generateH3GeometryHash(polygonCoords, resolution) {
    let h3Array = []; 
    
    // --- Step 1: Generate Array of H3 Hashes ---
    try {
        const geoJsonBoundary = [polygonCoords]; 
        
        // Attempt Standard Polyfill (Polygon to Cells)
        h3Array = h3.polygonToCells(geoJsonBoundary, resolution);

        // --- IMPROVEMENT: Centroid Fallback ---
        // If the polygon is too small to contain a hexagon center, 
        // find the hexagon that contains the polygon's own center.
        if (h3Array.length === 0) {
            console.log("\n[WARN] Polygon is smaller than a single H3 cell center at this resolution.");
            console.log("[INFO] Switching to 'Centroid Fallback' mode to guarantee a hash...");

            const centroid = getPolygonCentroid(polygonCoords);
            const centerCell = h3.latLngToCell(centroid[0], centroid[1], resolution);
            
            h3Array.push(centerCell);
        }

    } catch (e) {
        console.error(`\n[H3 ERROR] Geospatial calculation failed.`);
        console.error(`Error details: ${e.message}`);
        throw new Error("Invalid polygon data.");
    }

    // CRITICAL: Sort for determinism
    h3Array.sort();
    
    // Concatenate the sorted H3 strings
    const concatenatedH3String = h3Array.join('');

    // --- Step 2: Hash Aggregation to Single ID (Keccak-256) ---
    
    // 1. Convert the string to UTF-8 bytes
    const bytesToHash = ethers.toUtf8Bytes(concatenatedH3String);

    // 2. Compute the Keccak-256 hash
    const hGeometry = ethers.keccak256(bytesToHash); 
    
    console.log(`\n[INFO] Resolution Used: ${resolution}`);
    console.log(`[INFO] Number of H3 Hexagons generated: ${h3Array.length}`);
    
    return hGeometry; 
}


// --- Main Execution Block ---

async function main() {
    console.log("=============================================");
    console.log("    NODE.JS H3 GEOMETRY HASH GENERATOR");
    console.log("=============================================");

    try {
        // 1. Get Polygon Coordinates from User
        const userCoords = getUserCoordinates();
        
        // 2. Get Resolution from User
        let h3Resolution;
        while (true) {
            const input = readlineSync.question("\nEnter H3 Resolution (e.g., 12 for high detail, 0-15): ");
            h3Resolution = parseInt(input);
            if (!isNaN(h3Resolution) && h3Resolution >= 0 && h3Resolution <= 15) {
                break;
            } else {
                console.log("Invalid input. Resolution must be an integer between 0 and 15.");
            }
        }

        // 3. Generate Final Hash
        const finalGeometryId = generateH3GeometryHash(userCoords, h3Resolution);

        if (finalGeometryId) {
            console.log("\n=============================================");
            console.log("✅ SUCCESS: UNIQUE LAND GEOMETRY HASH (Token ID)");
            console.log(`ID to be used in Smart Contract: ${finalGeometryId}`);
            console.log("=============================================");
        }
        
    } catch (e) {
        console.error(`\n[ERROR] Operation failed: ${e.message}`);
    }
}

main();