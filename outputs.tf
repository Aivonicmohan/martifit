output "vpc_id" {
  value = aws_vpc.marutfit.id
}

output "public_subnet_2a" {
  value = aws_subnet.public_2a.id
}

output "public_subnet_2b" {
  value = aws_subnet.public_2b.id
}

output "private_db_subnet" {
  value = aws_subnet.private_db.id
}

output "app_security_group" {
  value = aws_security_group.app_sg.id
}

output "db_security_group" {
  value = aws_security_group.db_sg.id
}