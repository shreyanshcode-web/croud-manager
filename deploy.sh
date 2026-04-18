#!/bin/bash
# =============================================================================
# SmartVenue AI — GCP Deployment Script
# =============================================================================
# Prerequisites:
#   1. gcloud CLI installed and authenticated  →  gcloud auth login
#   2. Docker running (only needed if you want to build locally first)
#   3. Billing enabled on the project
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Optional env overrides before running:
#   PROJECT_ID=my-project REGION=us-east1 ./deploy.sh
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Config — override with environment variables if needed
# ---------------------------------------------------------------------------
PROJECT_ID="${PROJECT_ID:-nth-bounty-477010-h8}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="crowd-manager"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Redis (Memorystore or external — set to a real URL before deploying)
# For a quick demo you can use Upstash free tier: https://upstash.com
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

# Kafka — leave empty to skip Kafka in prod (app degrades gracefully)
KAFKA_BROKERS="${KAFKA_BROKERS:-}"
KAFKA_USERNAME="${KAFKA_USERNAME:-}"
KAFKA_PASSWORD="${KAFKA_PASSWORD:-}"

# Frontend CORS origin — set to your Cloud Run URL after first deploy,
# or set it explicitly here
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
step() { echo ""; echo "▶  $1"; }
ok()   { echo "   ✓ $1"; }

step "Configuring gcloud project"
gcloud config set project "$PROJECT_ID"
ok "Project: $PROJECT_ID  |  Region: $REGION"

# ---------------------------------------------------------------------------
# 1. Enable all required GCP APIs
# ---------------------------------------------------------------------------
step "Enabling GCP APIs (this may take a minute on first run)"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  bigquery.googleapis.com \
  bigquerystorage.googleapis.com \
  pubsub.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  cloudtrace.googleapis.com \
  identitytoolkit.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com \
  --project="$PROJECT_ID" \
  --quiet
ok "APIs enabled"

# ---------------------------------------------------------------------------
# 2. IAM — grant the Cloud Run service account the roles it needs
# ---------------------------------------------------------------------------
step "Configuring IAM permissions"
PROJECT_NUM=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUM}-compute@developer.gserviceaccount.com"

for ROLE in \
  roles/secretmanager.secretAccessor \
  roles/datastore.user \
  roles/bigquery.dataEditor \
  roles/bigquery.jobUser \
  roles/pubsub.publisher \
  roles/logging.logWriter \
  roles/cloudtrace.agent \
  roles/monitoring.metricWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="$ROLE" \
    --quiet >/dev/null
  ok "$ROLE  →  $COMPUTE_SA"
done

# ---------------------------------------------------------------------------
# 3. Create GCP Secrets (skip if they already exist)
# ---------------------------------------------------------------------------
step "Creating Secret Manager secrets (skipped if they already exist)"

create_secret_if_missing() {
  local NAME=$1
  local VALUE=$2
  if gcloud secrets describe "$NAME" --project="$PROJECT_ID" &>/dev/null; then
    ok "Secret '$NAME' already exists — skipping"
  else
    printf '%s' "$VALUE" | gcloud secrets create "$NAME" \
      --data-file=- \
      --replication-policy=automatic \
      --project="$PROJECT_ID" \
      --quiet
    ok "Secret '$NAME' created"
  fi
}

# Gemini API key — prompt if not set
if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo ""
  read -rsp "   Enter your GEMINI_API_KEY (input hidden): " GEMINI_API_KEY
  echo ""
fi
create_secret_if_missing "GEMINI_API_KEY" "$GEMINI_API_KEY"

# Redis password (optional — skip if using no-auth Redis)
if [ -n "${REDIS_PASSWORD:-}" ]; then
  create_secret_if_missing "REDIS_PASSWORD" "$REDIS_PASSWORD"
fi

# Kafka credentials (optional)
if [ -n "$KAFKA_USERNAME" ]; then
  create_secret_if_missing "KAFKA_USERNAME" "$KAFKA_USERNAME"
  create_secret_if_missing "KAFKA_PASSWORD" "$KAFKA_PASSWORD"
fi

# Google Maps API key
if [ -z "${GOOGLE_MAPS_API_KEY:-}" ]; then
  echo ""
  read -rsp "   Enter your GOOGLE_MAPS_API_KEY (input hidden): " GOOGLE_MAPS_API_KEY
  echo ""
fi
create_secret_if_missing "GOOGLE_MAPS_API_KEY" "$GOOGLE_MAPS_API_KEY"

# Google OAuth Client Secret
if [ -z "${GOOGLE_CLIENT_SECRET:-}" ]; then
  echo ""
  read -rsp "   Enter your GOOGLE_CLIENT_SECRET (input hidden): " GOOGLE_CLIENT_SECRET
  echo ""
