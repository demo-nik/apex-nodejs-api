resource "aws_ecs_service" "api" {

  name            = "apex-dev-env-dev-api"
  cluster         = data.terraform_remote_state.shared.outputs.ecs_cluster_arn
  task_definition = "arn:aws:ecs:ap-south-1:051826698957:task-definition/apex-dev-env-dev-api:10"

  desired_count = 1
  lifecycle {
    ignore_changes = [task_definition]
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

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
