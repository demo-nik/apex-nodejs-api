data "terraform_remote_state" "shared" {
  backend = "s3"

  config = {
    bucket = "apex-dev-env-051826698957-tfstate"
    key    = "environments/dev/terraform.tfstate"
    region = "ap-south-1"
  }
}

data "aws_ecs_task_definition" "api" {
  task_definition = "apex-dev-env-dev-api"
}

locals {
  current_api_container = one([
    for container in jsondecode(data.aws_ecs_task_definition.api.container_definitions) : container
    if container.name == "api"
  ])
}
