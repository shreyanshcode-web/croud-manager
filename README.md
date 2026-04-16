# SmartVenue AI

SmartVenue AI is a crowd-management dashboard for high-density events. The app simulates live venue operations, scores crowd pressure in real time, and highlights the next 15-minute hotspots that operators should act on first.

## What stands out

- A predictive crowd-intelligence engine scores gate pressure, section density, amenity congestion, mobility load, and safety drag.
- The UI exposes model confidence, forecasted gate wait, predicted attendance, and explainable risk drivers instead of only showing raw telemetry.
- The repo includes a Google Cloud-first implementation path using Identity Platform, BigQuery ML, Vertex AI, Pub/Sub, Cloud Run, Firestore, Secret Manager, and Cloud Armor.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run build
npm run test
```

## Important files

- `src/ml/crowdIntelligence.js`: local predictive model used by the dashboard.
- `src/ml/crowdIntelligence.test.js`: test coverage for the risk-scoring engine.
- `PROJECT_AI_CONTEXT.md`: project context and GCP strategy for future work.
- `cloud/bigquery/train_crowd_risk_model.sql`: BigQuery ML training script for the production-grade model.
- `cloud/pubsub/crowd_event_schema.json`: event contract for live telemetry ingestion.
- `cloud/security/security_blueprint.md`: auth and security architecture notes.
- `cloud/security/firestore.rules`: role-based Firestore rules for operators and admins.
- `cloud/security/cloud_armor_policy.yaml`: example Cloud Armor policy for public ingress.

## Google Cloud direction

- `Pub/Sub`: ingest gate, parking, transport, and section telemetry.
- `BigQuery`: store historical events and features.
- `BigQuery ML`: train interpretable incident-risk models directly in SQL.
- `Vertex AI`: host advanced models and Gemini-generated operator briefings.
- `Cloud Run`: serve prediction and recommendation APIs.
- `Firestore`: publish real-time dashboard state to clients.
- `Identity Platform`: manage operator authentication, MFA, and claims.
- `Secret Manager`: store API keys and service credentials securely.
- `Cloud Armor`: protect public endpoints with WAF and rate limiting.

## Notes

The current app runs fully on the frontend, so the predictive engine is implemented locally first. The `PROJECT_AI_CONTEXT.md` file is the source of truth for evolving this into a full Google Cloud deployment.
