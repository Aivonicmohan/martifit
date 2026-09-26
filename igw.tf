resource "aws_internet_gateway" "marutfit_igw" {
  vpc_id = aws_vpc.marutfit.id

  tags = {
    Name = "marutfit-igw"
  }
}
