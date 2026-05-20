import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { Metrics } from "@aws-lambda-powertools/metrics";

// POWERTOOLS_SERVICE_NAME, POWERTOOLS_METRICS_NAMESPACE, and LOG_LEVEL
// are picked up automatically from environment variables - no hardcoding needed.
// Set them in your Terraform/SAM/CDK configuration.

export const logger = new Logger({
  persistentLogAttributes: {
    environment: process.env.ENVIRONMENT ?? "dev",
    version: process.env.AWS_LAMBDA_FUNCTION_VERSION,
  },
});

export const tracer = new Tracer();

export const metrics = new Metrics({
  defaultDimensions: { environment: process.env.ENVIRONMENT ?? "dev" },
});
