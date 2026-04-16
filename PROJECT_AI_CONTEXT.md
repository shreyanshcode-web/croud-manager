# Project AI Context

This file is the working context for SmartVenue AI. If we continue this project later, use this as the source of truth.

## Project goal

Build a crowd-management system that feels competition-ready in public demos and scores well under AI code analysis for:

- Instructions
- Code Quality
- Security
- Efficiency
- Testing
- Accessibility
- Google Services

## Current product

- Frontend stack: React + Vite
- Product shape: venue operations dashboard
- Core domain: crowd flow, gate congestion, section density, parking load, transport arrival, emergency readiness
- Current data source: local simulator

## Standout product idea

The project should not be just a dashboard. It should be a predictive operations system.

Primary differentiator:

- Predict crowd pressure 15 minutes ahead
- Explain why the model is worried
- Recommend the next best operational action
- Show a clear Google Cloud deployment path

## ML strategy

### Phase 1: Local demo model

Use an interpretable scoring model in the frontend so the project already behaves like an intelligent system:

- Gate pressure
- Section density pressure
- Amenity congestion
- Mobility and arrival surge pressure
- Safety drag
- Short-term momentum or trend pressure

This is implemented in `src/ml/crowdIntelligence.js`.

### Phase 2: Google Cloud production model

Promote the local feature set into cloud training and inference:

1. Ingest live events into `Pub/Sub`
2. Stream or batch features into `BigQuery`
3. Train incident-risk and wait-time models with `BigQuery ML`
4. Deploy advanced inference or Gemini-powered operator summaries with `Vertex AI`
5. Serve predictions from `Cloud Run`
6. Sync live dashboard state through `Firestore`
7. Protect operators with `Identity Platform` and Google sign-in

## Google Cloud services to emphasize

These are the services that should make the project stand out:

- `Vertex AI`
  Use for advanced prediction, Gemini-generated operator summaries, and future multimodal extensions.
- `BigQuery ML`
  Use for SQL-first model training and evaluation on historical crowd data.
- `Pub/Sub`
  Use for real-time event ingestion from gates, parking systems, transport feeds, and mobile telemetry.
- `Cloud Run`
  Use for prediction APIs and orchestration without managing infrastructure.
- `Firestore`
  Use for live dashboard updates and operator collaboration state.
- `Identity Platform`
  Use for Google sign-in, MFA, custom claims, and operator access control.
- `Secret Manager`
  Use for API keys, model secrets, and secure service configuration.
- `Cloud Armor`
  Use for WAF, rate limiting, and public edge protection for Cloud Run behind load balancing.
- `Cloud Logging` and `Cloud Monitoring`
  Use for operational visibility and alerting.

Optional stretch service:

- `Vertex AI Vision`
  Add later if camera-based crowd estimation becomes part of the project.

## Evaluation-focused engineering rules

### Code Quality

- Keep ML logic in pure functions
- Prefer small modules over huge components
- Make prediction output explainable, not opaque

### Security

- Never expose secrets in the frontend
- Keep all future GCP credentials in `Secret Manager`
- Use Google sign-in plus role checks for the operations page
- Enforce MFA for privileged operator roles in production
- Treat the frontend model as demo-safe only

### Efficiency

- Compute risk snapshots once per simulation tick
- Reuse derived intelligence across views
- Keep the local model lightweight and deterministic

### Testing

- Maintain unit tests for scoring logic and recommendation routing
- Add regression tests whenever a scoring formula changes

### Accessibility

- Keep status text readable without relying on color alone
- Use descriptive labels for risk, confidence, and actions
- Preserve responsive layouts for mobile and desktop

## Immediate build roadmap

1. Keep improving the local predictive engine and its tests
2. Add a lightweight backend on `Cloud Run`
3. Store telemetry in `BigQuery`
4. Train the first `BigQuery ML` model
5. Add `Vertex AI` summarization for operator briefings
6. Publish live state through `Firestore`
7. Enforce operator auth with `Identity Platform`
8. Put Cloud Run behind `Cloud Armor`

## Cloud assets already added

- `cloud/bigquery/train_crowd_risk_model.sql`
- `cloud/pubsub/crowd_event_schema.json`
- `cloud/security/security_blueprint.md`
- `cloud/security/firestore.rules`
- `cloud/security/cloud_armor_policy.yaml`

## Official references

- Vertex AI overview: https://docs.cloud.google.com/vertex-ai/docs/start/introduction-unified-platform?hl=en
- BigQuery ML intro: https://docs.cloud.google.com/bigquery/docs/bigqueryml-intro
- BigQuery ML evaluation: https://docs.cloud.google.com/bigquery/docs/evaluate-overview
- Pub/Sub overview: https://docs.cloud.google.com/pubsub/docs/overview
- Cloud Run overview: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
- Firestore overview: https://docs.cloud.google.com/firestore/native/docs/overview
- Identity Platform docs: https://cloud.google.com/identity-platform/docs
- Identity Platform authentication concepts: https://docs.cloud.google.com/identity-platform/docs/concepts-authentication
- Secret Manager overview: https://docs.cloud.google.com/secret-manager/docs/overview
- Cloud Armor overview: https://docs.cloud.google.com/armor/docs/cloud-armor-overview
