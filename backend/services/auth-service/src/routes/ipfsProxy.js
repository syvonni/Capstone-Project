const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

/**
 * GET /api/ipfs/:cid
 * Proxy route to fetch IPFS content from local IPFS node
 * This allows accessing local IPFS content via backend (which is accessible via ngrok)
 */
router.get("/:cid", async (req, res) => {
  try {
    const { cid } = req.params;
    const ipfsGateway = process.env.IPFS_API_URL || "http://ipfs:5001";

    // Try to fetch from local IPFS gateway (port 8080 is the gateway, 5001 is the API)
    const gatewayUrl = ipfsGateway.replace(":5001", ":8080");
    const url = `${gatewayUrl}/ipfs/${cid}`;

    const response = await fetch(url);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch IPFS content" });
    }

    // Stream the response
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    response.body.pipe(res);
  } catch (err) {
    console.error("IPFS proxy error:", err);
    res.status(500).json({ error: "Failed to proxy IPFS content" });
  }
});

module.exports = router;
