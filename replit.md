# Overview

This is a CRM (Customer Relationship Management) application built for Build Abroad, an education consulting company that helps students with university applications and visa processes. The system manages leads through an 18-stage pipeline from initial contact to enrollment, with role-based access for administrators and counselors. The application features lead management, user management, reporting dashboards, and a comprehensive lead workspace for tracking student progress.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **Routing**: React Router DOM for client-side navigation with protected routes
- **State Management**: React Query for server state and local storage for authentication
- **UI Components**: Radix UI primitives with custom styling through shadcn/ui

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Development**: TypeScript with tsx for development server
- **Build Process**: esbuild for production bundling
- **API Structure**: RESTful endpoints prefixed with `/api`
- **Middleware**: Request logging, JSON parsing, and error handling

## Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon serverless with WebSocket support for serverless environments

## Authentication and Authorization
- **Authentication**: Local storage-based session management (demo implementation)
- **Authorization**: Role-based access control with admin and counselor roles
- **Route Protection**: Protected route components that redirect unauthenticated users
- **Demo Credentials**: Hardcoded credentials for demonstration purposes

## External Dependencies
- **Database Hosting**: Neon Database (PostgreSQL-compatible serverless)
- **Development Tools**: Replit integration with cartographer plugin and runtime error overlay
- **UI Framework**: Radix UI for accessible component primitives
- **Charts**: Recharts for data visualization in reports
- **Date Handling**: date-fns for date manipulation and formatting
- **Form Handling**: React Hook Form with Hookform resolvers for validation
- **Validation**: Zod schema validation with Drizzle Zod integration