locals {
  ecs_task_trust_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  iam_roles = {
    execution-role = {
      assume_role_policy_json = local.ecs_task_trust_policy

      managed_policy_arns = [
        "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
      ]
    }

    task-role = {
      assume_role_policy_json = local.ecs_task_trust_policy
    }
  }
}

module "iam" {
  source = "git::ssh://git@github.com/nikhilve99/apex-dev-env-infra.git//terraform/modules/iam?ref=main"

  name_prefix              = var.name_prefix
  roles                    = local.iam_roles
  permissions_boundary_arn = var.permissions_boundary_arn
  tags                     = var.tags
}
