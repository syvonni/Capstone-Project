/**
 * IPFS Service
 * Handles file uploads and retrieval from IPFS
 * Supports local IPFS node or remote services (Pinata, Infura)
 */

const logger = require("./logger");

let ipfsClient = null;
let pinataClient = null;
let isInitialized = false;
let ipfsModule = null;
let currentProvider = "local";

/**
 * Initialize IPFS client
 */
async function initialize() {
  try {
    const provider = process.env.IPFS_PROVIDER || "local";
    currentProvider = provider;
    const apiUrl = process.env.IPFS_API_URL || "http://127.0.0.1:5001";
    const gatewayUrl =
      process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:8080/ipfs/";

    if (provider === "pinata") {
      // Pinata IPFS service - supports both JWT (modern) and API Key + Secret (legacy)
      const pinataJwt = process.env.PINATA_JWT || process.env.PINATA_JWT_SECRET;
      const pinataApiKey = process.env.PINATA_API_KEY;
      const pinataSecretKey = process.env.PINATA_SECRET_KEY;

      // Prefer JWT authentication (modern method)
      if (pinataJwt) {
        try {
          const pinataSDK = require("@pinata/sdk");
          // Initialize with JWT
          pinataClient = new pinataSDK({ pinataJWTKey: pinataJwt });

          // Test connection
          const testResult = await pinataClient.testAuthentication();
          if (testResult.authenticated) {
            logger.info("IPFS: Pinata authenticated successfully with JWT");
            isInitialized = true;
            return;
          } else {
            throw new Error("Pinata JWT authentication failed");
          }
        } catch (pinataError) {
          logger.error(
            "IPFS: Failed to initialize Pinata with JWT, trying API Key method",
            { error: pinataError.message },
          );
          // Fall through to try API Key + Secret method
        }
      }

      // Fallback to API Key + Secret Key (legacy method)
      if (!pinataClient && pinataApiKey && pinataSecretKey) {
        try {
          const pinataSDK = require("@pinata/sdk");
          pinataClient = new pinataSDK(pinataApiKey, pinataSecretKey);

          // Test connection
          const testResult = await pinataClient.testAuthentication();
          if (testResult.authenticated) {
            logger.info("IPFS: Pinata authenticated successfully with API Key");
            isInitialized = true;
            return;
          } else {
            throw new Error("Pinata API Key authentication failed");
          }
        } catch (pinataError) {
          logger.error(
            "IPFS: Failed to initialize Pinata with API Key, falling back to local node",
            { error: pinataError.message },
          );
        }
      }

      // If both methods failed or no credentials provided, fallback to local node
      if (!pinataClient) {
        logger.warn(
          "IPFS: Pinata credentials not configured or authentication failed, using local node",
        );
        if (!ipfsModule) {
          ipfsModule = await import("ipfs-http-client");
        }
        const { create } = ipfsModule;
        ipfsClient = create({ url: apiUrl });
      }
    } else if (provider === "infura") {
      // Infura IPFS service
      const infuraProjectId = process.env.INFURA_PROJECT_ID;
      const infuraProjectSecret = process.env.INFURA_PROJECT_SECRET;

      if (!infuraProjectId || !infuraProjectSecret) {
        logger.warn(
          "IPFS: Infura credentials not configured, using local node",
        );
        ipfsClient = create({ url: apiUrl });
      } else {
        // Infura IPFS endpoint
        const infuraUrl = `https://ipfs.infura.io:5001/api/v0`;
        ipfsClient = create({
          url: infuraUrl,
          headers: {
            authorization: `Basic ${Buffer.from(`${infuraProjectId}:${infuraProjectSecret}`).toString("base64")}`,
          },
        });
      }
    } else {
      // Local IPFS node (default)
      if (!ipfsModule) {
        ipfsModule = await import("ipfs-http-client");
      }
      const { create } = ipfsModule;
      ipfsClient = create({ url: apiUrl });
    }

    isInitialized = true;
    logger.info("IPFS service initialized", { provider, apiUrl });
  } catch (error) {
    logger.error("Failed to initialize IPFS service", { error: error.message });
    isInitialized = false;
  }
}

/**
 * Check if IPFS is available
 */
function isAvailable() {
  return isInitialized && (ipfsClient !== null || pinataClient !== null);
}

/**
 * Upload file to IPFS
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} fileName - Optional file name
 * @returns {Promise<{cid: string, size: number}>} IPFS CID and file size
 */
async function uploadFile(fileBuffer, fileName = "") {
  if (!isAvailable()) {
    throw new Error("IPFS service is not available");
  }

  try {
    // Use Pinata if configured
    if (currentProvider === "pinata" && pinataClient) {
      const readable = require("stream").Readable.from(fileBuffer);
      const options = {
        pinataMetadata: {
          name: fileName || `file-${Date.now()}`,
        },
        pinataOptions: {
          cidVersion: 1,
        },
      };

      const result = await pinataClient.pinFileToIPFS(readable, options);
      const cid = result.IpfsHash;
      const size = fileBuffer.length;

      logger.info("File uploaded to Pinata IPFS", { cid, size, fileName });
      return { cid, size };
    }

    // Use standard IPFS client (local or Infura)
    const result = await ipfsClient.add(
      {
        path: fileName || `file-${Date.now()}`,
        content: fileBuffer,
      },
      {
        pin: true, // Pin the file to ensure it persists
        cidVersion: 1, // Use CIDv1 for better compatibility
      },
    );

    const cid = result.cid.toString();
    const size = result.size || fileBuffer.length;

    logger.info("File uploaded to IPFS", { cid, size, fileName });
    return { cid, size };
  } catch (error) {
    logger.error("Failed to upload file to IPFS", {
      error: error.message,
      fileName,
    });
    throw error;
  }
}

