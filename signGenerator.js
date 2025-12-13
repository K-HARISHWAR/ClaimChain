const { ethers } = require("ethers");
const readlineSync = require("readline-sync");

async function main() {
    console.log("\n--- Ethereum Signature Generator (Remix Compatible) ---");

    // 1️⃣ Read inputs
    const privateKey = readlineSync
        .question("Enter signer's PRIVATE KEY (0x...): ", {
            hideEchoBack: true
        })
        .trim();

    const payloadHash = readlineSync
        .question("Enter payload hash (bytes32, 0x...): ")
        .trim();

    // 2️⃣ Validate private key
    let wallet;
    try {
        wallet = new ethers.Wallet(privateKey);
    } catch {
        throw new Error("Invalid private key");
    }

    // 3️⃣ Validate payload hash
    if (!ethers.isHexString(payloadHash, 32)) {
        throw new Error("Payload hash must be a valid bytes32 hex");
    }

    // 4️⃣ SIGN THE HASH (Ethereum standard)
    const signature = await wallet.signMessage(
        ethers.getBytes(payloadHash)
    );

    // 5️⃣ Output
    console.log("\n=============================================");
    console.log("✅ SIGNATURE GENERATED (Solidity-Compatible)");
    console.log("=============================================");
    console.log("Signer Address:", wallet.address);
    console.log("Payload Hash:", payloadHash);
    console.log("Signature:", signature);
    console.log("---------------------------------------------");
    console.log("Paste this signature into verifyGovSignature()");
    console.log("=============================================\n");
}

main().catch(err => {
    console.error("\n[FATAL ERROR]", err.message);
});

/*
parcel_vertices = [
    (34.053, -118.245),  # Corner 1
    (34.054, -118.246),  # Corner 2
    (34.0535, -118.247)  # Corner 3
]
    output = "0x74e1398e65ee750aeb401c795f46effef9d8851e3d9a92ae9caa7da7e9b6b1d3"
*/
