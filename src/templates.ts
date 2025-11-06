/**
 * Prompt template system for common development tasks
 */

export interface PromptTemplate {
    id: string;
    name: string;
    category: string;
    description: string;
    template: string;
    variables?: string[];
}

export const TEMPLATE_CATEGORIES = {
    API: 'API Development',
    UI: 'UI Components',
    TESTING: 'Testing',
    DATABASE: 'Database',
    ARCHITECTURE: 'Architecture',
    DEBUGGING: 'Debugging',
    GENERAL: 'General'
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
    // API Development
    {
        id: 'rest-api',
        name: 'REST API Endpoint',
        category: TEMPLATE_CATEGORIES.API,
        description: 'Create a complete REST API endpoint',
        template: `Create a REST API endpoint for {resource}:

REQUIREMENTS:
- HTTP Method: {method}
- Route: /api/{resource}
- Request validation with proper error handling
- Response with appropriate status codes
- TypeScript types/interfaces
- Error handling for edge cases
- JSDoc comments
- Input sanitization

STRUCTURE:
- Controller function
- Request/response types
- Validation middleware
- Error responses (400, 404, 500)

BEST PRACTICES:
- RESTful conventions
- Consistent error format
- Proper HTTP status codes
- Security considerations`,
        variables: ['resource', 'method']
    },
    {
        id: 'graphql-resolver',
        name: 'GraphQL Resolver',
        category: TEMPLATE_CATEGORIES.API,
        description: 'Create a GraphQL resolver with types',
        template: `Create a GraphQL resolver for {entity}:

REQUIREMENTS:
- Query/Mutation resolver
- TypeScript type definitions
- Error handling
- Data validation
- Authentication/authorization checks
- Proper return types

INCLUDE:
- Schema definition
- Resolver implementation
- Input validation
- Error handling
- Type safety`,
        variables: ['entity']
    },
    
    // UI Components
    {
        id: 'react-component',
        name: 'React Component',
        category: TEMPLATE_CATEGORIES.UI,
        description: 'Create a React component with TypeScript',
        template: `Create a React component named {componentName}:

REQUIREMENTS:
- TypeScript with strict types
- Props interface with JSDoc
- Proper component structure
- Accessibility (ARIA labels, keyboard nav)
- Responsive design
- Error boundaries if needed

STYLING:
- {stylingMethod}
- Mobile-first approach
- Dark mode support (if applicable)

FEATURES:
- {features}

BEST PRACTICES:
- Semantic HTML
- PropTypes or TypeScript types
- Clean, maintainable code
- Performance optimizations
- Commented complex logic`,
        variables: ['componentName', 'stylingMethod', 'features']
    },
    {
        id: 'form-component',
        name: 'Form with Validation',
        category: TEMPLATE_CATEGORIES.UI,
        description: 'Create a form component with validation',
        template: `Create a form component for {formPurpose}:

REQUIREMENTS:
- Form fields: {fields}
- Client-side validation
- Error messages (inline and summary)
- Submit handler with loading state
- TypeScript types for form data
- Accessibility (labels, ARIA)
- Keyboard navigation

VALIDATION:
- Required fields
- Format validation (email, phone, etc.)
- Custom validation rules
- Real-time and on-submit validation

UX FEATURES:
- Loading/disabled states during submit
- Success/error feedback
- Clear error messages
- Form reset after success`,
        variables: ['formPurpose', 'fields']
    },
    
    // Testing
    {
        id: 'unit-tests',
        name: 'Unit Tests',
        category: TEMPLATE_CATEGORIES.TESTING,
        description: 'Create comprehensive unit tests',
        template: `Create unit tests for {targetCode}:

REQUIREMENTS:
- Testing framework: {framework}
- Test coverage: all functions/methods
- Edge cases and error scenarios
- Mock external dependencies
- Descriptive test names

TEST CASES:
- Happy path scenarios
- Edge cases (null, undefined, empty)
- Error handling
- Boundary conditions
- Integration points (mocked)

STRUCTURE:
- Setup/teardown if needed
- Clear arrange-act-assert pattern
- Isolated tests (no dependencies)
- Meaningful assertions`,
        variables: ['targetCode', 'framework']
    },
    {
        id: 'integration-tests',
        name: 'Integration Tests',
        category: TEMPLATE_CATEGORIES.TESTING,
        description: 'Create integration tests',
        template: `Create integration tests for {feature}:

REQUIREMENTS:
- Test complete user flows
- Real or test database
- API endpoint testing
- Authentication/authorization
- Error scenarios

COVERAGE:
- End-to-end user workflows
- API contract testing
- Database operations
- External service integration
- Error handling and rollback`,
        variables: ['feature']
    },
    
    // Database
    {
        id: 'database-schema',
        name: 'Database Schema',
        category: TEMPLATE_CATEGORIES.DATABASE,
        description: 'Create a database schema',
        template: `Create a database schema for {entity}:

REQUIREMENTS:
- Database: {dbType}
- Tables/collections with proper types
- Primary keys and indexes
- Foreign key relationships
- Constraints (unique, not null, etc.)
- Timestamps (created_at, updated_at)

INCLUDE:
- Migration file
- Model/entity definition
- Validation rules
- Indexes for performance
- Relationships to other entities

BEST PRACTICES:
- Normalized structure
- Performance considerations
- Data integrity constraints
- Sensible defaults`,
        variables: ['entity', 'dbType']
    },
    
    // Architecture
    {
        id: 'clean-architecture',
        name: 'Clean Architecture Module',
        category: TEMPLATE_CATEGORIES.ARCHITECTURE,
        description: 'Create a module following clean architecture',
        template: `Create a {moduleName} module with clean architecture:

LAYERS:
- Domain: Entities, business logic, interfaces
- Use Cases: Application-specific business rules
- Infrastructure: External concerns (DB, API, etc.)
- Presentation: Controllers, presenters

REQUIREMENTS:
- Clear separation of concerns
- Dependency inversion
- Interface-based design
- Testable components
- TypeScript with strict types

INCLUDE:
- Entity definitions
- Repository interfaces
- Use case implementations
- Infrastructure adapters
- Dependency injection setup`,
        variables: ['moduleName']
    },
    
    // Debugging
    {
        id: 'debug-error',
        name: 'Debug Error',
        category: TEMPLATE_CATEGORIES.DEBUGGING,
        description: 'Help debug and fix an error',
        template: `Help me debug this error:

ERROR MESSAGE:
{errorMessage}

CONTEXT:
- Language/Framework: {context}
- What I'm trying to do: {goal}
- What happens instead: {actualBehavior}

PLEASE PROVIDE:
1. Explanation of what's causing the error
2. Step-by-step fix
3. Code example of the solution
4. How to prevent this in the future
5. Related best practices`,
        variables: ['errorMessage', 'context', 'goal', 'actualBehavior']
    },
    
    // General
    {
        id: 'refactor-code',
        name: 'Refactor Code',
        category: TEMPLATE_CATEGORIES.GENERAL,
        description: 'Refactor code for better quality',
        template: `Refactor this code to improve {aspect}:

FOCUS AREAS:
- {aspect}
- Code readability
- Performance
- Maintainability
- Best practices

REQUIREMENTS:
- Preserve functionality
- Improve code structure
- Add comments where helpful
- Follow {language} best practices
- Consider edge cases
- Type safety (if applicable)

EXPLAIN:
- What was improved
- Why changes were made
- Any performance implications`,
        variables: ['aspect', 'language']
    },
    {
        id: 'documentation',
        name: 'Generate Documentation',
        category: TEMPLATE_CATEGORIES.GENERAL,
        description: 'Create comprehensive documentation',
        template: `Create documentation for {target}:

INCLUDE:
- Overview and purpose
- Installation/setup instructions
- API reference (if applicable)
- Usage examples with code
- Configuration options
- Troubleshooting section
- Best practices

FORMAT:
- Clear structure with headings
- Code examples with syntax highlighting
- Links to related resources
- Version information
- Contributors/license (if applicable)`,
        variables: ['target']
    }
];

/**
 * Get template by ID
 */
export function getTemplate(id: string): PromptTemplate | undefined {
    return PROMPT_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): PromptTemplate[] {
    return PROMPT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Fill template with variables
 */
export function fillTemplate(template: PromptTemplate, variables: Record<string, string>): string {
    let filled = template.template;
    
    // Replace variables in {variable} format
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        filled = filled.replace(regex, value);
    }
    
    return filled;
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return PROMPT_TEMPLATES.filter(t => 
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.category.toLowerCase().includes(lowerQuery)
    );
}
