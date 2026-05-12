output "endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "cluster_id" {
  description = "Redis cluster ID"
  value       = aws_elasticache_replication_group.main.id
}

output "port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}
