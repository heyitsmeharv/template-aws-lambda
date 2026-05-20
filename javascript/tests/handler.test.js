import { vi, describe, it, expect, beforeEach } from "vitest";

// vi.hoisted runs before imports, so mockSend is available inside the mock factory below.
const mockSend = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: vi.fn(() => ({ send: mockSend })),
  GetItemCommand: vi.fn(),
}));

// captureAWSv3Client runs at module load (outside handler), so the mock must pass
// the client through - otherwise ddb is undefined when the handler runs.
vi.mock("@aws-lambda-powertools/tracer", () => ({
  Tracer: vi.fn(() => ({
    captureAWSv3Client: (client) => client,
    putAnnotation: vi.fn(),
  })),
}));

vi.mock("@aws-lambda-powertools/logger", () => ({
  Logger: vi.fn(() => ({
    appendKeys: vi.fn(),
    info: vi.fn(),
  })),
}));

vi.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: vi.fn(() => ({ addMetric: vi.fn() })),
  MetricUnit: { Count: "Count", Milliseconds: "Milliseconds" },
}));

import { lambdaHandler } from "../src/handler.js";

beforeEach(() => {
  mockSend.mockReset();
});

/** @param {string | undefined} id */
const makeEvent = (id) => ({
  pathParameters: id ? { id } : null,
  body: null,
  headers: {},
  httpMethod: "GET",
  isBase64Encoded: false,
  path: "/orders",
  queryStringParameters: null,
  requestContext: {},
  resource: "",
});

describe("lambdaHandler", () => {
  it("returns 200 with item on happy path", async () => {
    mockSend.mockResolvedValueOnce({ Item: { id: { S: "order-1" } } });

    const response = await lambdaHandler(makeEvent("order-1"));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ id: { S: "order-1" } });
  });

  it("returns 400 when path parameter id is missing", async () => {
    const response = await lambdaHandler(makeEvent());

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: "Missing path parameter: id",
    });
  });

  it("propagates DynamoDB errors", async () => {
    mockSend.mockRejectedValueOnce(new Error("DynamoDB unavailable"));

    await expect(lambdaHandler(makeEvent("order-2"))).rejects.toThrow(
      "DynamoDB unavailable",
    );
  });
});
