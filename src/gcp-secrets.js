import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const secretCache = {};

export async function getSecret(secretName) {
  if (secretCache[secretName]) return secretCache[secretName];

  if (process.env.NODE_ENV !== 'production' && process.env[secretName]) {
    return process.env[secretName]; 
  }

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'nth-bounty-477010-h8';
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload.data.toString('utf8');
    
    secretCache[secretName] = payload;
    return payload;
  } catch (err) {
    console.error(`Failed to fetch secret: ${secretName}`, err);
    throw err;
  }
}
