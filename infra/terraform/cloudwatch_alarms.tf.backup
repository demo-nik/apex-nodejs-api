locals {
  ecs_cluster_name = "apex-dev-env-dev"
  ecs_service_name = "apex-dev-env-dev-api"
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${local.ecs_service_name}-cpu-high"
  alarm_description   = "ECS service CPU utilization is high"
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 70
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    ClusterName = local.ecs_cluster_name
    ServiceName = local.ecs_service_name
  }

  treat_missing_data = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "${local.ecs_service_name}-memory-high"
  alarm_description   = "ECS service memory utilization is high"
  namespace           = "AWS/ECS"
  metric_name         = "MemoryUtilization"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    ClusterName = local.ecs_cluster_name
    ServiceName = local.ecs_service_name
  }

  treat_missing_data = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "ecs_running_tasks_low" {
  alarm_name          = "${local.ecs_service_name}-running-tasks-low"
  alarm_description   = "ECS service has fewer running tasks than expected"
  namespace           = "ECS/ContainerInsights"
  metric_name         = "RunningTaskCount"
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 1
  comparison_operator = "LessThanThreshold"

  dimensions = {
    ClusterName = local.ecs_cluster_name
    ServiceName = local.ecs_service_name
  }

  treat_missing_data = "notBreaching"
}