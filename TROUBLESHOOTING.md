# ClarityAI Troubleshooting Guide

## API Errors

If you're getting API errors like `404` or `500`, it usually means the built-in engine is experiencing high traffic or the configuration needs updating.

### Solution: Use Custom API Mode

1. Open VS Code Settings (Ctrl+,)
2. Search for "Clarity"
3. Configure:
   - **Api Mode**: Set to `custom`
   - **Api Key**: Your OpenAI-compatible API key
   - **Api Base Url**: Your provider's URL
   - **Fast Model**: Your preferred fast model
   - **Thinking Model**: Your preferred reasoning model

## Common Issues

### "No API key configured"
- Make sure you've set an API key in Settings if using `custom` mode.
- Verify the API mode matches your setup.

### "Failed to improve prompt"
- Check your internet connection.
- Try switching between fast/thinking modes.
- Reload VS Code (Ctrl+Shift+P → "Developer: Reload Window").
