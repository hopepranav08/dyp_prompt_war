#!/usr/bin/env bash
# Builds with Cloud Build and deploys to Cloud Run.
# Gemini runs on Vertex AI through the service account, so no AI key is needed.
# The Maps server key comes from Secret Manager. The browser key is public by design
# (locked to Maps JS + Identity Platform and to the app's HTTP referrers).
#
#   bash scripts/deploy.sh              # deploy and serve 100% of traffic
#   TAG=preview bash scripts/deploy.sh  # deploy a private preview URL with no traffic (safe QA)
#   gcloud run services update-traffic promptwars-app --region asia-south1 --to-latest   # promote
set -euo pipefail

PROJECT="${PROJECT:-prompt-war-dypcoei}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-promptwars-app}"
BROWSER_KEY="$(grep -E '^VITE_MAPS_BROWSER_KEY=' .env | cut -d= -f2-)"
TRAFFIC_FLAGS=()
if [[ -n "${TAG:-}" ]]; then TRAFFIC_FLAGS=(--no-traffic --tag "$TAG"); fi

gcloud run deploy "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --source . \
  --allow-unauthenticated \
  --memory 1Gi --cpu 1 --cpu-boost --concurrency 40 \
  --min-instances 1 --max-instances 10 --timeout 120 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT,GOOGLE_CLOUD_LOCATION=global,GEMINI_MODEL=gemini-3.7-flash,REPORT_STORE=firestore,VITE_MAPS_BROWSER_KEY=$BROWSER_KEY" \
  --set-secrets "MAPS_SERVER_KEY=maps-server-key:latest" \
  "${TRAFFIC_FLAGS[@]}" \
  --quiet
