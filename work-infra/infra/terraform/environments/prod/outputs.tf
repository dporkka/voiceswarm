output "vpc_id" {
  description = "VPC ID"
  value       = module.aasop.vpc_id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.aasop.eks_cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.aasop.eks_cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.aasop.rds_endpoint
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.aasop.redis_endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = module.aasop.s3_bucket_name
}

output "kubeconfig_command" {
  description = "Command to update kubeconfig"
  value       = module.aasop.kubeconfig_command
}
