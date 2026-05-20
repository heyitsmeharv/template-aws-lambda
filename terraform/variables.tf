variable "function_name" {
  description = "Name of the Lambda function. Also used as POWERTOOLS_SERVICE_NAME and POWERTOOLS_METRICS_NAMESPACE."
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "eu-west-1"
}

variable "log_level" {
  description = "Lambda log level passed to Powertools Logger via LOG_LEVEL."
  type        = string
  default     = "INFO"
}

variable "timeout" {
  description = "Lambda function timeout in seconds."
  type        = number
  default     = 30
}

variable "memory_size" {
  description = "Lambda function memory in MB."
  type        = number
  default     = 512
}