fi
create_secret_if_missing "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"

# Google OAuth Client ID (Public, for frontend build)
if [ -z "${VITE_GOOGLE_CLIENT_ID:-}" ]; then
  echo ""
  read -p "   Enter your VITE_GOOGLE_CLIENT_ID: " VITE_GOOGLE_CLIENT_ID
fi

# ---------------------------------------------------------------------------
# 4. Create Firestore database (Native mode, if not already created)
# ---------------------------------------------------------------------------
step "Ensuring Firestore database exists"
if gcloud firestore databases describe --project="$PROJECT_ID" &>/dev/null; then
  ok "Firestore already exists"
else
  gcloud firestore databases create \
    --location="$REGION" \
    --project="$PROJECT_ID" \
    --quiet
  ok "Firestore created in $REGION"
fi

# ---------------------------------------------------------------------------
# 5. Create BigQuery dataset (if it doesn't exist)
# ---------------------------------------------------------------------------
step "Ensuring BigQuery dataset crowd_ai exists"
if bq --project_id="$PROJECT_ID" show crowd_ai &>/dev/null; then
  ok "Dataset crowd_ai already exists"
else
  bq --project_id="$PROJECT_ID" mk \
    --dataset \
    --location=US \
    --description="SmartVenue AI crowd event telemetry" \
    crowd_ai
  ok "Dataset crowd_ai created"
fi

# ---------------------------------------------------------------------------
# 6. Create Pub/Sub topics (in addition to Kafka for GCP-native pipeline)
# ---------------------------------------------------------------------------
step "Creating Pub/Sub topics"
for TOPIC in crowd-events crowd-alerts location-updates; do
  if gcloud pubsub topics describe "$TOPIC" --project="$PROJECT_ID" &>/dev/null; then
    ok "Topic '$TOPIC' already exists"
  else
    gcloud pubsub topics create "$TOPIC" --project="$PROJECT_ID" --quiet
    ok "Topic '$TOPIC' created"
  fi
done

# Build the image using cloudbuild.yaml to pass build-args correctly
gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions="_IMAGE=$IMAGE,_VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID:-},_VITE_GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY:-}" \
  --project="$PROJECT_ID" \
  --quiet
ok "Image built and pushed via Cloud Build"

# ---------------------------------------------------------------------------
# 8. Build the env-vars string for Cloud Run
# ---------------------------------------------------------------------------
ENV_VARS="NODE_ENV=production"
ENV_VARS="${ENV_VARS},GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
ENV_VARS="${ENV_VARS},REDIS_URL=${REDIS_URL}"

if [ -n "$KAFKA_BROKERS" ]; then
  ENV_VARS="${ENV_VARS},KAFKA_BROKERS=${KAFKA_BROKERS}"
  ENV_VARS="${ENV_VARS},KAFKA_SSL=true"
fi

# Derive the Cloud Run service URL for CORS if not provided
if [ -z "$ALLOWED_ORIGINS" ]; then
  ALLOWED_ORIGINS="https://${SERVICE_NAME}-$(echo "$PROJECT_NUM" | cut -c1-5)-uc.a.run.app"
fi
ENV_VARS="${ENV_VARS},ALLOWED_ORIGINS=${ALLOWED_ORIGINS}"

# ---------------------------------------------------------------------------
# 9. Deploy to Cloud Run
# ---------------------------------------------------------------------------
step "Deploying to Cloud Run"
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --project="$PROJECT_ID" \
  --set-env-vars="$ENV_VARS" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=30s \
  --quiet

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)")

ok "Deployed: $SERVICE_URL"

# ---------------------------------------------------------------------------
# 10. Update CORS origin to the real service URL
# ---------------------------------------------------------------------------
step "Updating ALLOWED_ORIGINS to real service URL"
gcloud run services update "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --update-env-vars="ALLOWED_ORIGINS=${SERVICE_URL}" \
  --quiet
ok "CORS origin set to $SERVICE_URL"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "  ✅  SmartVenue AI deployed successfully!"
echo "  🌐  URL : $SERVICE_URL"
echo "  📊  Logs: https://console.cloud.google.com/logs?project=$PROJECT_ID"
echo "  🔧  Run : https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "============================================================"
echo ""
echo "  Next steps:"
echo "  1. Open $SERVICE_URL and sign in"
echo "  2. Set VITE_GOOGLE_CLIENT_ID in .env and rebuild if using Google Auth"
echo "  3. Add a Redis URL (Memorystore or Upstash) to REDIS_URL env var"
echo "  4. Add Kafka creds (Confluent Cloud) to KAFKA_BROKERS env var"
echo "  5. Visit Cloud Logging to see structured logs:"
echo "     https://console.cloud.google.com/logs?project=$PROJECT_ID"
echo ""
