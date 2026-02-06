#!/usr/bin/env python3
"""
Generate secure secrets for EcoTrails environment variables
"""
import secrets

print("=" * 60)
print("EcoTrails Secret Generator")
print("=" * 60)
print()
print("Copy these values to your .env file:")
print()
print(f"JWT_SECRET={secrets.token_urlsafe(32)}")
print(f"MAGIC_LINK_SECRET={secrets.token_urlsafe(32)}")
print()
print("=" * 60)
print("Note: These are randomly generated secrets.")
print("Keep them secure and never commit them to version control!")
print("=" * 60)
