provider "aws" {
  region = var.aws_region
  default_tags {
    tags = local.common_tags
  }
}

# ============================================================
# VPC Module
# ============================================================
module "vpc" {
  source = "./modules/vpc"

  name_prefix        = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  environment        = var.environment
}

# ============================================================
# EKS Module
# ============================================================
module "eks" {
  source = "./modules/eks"

  name_prefix          = local.name_prefix
  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  public_subnet_ids    = module.vpc.public_subnet_ids
  cluster_version      = var.eks_cluster_version
  node_instance_types  = var.node_instance_types
  gpu_instance_types   = var.gpu_instance_types
  enable_gpu_nodes     = var.enable_gpu_nodes
  node_desired_size    = var.environment == "prod" ? 3 : 2
  node_min_size        = var.environment == "prod" ? 2 : 1
  node_max_size        = var.environment == "prod" ? 20 : 10
}

# ============================================================
# RDS Module
# ============================================================
module "rds" {
  source = "./modules/rds"

  name_prefix         = local.name_prefix
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  db_instance_class   = var.db_instance_class
  allocated_storage   = var.db_allocated_storage
  eks_security_group_id = module.eks.node_security_group_id
  database_name       = "aasop"
  database_username   = "aasop"
}

# ============================================================
# ElastiCache Module
# ============================================================
module "elasticache" {
  source = "./modules/elasticache"

  name_prefix           = local.name_prefix
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  node_type             = var.redis_node_type
  eks_security_group_id = module.eks.node_security_group_id
}

# ============================================================
# S3 Module
# ============================================================
module "s3" {
  source = "./modules/s3"

  name_prefix   = local.name_prefix
  environment   = var.environment
}

# ============================================================
# IAM Module
# ============================================================
module "iam" {
  source = "./modules/iam"

  name_prefix    = local.name_prefix
  environment    = var.environment
  s3_bucket_arn  = module.s3.bucket_arn
  rds_arn        = module.rds.arn
  eks_cluster_id = module.eks.cluster_name
}

# ============================================================
# Monitoring Module
# ============================================================
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix        = local.name_prefix
  environment        = var.environment
  eks_cluster_name   = module.eks.cluster_name
  rds_instance_id    = module.rds.instance_id
  elasticache_cluster_id = module.elasticache.cluster_id
}
