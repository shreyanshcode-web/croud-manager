#!/bin/bash
set -e

PROJECT_ID="nth-bounty-477010-h8"
REGION="us-central1"
SERVICE_NAME="crowd-manager"

echo "=============================================="
echo "🚀 Crowd Manager - Automated GCP Deployer 🚀"
echo "=============================================="

echo "[1/3] Enabling required APIs..."
gcloud services enable run.googleapis.com \
  secretmanager.googleapis.com \
  generativelanguage.googleapis.com \
  cloudbuild.googleapis.com \
  --project=$PROJECT_ID

gcloud config set project $PROJECT_ID

echo "[2/3] Setting up IAM permissions..."
PROJECT_NUM=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUM}-compute@developer.gserviceaccount.com"

# Grant Secret accessor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

echo "[3/3] Deploying Fullstack Crowd Manager App to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --project $PROJECT_ID \
  --set-env-vars=NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
  --memory=512Mi \
  --quiet

echo "=============================================="
echo "✅ Crowd Manager Deployment Successful!"
echo "=============================================="
