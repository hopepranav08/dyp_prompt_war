#!/usr/bin/env bash
# Builds with Cloud Build and deploys to Cloud Run.
# Gemini runs on Vertex AI through the service account, so no AI key is needed.
# The Maps server key comes from Secret Manager. The browser Maps key is public by design
# (it is locked by HTTP referrer and API restrictions) and is passed as a plain env var.
set -euo pipefail

PROJECT="${PROJECT:-prompt-war-dypcoei}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-promptwars-app}"
BROWSER_KEY="$(grep -E '^VITE_MAPS_BROWSER_KEY=' .env | cut -d= -f2-)"

gcloud run deploy "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --source . \
  --allow-unauthenticated \
  --memory 1Gi --cpu 1 --concurrency 40 --min-instances 0 --max-instances 5 --timeout 120 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT,GOOGLE_CLOUD_LOCATION=global,GEMINI_MODEL=gemini-3.7-flash,REPORT_STORE=firestore,VITE_MAPS_BROWSER_KEY=$BROWSER_KEY" \
  --set-secrets "MAPS_SERVER_KEY=maps-server-key:latest" \
  --quiet
