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