#!/bin/zsh
# Wrapper script to handle zsh glob pattern issues with Metro cache cleanup
# This prevents errors when Metro tries to clean up cache files that don't exist
setopt nonomatch 2>/dev/null || true
[ -f .zshrc.local ] && source .zshrc.local 2>/dev/null || true
exec expo "$@"
