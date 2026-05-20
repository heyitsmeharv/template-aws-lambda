import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";
import ssm from "@middy/ssm";
import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer/middleware";
import { logMetrics } from "@aws-lambda-powertools/metrics/middleware";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, tracer, metrics } from "./powertools";
import { requestTimer } from "./middleware/requestTimer";

// captureAWSv3Client is called outside the handler so it is not re-registered
// on every warm invocation.
const ddb = tracer.captureAWSv3Client(new DynamoDBClient({}));

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const orderId = event.pathParameters?.id;

  if (!orderId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing path parameter: id" }),
    };
  }

  logger.appendKeys({ orderId });
  tracer.putAnnotation("orderId", orderId);
  logger.info("Processing order");
  metrics.addMetric("OrderReceived", MetricUnit.Count, 1);

  // Replace TABLE_NAME with your actual table name environment variable.
  const result = await ddb.send(
    new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: { S: orderId } },
    }),
  );

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item ?? null),
  };
};

// lambdaHandler is exported for direct testing without the Middy stack.
// handler is the Middy-wrapped export used as the Lambda entrypoint.
export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, { clearState: true })) // clearState: true prevents log keys from bleeding across warm invocations
  .use(captureLambdaHandler(tracer, { captureResponse: false })) // captureResponse: false prevents large payloads inflating X-Ray segment size
  .use(logMetrics(metrics, { captureColdStartMetric: true })) // captureColdStartMetric: true auto-emits a ColdStart metric on first invocation
  .use(requestTimer(metrics)) // custom middleware: records RequestDurationMs metric
  .use(httpJsonBodyParser()) // parses JSON request body before handler runs
  .use(ssm({ fetchData: { dbPassword: "/prod/db/password" } })) // Replace with your actual SSM Parameter Store paths
  .use(httpErrorHandler()); // converts thrown HttpErrors into structured JSON responses
