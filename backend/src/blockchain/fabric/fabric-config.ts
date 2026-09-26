import dotenv from 'dotenv';
dotenv.config();

export interface FabricConfigOptions {
  channelName: string;
  chaincodeName: string;
  mspId: string;
  peerEndpoint: string;
  peerHostAlias: string;
  cryptoPath: string;
  tlsCertPath?: string;
  certPath?: string;
  keyPath?: string;
  useMockLedger: boolean;
}

export const fabricConfig: FabricConfigOptions = {
  channelName: process.env.FABRIC_CHANNEL_NAME || 'audit-channel',
  chaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'audit-contract',
  mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
  peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051',
  peerHostAlias: process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.org1.example.com',
  cryptoPath: process.env.FABRIC_CRYPTO_PATH || '../../blockchain-network/network/organizations/peerOrganizations/org1.example.com',
  tlsCertPath: process.env.FABRIC_TLS_CERT_PATH,
  certPath: process.env.FABRIC_USER_CERT_PATH,
  keyPath: process.env.FABRIC_USER_KEY_PATH,
  // If not explicitly set to 'false', enable resilient mode when peer is unreachable
  useMockLedger: process.env.FABRIC_FORCE_MOCK === 'true' || !process.env.FABRIC_PEER_ENDPOINT,
};
