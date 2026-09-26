resource "aws_subnet" "public_2a" {
  vpc_id            = aws_vpc.marutfit.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-south-2a"

  tags = {
    Name = "public-2a"
  }
}

resource "aws_subnet" "private_db" {
  vpc_id            = aws_vpc.marutfit.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-south-2a"

  tags = {
    Name = "private-db"
  }
}

resource "aws_subnet" "public_2b" {
  vpc_id            = aws_vpc.marutfit.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "ap-south-2b"

  tags = {
    Name = "public-2b"
  }
}
