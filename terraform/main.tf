provider "aws" {
  region = var.aws_region
}

# ── IAM ────────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "xray" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# AmazonSSMReadOnlyAccess is used here for simplicity.
# In production, scope this down to only the specific Parameter Store paths your function needs.
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}

# ── Build artifact ─────────────────────────────────────────────────────────────

# Point source_dir at the dist directory for your chosen language:
#   TypeScript:      ../typescript/dist   (contains handler.js)
#   JavaScript ESM:  ../javascript/dist   (contains handler.js + package.json with "type":"module")
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "../typescript/dist"
  output_path = "${path.module}/lambda.zip"
}

# ── Lambda function ────────────────────────────────────────────────────────────

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn
  runtime       = "nodejs22.x"
  handler       = "handler.handler"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  timeout       = var.timeout
  memory_size   = var.memory_size

  # X-Ray active tracing is required for Powertools Tracer to emit segments.
  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      POWERTOOLS_SERVICE_NAME      = var.function_name
      POWERTOOLS_METRICS_NAMESPACE = var.function_name
      ENVIRONMENT                  = var.environment
      LOG_LEVEL                    = var.log_level

      # Add service-specific environment variables here, for example:
      # MY_TABLE_NAME = aws_dynamodb_table.orders.name
    }
  }
}
