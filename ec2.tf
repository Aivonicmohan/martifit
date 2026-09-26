resource "aws_instance" "app_server" {
  ami           = "ami-test"
  instance_type = "t4g.medium"

  subnet_id = aws_subnet.public_2b.id

  vpc_security_group_ids = [
    aws_security_group.app_sg.id
  ]

  tags = {
    Name = "marutfit-app"
  }
}
