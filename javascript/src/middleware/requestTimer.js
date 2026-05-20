import { MetricUnit } from "@aws-lambda-powertools/metrics";

export const requestTimer = (metrics) => {
  let start;

  return {
    before: async () => {
      start = Date.now();
    },
    after: async () => {
      metrics.addMetric(
        "RequestDurationMs",
        MetricUnit.Milliseconds,
        Date.now() - start,
      );
    },
    onError: async (request) => {
      metrics.addMetric(
        "RequestDurationMs",
        MetricUnit.Milliseconds,
        Date.now() - start,
      );
      throw request.error;
    },
  };
};
