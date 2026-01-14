# Agent Instructions for Helpdesk System

## Architecture Rules

1. **Never modify GLPI core code** - Use only REST API
2. **All WhatsApp processing must be async** - Via RabbitMQ
3. **Session state in Redis** - Never in application memory
4. **Stateless webhook receiver** - Can scale horizontally
5. **Workers must be idempotent** - Safe to retry

## Code Standards

### TypeScript

- Use **strict mode** always
- No `any` types (use `unknown` if needed)
- Interfaces for all DTOs
- Enums for status, priorities, roles

### NestJS

- Follow **Clean Architecture** principles
- Domain entities must be pure (no framework deps)
- Use cases in application layer
- Controllers only for HTTP translation
- Dependency injection everywhere

### Naming Conventions

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/Methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (no "I" prefix)

## Testing Guidelines

- Unit tests for use cases and domain logic
- Integration tests for API endpoints
- E2E tests for critical flows (ticket creation)
- Minimum 80% coverage on domain layer

## Error Handling

- Use custom exceptions extending NestJS HttpException
- Log all errors with context (userId, ticketId, etc)
- Never expose internal errors to clients
- Implement retry logic for external services (GLPI, WhatsApp)

## Security

- JWT for API authentication
- bcrypt for password hashing (min 12 rounds)
- Rate limiting on public endpoints
- Validate all input with class-validator
- Sanitize WhatsApp messages before storing

## Integration Guidelines

### Baileys (WhatsApp)

- Use multi-file auth store
- Handle connection updates gracefully
- Implement reconnection with exponential backoff
- Log all connection state changes

### GLPI REST API

- Cache session token in Redis (TTL: 1 hour)
- Refresh session before it expires
- Map internal statuses to GLPI status codes
- Handle rate limits with queue delays

### Socket.IO

- Authenticate connections with JWT
- Use rooms for ticket subscriptions
- Emit only necessary data (no full objects)
- Handle reconnection on client side

## RabbitMQ Queues

| Queue               | Purpose                 | Consumer        |
| ------------------- | ----------------------- | --------------- |
| `incoming_messages` | Messages from WhatsApp  | Orchestrator    |
| `outgoing_messages` | Messages to WhatsApp    | WhatsApp Worker |
| `create_ticket`     | New ticket requests     | GLPI Worker     |
| `update_ticket`     | Ticket status changes   | GLPI Worker     |
| `notifications`     | Real-time notifications | Notify Worker   |

## Redis Keys

| Pattern            | Purpose                  | TTL    |
| ------------------ | ------------------------ | ------ |
| `session:{phone}`  | Bot conversation state   | 5 min  |
| `glpi:session`     | GLPI API session token   | 1 hour |
| `user:{id}:online` | User online status       | 30 sec |
| `ticket:{id}:lock` | Prevent concurrent edits | 30 sec |
