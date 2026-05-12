variable "name_prefix" {
  description = "Name prefix"
  type        = string
}

variable "environment" {
  description = "Environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "node_type" {
  description = "Redis node type"
  type        = string
}

variable "eks_security_group_id" {
  description = "EKS security group ID"
  type        = string
}

variable "common_tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}
