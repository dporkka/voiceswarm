variable "name_prefix" {
  description = "Name prefix"
  type        = string
}

variable "environment" {
  description = "Environment"
  type        = string
}

variable "s3_bucket_arn" {
  description = "S3 bucket ARN"
  type        = string
}

variable "rds_arn" {
  description = "RDS ARN"
  type        = string
}

variable "eks_cluster_id" {
  description = "EKS cluster ID"
  type        = string
}

variable "common_tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}
