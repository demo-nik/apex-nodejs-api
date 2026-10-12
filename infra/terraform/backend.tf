terraform {
  backend "s3" {
    bucket       = "apex-dev-env-051826698957-tfstate"
    key          = "applications/apex-nodejs-api/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}
