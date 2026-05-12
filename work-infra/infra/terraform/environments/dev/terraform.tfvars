environment        = "dev"
aws_region         = "us-east-1"
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

eks_cluster_version = "1.29"
node_instance_types = ["t3.medium"]
enable_gpu_nodes    = false

db_instance_class    = "db.t3.micro"
db_allocated_storage = 20

redis_node_type = "cache.t3.micro"

domain_name = "dev.aasop.example.com"
