# Database Schema Blueprint

## Purpose
Generate a database schema following project conventions.

## Variables
- `entity` - Entity name (e.g., User, Product, Order)
- `fields` - Field definitions (name:type:constraints)
- `dbType` - Database type (PostgreSQL, MySQL, MongoDB)

## Template

\`\`\`
Create a {entity} schema for {dbType}:

## Requirements

### Schema Design
- Normalize to 3NF minimum
- Primary key is UUID (not auto-increment)
- All tables have created_at and updated_at timestamps
- Use meaningful column names (snake_case)

### Field Types

\`\`\`
{entity}:
  - id: UUID (primary key)
  - created_at: timestamp
  - updated_at: timestamp
  - {fields}
\`\`\`

### Constraints
- NOT NULL for required fields
- UNIQUE for business keys (email, username)
- INDEX for frequently queried columns
- CHECK for business rules (age >= 0)

### Relationships
- Foreign keys with CASCADE DELETE or SET NULL
- Junction tables for many-to-many
- No circular dependencies

### Migrations
- Create migration file for schema changes
- Never modify existing migrations
- Support forward and rollback

## File Structure

\`\`\`
prisma/ (if using Prisma)
  schema.prisma

migrations/
  YYYYMMDDHHMMSS_create_{entity}.sql

models/
  {entity}.model.ts
\`\`\`

## Dependencies
- Prisma or TypeORM (check stack.md)
- Database driver for {dbType}

## Constraints
- No stored procedures (use application logic)
- No triggers (use application events)
- Write migration tests