output "function_arn" {
  description = "ARN of the deployed Lambda function."
  value       = aws_lambda_function.this.arn
}

output "function_name" {
  description = "Name of the deployed Lambda function."
  value       = aws_lambda_function.this.function_name
}
