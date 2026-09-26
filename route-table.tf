resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.marutfit.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.marutfit_igw.id
  }

  tags = {
    Name = "public-route-table"
  }
}

resource "aws_route_table" "private_db_rt" {
  vpc_id = aws_vpc.marutfit.id

  tags = {
    Name = "private-db-route-table"
  }
}