environment        = "staging"
aws_region         = "us-east-1"
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

eks_cluster_version = "1.29"
node_instance_types = ["m6i.large"]
enable_gpu_nodes    = true

db_instance_class    = "db.r6g.large"
db_allocated_storage = 50

redis_node_type = "cache.r6g.large"

domain_name = "staging.aasop.example.com"
