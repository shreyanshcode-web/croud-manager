# Google Auth And Security Blueprint

This project should use Google authentication and Google Cloud security controls together.

## Authentication choice

Primary recommendation:

- `Google Identity Services` on the frontend for the sign-in prompt
- `Identity Platform` on Google Cloud for managed authentication, MFA, and tenant-ready operator access

Why this fits:

- Fast web integration for demos
- Clear Google Cloud story for hackathon evaluation
- Easy path to role-based access for operators, supervisors, and admins

## Security services to use

- `Identity Platform`
  Authenticate users, enable Google sign-in, and add MFA for operator accounts.
- `IAM`
  Restrict service-to-service access between Cloud Run, Firestore, BigQuery, Pub/Sub, and Secret Manager.
- `Secret Manager`
  Store Maps keys, Vertex AI credentials, API tokens, and any backend secrets.
- `Cloud Armor`
  Protect the Cloud Run HTTPS endpoint behind the load balancer with WAF and DDoS controls.
- `Cloud Audit Logs`
  Track administrative and data-access activity for incident review.
- `Security Command Center`
  Aggregate security findings and posture issues across the project.

## Recommended architecture

1. User signs in with Google on the landing page
2. Frontend sends the Google/Identity Platform token to `Cloud Run`
3. Cloud Run verifies the token and maps roles with custom claims
4. Live operational state is read from and written to `Firestore`
5. Historical telemetry is streamed into `BigQuery`
6. Secrets are fetched from `Secret Manager`
7. Public ingress is protected by `Cloud Armor`

## Role model

- `viewer`
  Read-only access to dashboards and maps
- `operator`
  Can acknowledge alerts, reroute gates, and manage live incidents
- `supervisor`
  Can trigger escalations and override routing plans
- `admin`
  Can manage policies, tenants, and security settings

## Minimum secure defaults

- Require Google sign-in for the operations page in production
- Enable MFA for supervisor and admin roles
- Keep Maps keys in `Secret Manager` for backend usage
- Use restricted browser keys for any public Maps embed scenario
- Put Cloud Run behind HTTPS load balancing and `Cloud Armor`
- Give Cloud Run only the minimum IAM roles required
- Turn on audit logging for Firestore, Secret Manager, and IAM changes
