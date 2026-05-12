terraform {
  backend "s3" {
    bucket         = "aasop-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "aasop-terraform-locks"
  }
}

module "aasop" {
  source = "../../"

  environment        = "prod"
  aws_region         = "us-east-1"
  vpc_cidr           = "10.2.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  eks_cluster_version = "1.29"
  node_instance_types = ["m6i.xlarge"]
  enable_gpu_nodes    = true

  db_instance_class    = "db.r6g.xlarge"
  db_allocated_storage = 100

  redis_node_type = "cache.r6g.xlarge"

  domain_name = "aasop.example.com"

  tags = {
    Project     = "aasop"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
