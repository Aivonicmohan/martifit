resource "aws_security_group" "app_sg" {
  name        = "marutfit-app-sg"
  description = "Application Security Group"
  vpc_id      = aws_vpc.marutfit.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db_sg" {
  name        = "marutfit-db-sg"
  description = "Database Security Group"
  vpc_id      = aws_vpc.marutfit.id
}