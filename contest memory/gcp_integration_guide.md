# Google Cloud Integration: Express Backend

Here is the step-by-step guide to integrate Google Cloud services into your existing Express backend cleanly, avoiding a project rewrite, while satisfying all production, security, and deployment requirements.

## Step 1: Install Required Dependency
We only need to install the Secret Manager SDK. We will use native `fetch` (available in Node 18+) for the Gemini API call to keep dependencies minimal.

```bash
npm install @google-cloud/secret-manager cors
npm install --save-dev dotenv
```

---

## Step 2: Minimal Code Changes

### A. Secret Manager & Caching Implementation
Create a new file called `gcp-secrets.js` to handle Google Secret Manager securely with built-in caching.

**`src/gcp-secrets.js`** *(NEW FILE)*
```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

// Cache to prevent repeated API calls
const secretCache = {};

async function getSecret(secretName) {
  // Return cached version if it exists
  if (secretCache[secretName]) return secretCache[secretName];

  // In Local Dev, fallback to .env. In Production, GCP Project ID is auto-injected.
  if (process.env.NODE_ENV !== 'production' && process.env[secretName]) {
    return process.env[secretName]; 
  }

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload.data.toString('utf8');
    
    // Save to cache
    secretCache[secretName] = payload;
    return payload;
  } catch (err) {
    console.error(`Failed to fetch secret: ${secretName}`, err);
    throw err;
  }
}

module.exports = { getSecret };
```

### B. Gemini API Integration
Create a dedicated file for your Gemini logic using minimal HTTP fetch.

**`src/gemini-service.js`** *(NEW FILE)*
```javascript
const { getSecret } = require('./gcp-secrets');

async function getCrowdAdvice(trafficLevel, userLocation) {
  const apiKey = await getSecret('GEMINI_API_KEY');
  
  // Direct REST API call (No heavy SDK)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Provide short safety advice (1-2 lines) for a user navigating a crowd. Traffic level: ${trafficLevel}. User is currently at: ${userLocation}. Keep it short and actionable.`
        }]
      }]
    })
  });

  if (!response.ok) throw new Error('Failed to fetch from Gemini');
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

module.exports = { getCrowdAdvice };
```

### C. Update Main Express Server (e.g., `server.js` or `app.js`)
Update your main server file. Look closely at the `+` lines indicating what to add.

**`server.js`** *(EXACT MODIFICATION)*
```javascript
  const express = require('express');
+ const cors = require('cors');
+ const { getSecret } = require('./gcp-secrets');
+ const { getCrowdAdvice } = require('./gemini-service');

  const app = express();

+ // Cloud Run compatibility
+ app.use(cors());
+ app.use(express.json());
  
  // --- Updated Example Endpoints ---
  
  app.get('/traffic', async (req, res) => {
    try {
+     const tomtomKey = await getSecret('TOMTOM_API_KEY');
      // existing traffic logic using tomtomKey...
      res.json({ status: "success", traffic: "high" }); 
    } catch (error) {
      res.status(500).json({ error: 'Traffic service error' });
    }
  });

  app.post('/advice', async (req, res) => {
    try {
      const { trafficLevel, userLocation } = req.body;
+     const advice = await getCrowdAdvice(trafficLevel, userLocation);
      res.json({ advice });
    } catch (error) {
      res.status(500).json({ error: 'AI Advice unavailable' });
    }
  });

+ // Required: Cloud Run passes port via process.env.PORT
+ const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
```

---

## Step 3: Production Dockerfile
Create this at the root of your project. It assumes `npm start` runs your server.

**`Dockerfile`** *(NEW FILE)*
```dockerfile
# Use lightweight Node image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install ONLY production dependencies (ignores devDependencies)
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose port (Cloud Run sets PORT env var automatically)
EXPOSE 8080

# Run the backend
CMD [ "npm", "start" ]
```

---

## Step 4: Deployment Commands

Open your terminal (authenticated with `gcloud auth login`) and run the following in order. Replace `YOUR_PROJECT_ID` with your actual Google Cloud project ID.

### 1. Set Project & Enable APIs
```bash
export PROJECT_ID="YOUR_PROJECT_ID"
gcloud config set project $PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  generativelanguage.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Create Secrets
```bash
# Create TOMTOM_API_KEY
gcloud secrets create TOMTOM_API_KEY --replication-policy="automatic"
echo -n "actual-tomtom-key-here" | gcloud secrets versions add TOMTOM_API_KEY --data-file=-

# Create HERE_API_KEY
gcloud secrets create HERE_API_KEY --replication-policy="automatic"
echo -n "actual-here-key-here" | gcloud secrets versions add HERE_API_KEY --data-file=-

# Create GEMINI_API_KEY
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "actual-gemini-key-here" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### 3. Grant Secret Manager Access to Cloud Run
By default, Cloud Run uses the default compute service account. You must give it permission to read secrets.
```bash
PROJECT_NUM=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUM}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Deploy to Cloud Run (Asia South 1)
```bash
gcloud run deploy crowd-navigation-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID
```

*(Note: The `--source .` flag uses Cloud Build in the background. It reads your Dockerfile automatically, packages the app, handles the container registry, and turns on the Cloud Run service.)*
