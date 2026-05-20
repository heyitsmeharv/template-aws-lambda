# template-aws-lambda

Reference template for AWS Lambda functions using [AWS Lambda Powertools for TypeScript](https://docs.powertools.aws.dev/lambda/typescript/latest/) and [Middy](https://middy.js.org/). Accompanies the blog post at [heyitsmeharv.com/blog/lambda-powertools](https://www.heyitsmeharv.com/blog/lambda-powertools).

---

## Overview

This repo is a **starting point**, not a deployable application. When beginning a new Lambda project:

1. Clone this repo
2. Pick a language directory (`typescript/` or `javascript/`)
3. Swap the handler business logic for your own
4. Copy and adapt the `terraform/` configuration
5. Add service-specific environment variables and IAM permissions

---

## Prerequisites

- Node.js 22
- npm 10+
- Terraform 1.9+ (for deployment)

---

## Choosing a language

| Feature       | TypeScript                    | JavaScript ESM           |
| ------------- | ----------------------------- | ------------------------ |
| Directory     | `typescript/`                 | `javascript/`            |
| Type safety   | Yes (`tsc --noEmit`)          | JSDoc annotations        |
| Source files  | `.ts` (compiled to `.js`)     | `.js` (ESM syntax)       |
| Module format | CommonJS (bundled by esbuild) | ESM (bundled by esbuild) |

---

## Getting started

### TypeScript

```bash
cd typescript
npm install
npm run typecheck   # zero TypeScript errors
npm run lint        # zero ESLint errors
npm run test        # all Vitest tests pass
npm run build       # produces dist/handler.js
```

### JavaScript ESM

```bash
cd javascript
npm install
npm run lint        # zero ESLint errors
npm run test        # all Vitest tests pass
npm run build       # produces dist/handler.js
```

---

## Project structure

```
template-aws-lambda/
├── typescript/
│   ├── src/
│   │   ├── powertools.ts              # Shared Logger, Tracer, Metrics instances
│   │   ├── handler.ts                 # Example APIGatewayProxy handler
│   │   └── middleware/
│   │       └── requestTimer.ts        # Custom timing middleware
│   ├── tests/
│   │   └── handler.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── eslint.config.js
├── javascript/
│   ├── src/
│   │   ├── powertools.js              # Same pattern, ESM syntax
│   │   ├── handler.js
│   │   └── middleware/
│   │       └── requestTimer.js
│   ├── tests/
│   │   └── handler.test.js
│   ├── package.json
│   ├── vitest.config.js
│   └── eslint.config.js
├── terraform/
│   ├── versions.tf
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── .gitignore
└── README.md
```

---

## Powertools & Middy patterns

### `powertools.*`

`Logger`, `Tracer`, and `Metrics` are instantiated once and exported from `powertools.ts` / `powertools.js`. All configuration is driven by environment variables set in Terraform - the file never needs editing between projects:

| Env var                        | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `POWERTOOLS_SERVICE_NAME`      | Service name shown in logs and X-Ray                     |
| `POWERTOOLS_METRICS_NAMESPACE` | CloudWatch Metrics namespace                             |
| `LOG_LEVEL`                    | Logger verbosity (`DEBUG`, `INFO`, `WARN`, `ERROR`)      |
| `ENVIRONMENT`                  | Added as a persistent log attribute and metric dimension |

### Middy middleware chain

```
injectLambdaContext   - structured logging per invocation, clearState prevents key bleed
captureLambdaHandler  - X-Ray segment per invocation, captureResponse: false avoids oversized segments
logMetrics            - flushes EMF metrics, captureColdStartMetric emits ColdStart automatically
requestTimer          - custom middleware: records RequestDurationMs metric
httpJsonBodyParser    - parses JSON request bodies
ssm                   - fetches SSM Parameter Store values before handler runs
httpErrorHandler      - converts thrown HttpErrors to structured JSON responses
```

### What to replace

- Handler business logic in `lambdaHandler`
- DynamoDB key schema and `TABLE_NAME` env var
- SSM parameter paths in `ssm({ fetchData: { ... } })`

### What to keep

- The Middy chain order and all five Powertools options (`clearState`, `captureResponse: false`, `captureColdStartMetric`, etc.)
- `tracer.captureAWSv3Client()` called **outside** the handler (avoids re-registering on warm invocations)
- Exporting both `lambdaHandler` (for tests) and `handler` (Middy-wrapped, for Lambda runtime)

---

## Terraform deployment

```bash
cd typescript   # or javascript
npm run build

cd ../terraform
terraform init
terraform plan -var="function_name=my-service"
terraform apply -var="function_name=my-service"
```

Before running, update `data.archive_file.lambda.source_dir` in `main.tf` to point at your dist directory:

```hcl
# TypeScript
source_dir = "../typescript/dist"

# JavaScript ESM (dist also contains a package.json with "type":"module")
source_dir = "../javascript/dist"
```

Add service-specific environment variables and IAM policies to `main.tf` as needed.
