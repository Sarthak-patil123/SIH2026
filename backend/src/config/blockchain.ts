export const blockchainConfig = {
  peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || "localhost:7051",
  peerHostAlias: process.env.FABRIC_PEER_HOST_ALIAS || "peer0.org1.example.com",
  cryptoPath: process.env.FABRIC_CRYPTO_PATH || "../blockchain-network/network/organizations/peerOrganizations/org1.example.com",
};
