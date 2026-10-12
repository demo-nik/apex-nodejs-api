variable "name_prefix" {
  description = "Prefix for API IAM roles"
  type        = string
}

variable "permissions_boundary_arn" {
  description = "Approved IAM permissions boundary"
  type        = string
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
variable "image_uri" {
  description = "Immutable application container image URI deployed to ECS"
  type        = string

  validation {
    condition     = length(trimspace(var.image_uri)) > 0
    error_message = "image_uri must not be empty."
  }
}
