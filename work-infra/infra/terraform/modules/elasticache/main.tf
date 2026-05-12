# ============================================================
# ElastiCache Redis Module
# ============================================================

# Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name_prefix}-redis"
  subnet_ids = var.private_subnet_ids

  tags = var.common_tags
}

# Security Group
resource "aws_security_group" "redis" {
  name_prefix = "${var.name_prefix}-redis-"
  description = "ElastiCache Redis security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.eks_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-redis-sg"
  })
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.name_prefix}-redis"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  tags = var.common_tags
}

# ElastiCache Replication Group
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "AASOP Redis cluster"

  node_type             = var.node_type
  num_cache_clusters    = var.environment == "prod" ? 2 : 1
  port                  = 6379
  parameter_group_name  = aws_elasticache_parameter_group.main.name
  subnet_group_name     = aws_elasticache_subnet_group.main.name
  security_group_ids    = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis.result

  automatic_failover_enabled = var.environment == "prod"
  multi_az_enabled           = var.environment == "prod"

  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window          = "05:00-06:00"
  maintenance_window       = "tue:06:00-tue:07:00"

  apply_immediately = var.environment != "prod"

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-redis"
  })
}

resource "random_password" "redis" {
  length           = 32
  special          = false
}
