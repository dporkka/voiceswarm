output "endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "RDS port"
  value       = aws_db_instance.main.port
}

output "instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "arn" {
  description = "RDS ARN"
  value       = aws_db_instance.main.arn
}

output "secret_arn" {
  description = "Secrets Manager ARN"
  value       = aws_secretsmanager_secret.rds.arn
}