/**
 * Upload JSON data to IPFS
 * @param {object} data - JSON data to upload
 * @returns {Promise<{cid: string, size: number}>} IPFS CID and data size
 */
async function uploadJSON(data) {
  if (!isAvailable()) {
    throw new Error("IPFS service is not available");
  }

  try {
    const jsonString = JSON.stringify(data);
    const jsonBuffer = Buffer.from(jsonString, "utf8");

    // Use Pinata if configured
    if (currentProvider === "pinata" && pinataClient) {
      const options = {
        pinataMetadata: {
          name: `data-${Date.now()}.json`,
        },
        pinataOptions: {
          cidVersion: 1,
        },
      };

      const result = await pinataClient.pinJSONToIPFS(data, options);
      const cid = result.IpfsHash;
      const size = jsonBuffer.length;

      logger.info("JSON data uploaded to Pinata IPFS", { cid, size });
      return { cid, size };
    }

    // Use standard IPFS client (local or Infura)
    const result = await ipfsClient.add(
      {
        path: `data-${Date.now()}.json`,
        content: jsonBuffer,
      },
      {
        pin: true,
        cidVersion: 1,
      },
    );

    const cid = result.cid.toString();
    const size = result.size || jsonBuffer.length;

    logger.info("JSON data uploaded to IPFS", { cid, size });
    return { cid, size };
  } catch (error) {
    logger.error("Failed to upload JSON to IPFS", { error: error.message });
    throw error;
  }
}

/**
 * Get file from IPFS
 * @param {string} cid - IPFS CID
 * @returns {Promise<Buffer>} File buffer
 */
async function getFile(cid) {
  if (!isAvailable()) {
    throw new Error("IPFS service is not available");
  }

  try {
    // For Pinata, we use the gateway to retrieve files
    if (currentProvider === "pinata" && pinataClient) {
      const axios = require("axios"); // External IPFS gateway calls use axios directly
      const gatewayUrl = getGatewayUrl(cid);
      const response = await axios.get(gatewayUrl, {
        responseType: "arraybuffer",
      });
      const fileBuffer = Buffer.from(response.data);
      logger.info("File retrieved from Pinata IPFS", {
        cid,
        size: fileBuffer.length,
      });
      return fileBuffer;
    }

    // Use standard IPFS client (local or Infura)
    const chunks = [];
    for await (const chunk of ipfsClient.cat(cid)) {
      chunks.push(chunk);
    }

    const fileBuffer = Buffer.concat(chunks);
    logger.info("File retrieved from IPFS", { cid, size: fileBuffer.length });
    return fileBuffer;
  } catch (error) {
    logger.error("Failed to retrieve file from IPFS", {
      error: error.message,
      cid,
    });
    throw error;
  }
}

/**
 * Pin file to IPFS (ensure persistence)
 * @param {string} cid - IPFS CID to pin
 * @returns {Promise<void>}
 */
async function pinFile(cid) {
  if (!isAvailable()) {
    throw new Error("IPFS service is not available");
  }

  try {
    // Pinata automatically pins files on upload, but we can verify
    if (currentProvider === "pinata" && pinataClient) {
      // Pinata pins automatically on upload, but we can add it again if needed
      // This is mostly a no-op for Pinata since files are auto-pinned
      logger.info("File already pinned on Pinata (auto-pinned on upload)", {
        cid,
      });
      return;
    }

    // Use standard IPFS client (local or Infura)
    await ipfsClient.pin.add(cid);
    logger.info("File pinned to IPFS", { cid });
  } catch (error) {
    logger.error("Failed to pin file to IPFS", { error: error.message, cid });
    throw error;
  }
}

/**
 * Unpin file from IPFS
 * @param {string} cid - IPFS CID to unpin
 * @returns {Promise<void>}
 */
async function unpinFile(cid) {
  if (!isAvailable()) {
    throw new Error("IPFS service is not available");
  }

  try {
    // Use Pinata if configured
    if (currentProvider === "pinata" && pinataClient) {
      await pinataClient.unpin(cid);
      logger.info("File unpinned from Pinata IPFS", { cid });
      return;
    }

    // Use standard IPFS client (local or Infura)
    await ipfsClient.pin.rm(cid);
    logger.info("File unpinned from IPFS", { cid });
  } catch (error) {
    logger.error("Failed to unpin file from IPFS", {
      error: error.message,
      cid,
    });
    throw error;
  }
}

/**
 * Get IPFS gateway URL for a CID
 * @param {string} cid - IPFS CID
 * @returns {string} Gateway URL
 */
function getGatewayUrl(cid) {
  // Use Pinata's public gateway if using Pinata
  if (currentProvider === "pinata") {
    // Pinata's public gateway (free, no auth required for reads)
    const pinataGateway =
      process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs/";
    return `${pinataGateway}${cid}`;
  }

  // Use configured gateway or default to local
  const gatewayUrl =
    process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:8080/ipfs/";
  // Ensure gateway URL ends with / if it doesn't already
  const cleanGateway = gatewayUrl.endsWith("/") ? gatewayUrl : `${gatewayUrl}/`;
  return `${cleanGateway}${cid}`;
}

// Auto-initialize on module load (async)
if (process.env.NODE_ENV !== "test") {
  initialize().catch((err) => {
    logger.error("Failed to auto-initialize IPFS service", {
      error: err.message,
    });
  });
}

module.exports = {
  initialize,
  isAvailable,
  uploadFile,
  uploadJSON,
  getFile,
  pinFile,
  unpinFile,
  getGatewayUrl,
};
