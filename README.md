\# MarutFit Infrastructure



\## Environment



Production



\## Region



ap-south-2



\## Network



VPC: 10.0.0.0/16



Public Subnet A: 10.0.1.0/24



Private DB Subnet: 10.0.2.0/24



Public Subnet B: 10.0.3.0/24



\## Resources



\- VPC

\- Internet Gateway

\- Route Tables

\- Security Groups

\- IAM Roles

\- SSM Role



\## Managed By



Terraform + Floci
# MarutFit Infrastructure



\## Stack



\- Terraform

\- Floci

\- AWS Provider



\## Network



VPC: 10.0.0.0/16



Subnets:



\- Public A : 10.0.1.0/24

\- Private DB : 10.0.2.0/24

\- Public B : 10.0.3.0/24



\## Components



\- VPC

\- Internet Gateway

\- Route Tables

\- Security Groups

\- IAM Role

\- SSM Policy



\## Terraform Layout



modules/

environments/

