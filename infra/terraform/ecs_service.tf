resource "aws_ecs_service" "api" {
  name            = "apex-dev-env-dev-api"
  cluster         = data.terraform_remote_state.shared.outputs.ecs_cluster_arn
  task_definition = aws_ecs_task_definition.api.arn

  desired_count = 1

  launch_type = "FARGATE"

  network_configuration {
    subnets = [
      data.terraform_remote_state.shared.outputs.private_subnet_ids.az_a,
      data.terraform_remote_state.shared.outputs.private_subnet_ids.az_b
    ]

    security_groups = [
      data.terraform_remote_state.shared.outputs.security_group_ids["private-workload"]
    ]

    assign_public_ip = false
  }
}
