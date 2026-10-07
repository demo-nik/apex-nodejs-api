output "role_arns" {
  description = "Created IAM role ARNs"
  value       = module.iam.role_arns
}

output "role_names" {
  description = "Created IAM role names"
  value       = module.iam.role_names
}