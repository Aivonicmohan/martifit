resource "aws_vpc" "marutfit" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "marutfit-vpc"
    Project     = "MarutFit"
    Environment = "Prod"
    ManagedBy   = "Terraform"
  }
}