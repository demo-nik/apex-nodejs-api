data "terraform_remote_state" "shared" {
  backend = "s3"

  config = {
    bucket = "apex-dev-env-051826698957-tfstate"
    key    = "environments/dev/terraform.tfstate"
    region = "ap-south-1"
  }
}
