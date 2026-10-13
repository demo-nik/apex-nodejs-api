resource "aws_ecs_task_definition" "api" {
  family                   = "apex-dev-env-dev-api"
  task_role_arn            = "arn:aws:iam::051826698957:role/apex-dev-env-dev-api-task-role"
  execution_role_arn       = "arn:aws:iam::051826698957:role/apex-dev-env-dev-api-execution-role"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = local.current_api_container.image
      cpu       = 0
      essential = true

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment    = []
      mountPoints    = []
      volumesFrom    = []
      systemControls = []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/apex-dev-env/dev/api"
          "awslogs-region"        = "ap-south-1"
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command = [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags         = var.tags
  skip_destroy = true

  lifecycle {
    # CI owns container definitions, including the image and other container settings.
    # Terraform ignores all changes to this attribute to avoid reverting CI deployments.
    ignore_changes = [container_definitions]
  }
}
