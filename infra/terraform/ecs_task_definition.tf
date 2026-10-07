resource "aws_ecs_task_definition" "api" {
  family                   = "apex-dev-env-dev-api"
  requires_compatibilities = ["FARGATE"]

  network_mode = "awsvpc"

  cpu    = "256"
  memory = "512"

  execution_role_arn = module.iam.role_arns["execution-role"]
  task_role_arn      = module.iam.role_arns["task-role"]

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "051826698957.dkr.ecr.ap-south-1.amazonaws.com/apex-dev-env-dev/api:v1"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          awslogs-group         = "/apex-dev-env/dev/api"
          awslogs-region        = "ap-south-1"
          awslogs-stream-prefix = "api"
        }
      }
    }
  ])
}
