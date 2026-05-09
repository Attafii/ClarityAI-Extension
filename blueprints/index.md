# Blueprint Index

This directory contains pre-approved logic templates for ClarityAI.

## Directory Structure

```
blueprints/
├── software-patterns/     # Common software engineering patterns
│   ├── rest-api.md         # REST API endpoint template
│   ├── react-component.md  # React component template
│   ├── nodejs-service.md   # Node.js service class template
│   └── database-schema.md  # Database schema template
│
├── agent-workflows/        # AI agent workflow patterns
│   ├── diagnose.md         # Issue diagnosis workflow
│   ├── refine.md           # Code refinement workflow
│   ├── fortify.md          # Security hardening workflow
│   └── ...                 # More workflows can be added
```

## Usage

```bash
# List all blueprints
clarity blueprints

# Use a blueprint to generate code
clarity generate rest-api resource=users method=POST

# Use an agent workflow
clarity generate diagnose
```

## Blueprint Format

Each blueprint contains:
- **Purpose**: What the blueprint is for
- **Variables**: Parameters that can be passed
- **Template**: The template string with {variable} placeholders
- **Requirements**: Specific requirements to follow
- **Constraints**: Rules from constraints.md to follow
- **File Structure**: Recommended file layout
- **Anti-Patterns**: Things to avoid (from constraints.md)

## Creating New Blueprints

1. Determine if it's a software pattern or agent workflow
2. Create a markdown file in the appropriate directory
3. Follow the blueprint format above
4. Include all sections (Purpose, Variables, Template, etc.)
5. Add to this index

## Version

- Last Updated: ${new Date().toISOString()}
- Version: 1.0