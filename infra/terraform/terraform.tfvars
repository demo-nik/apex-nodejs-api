name_prefix = "apex-dev-env-dev-api"

permissions_boundary_arn = "arn:aws:iam::051826698957:policy/apex-dev-env-dev-ecs-task-boundary"

tags = {
  Project     = "apex"
  Environment = "dev"
  ManagedBy   = "Terraform"
}