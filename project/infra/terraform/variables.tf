variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "aasop"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "enable_gpu_nodes" {
  description = "Enable GPU node group for AI workloads"
  type        = bool
  default     = false
}

variable "eks_cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.29"
}

variable "node_instance_types" {
  description = "EKS node instance types"
  type        = list(string)
  default     = ["m6i.xlarge"]
}

variable "gpu_instance_types" {
  description = "GPU instance types"
  type        = list(string)
  default     = ["g4dn.xlarge"]
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 20
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "aasop.example.com"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "aasop"
    ManagedBy   = "terraform"
  }
}

locals {
  common_tags = merge(var.tags, {
    Environment = var.environment
  })
  name_prefix = "${var.project_name}-${var.environment}"
}
