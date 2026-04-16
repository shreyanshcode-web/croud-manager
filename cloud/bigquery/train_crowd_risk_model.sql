CREATE OR REPLACE MODEL `crowd_ai.crowd_risk_model`
OPTIONS (
  MODEL_TYPE = 'BOOSTED_TREE_CLASSIFIER',
  INPUT_LABEL_COLS = ['incident_within_15m'],
  AUTO_CLASS_WEIGHTS = TRUE,
  EARLY_STOP = TRUE,
  ENABLE_GLOBAL_EXPLAIN = TRUE,
  DATA_SPLIT_METHOD = 'AUTO_SPLIT',
  MAX_ITERATIONS = 30
) AS
SELECT
  avg_gate_wait,
  avg_gate_utilization,
  restricted_gate_ratio,
  queue_pressure,
  avg_section_density,
  critical_section_ratio,
  avg_concession_wait,
  restroom_pressure,
  parking_utilization,
  predicted_arrival_load,
  blocked_exit_count,
  safety_score,
  attendance_percent,
  net_parking_inflow,
  incident_within_15m
FROM `crowd_ai.training_crowd_events`
WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 180 DAY);

SELECT
  *
FROM ML.EVALUATE(MODEL `crowd_ai.crowd_risk_model`);

SELECT
  event_timestamp,
  venue_id,
  predicted_incident_within_15m_probs,
  predicted_incident_within_15m
FROM ML.PREDICT(
  MODEL `crowd_ai.crowd_risk_model`,
  (
    SELECT
      event_timestamp,
      venue_id,
      avg_gate_wait,
      avg_gate_utilization,
      restricted_gate_ratio,
      queue_pressure,
      avg_section_density,
      critical_section_ratio,
      avg_concession_wait,
      restroom_pressure,
      parking_utilization,
      predicted_arrival_load,
      blocked_exit_count,
      safety_score,
      attendance_percent,
      net_parking_inflow
    FROM `crowd_ai.live_feature_view`
  )
);
