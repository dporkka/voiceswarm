# ============================================================
# EKS Module
# ============================================================

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "${var.name_prefix}-eks"
  version  = var.cluster_version
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
    security_group_ids      = [aws_security_group.cluster.id]
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policies,
    aws_cloudwatch_log_group.eks,
  ]

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-eks"
  })
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${var.name_prefix}-eks/cluster"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = var.common_tags
}

# KMS Key for EKS Encryption
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-eks-encryption"
  })
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${var.name_prefix}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# EKS Cluster IAM Role
resource "aws_iam_role" "cluster" {
  name = "${var.name_prefix}-eks-cluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "cluster_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController",
  ])
  policy_arn = each.value
  role       = aws_iam_role.cluster.name
}

# EKS Node Group IAM Role
resource "aws_iam_role" "node" {
  name = "${var.name_prefix}-eks-node"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "node_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])
  policy_arn = each.value
  role       = aws_iam_role.node.name
}

# Managed Node Group - General
resource "aws_eks_node_group" "general" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.name_prefix}-general"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = var.node_instance_types
  capacity_type  = var.environment == "prod" ? "ON_DEMAND" : "SPOT"

  scaling_config {
    desired_size = var.node_desired_size
    min_size     = var.node_min_size
    max_size     = var.node_max_size
  }

  update_config {
    max_unavailable_percentage = 25
  }

  labels = {
    role        = "general"
    workload    = "general"
    environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_policies,
  ]

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-general"
  })
}

# Managed Node Group - GPU (optional)
resource "aws_eks_node_group" "gpu" {
  count = var.enable_gpu_nodes ? 1 : 0

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.name_prefix}-gpu"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = var.gpu_instance_types
  ami_type       = "AL2_x86_64_GPU"
  capacity_type  = var.environment == "prod" ? "ON_DEMAND" : "SPOT"

  scaling_config {
    desired_size = 1
    min_size     = 0
    max_size     = 5
  }

  update_config {
    max_unavailable_percentage = 25
  }

  labels = {
    role        = "gpu"
    workload    = "gpu"
    environment = var.environment
  }

  taint {
    key    = "nvidia.com/gpu"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_policies,
  ]

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-gpu"
  })
}

# Cluster Security Group
resource "aws_security_group" "cluster" {
  name_prefix = "${var.name_prefix}-eks-cluster-"
  description = "EKS cluster security group"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-eks-cluster-sg"
  })
}

resource "aws_security_group_rule" "cluster_ingress" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  security_group_id        = aws_security_group.cluster.id
  source_security_group_id = aws_security_group.nodes.id
}

# Node Security Group
resource "aws_security_group" "nodes" {
  name_prefix = "${var.name_prefix}-eks-node-"
  description = "EKS node security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }

  ingress {
    from_port                = 1025
    to_port                  = 65535
    protocol                 = "tcp"
    security_group_id        = aws_security_group.nodes.id
    source_security_group_id = aws_security_group.cluster.id
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name                                        = "${var.name_prefix}-eks-node-sg"
    "kubernetes.io/cluster/${var.name_prefix}-eks" = "owned"
  })
}

# OIDC Provider for IRSA
resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = var.common_tags
}

data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# Karpenter (optional - for auto-scaling)
resource "aws_iam_instance_profile" "karpenter" {
  name = "${var.name_prefix}-karpenter"
  role = aws_iam_role.node.name
}
