variable "name_prefix" {
  description = "Name prefix"
  type        = string
}

variable "environment" {
  description = "Environment"
  type        = string
}

variable "eks_cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "rds_instance_id" {
  description = "RDS instance ID"
  type        = string
}

variable "elasticache_cluster_id" {
  description = "ElastiCache cluster ID"
  type        = string
}

variable "common_tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}
