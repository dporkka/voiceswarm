output "api_role_arn" {
  description = "API service account IAM role ARN"
  value       = aws_iam_role.api.arn
}

output "agent_runtime_role_arn" {
  description = "Agent runtime IAM role ARN"
  value       = aws_iam_role.agent_runtime.arn
}

output "cicd_role_arn" {
  description = "CI/CD IAM role ARN"
  value       = aws_iam_role.cicd.arn
}
