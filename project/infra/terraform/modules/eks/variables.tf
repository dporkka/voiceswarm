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

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "cluster_version" {
  description = "EKS cluster version"
  type        = string
}

variable "node_instance_types" {
  description = "Node instance types"
  type        = list(string)
}

variable "gpu_instance_types" {
  description = "GPU instance types"
  type        = list(string)
}

variable "enable_gpu_nodes" {
  description = "Enable GPU nodes"
  type        = bool
}

variable "node_desired_size" {
  description = "Desired node count"
  type        = number
}

variable "node_min_size" {
  description = "Min node count"
  type        = number
}

variable "node_max_size" {
  description = "Max node count"
  type        = number
}

variable "common_tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}
