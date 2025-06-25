# Technical Documentation Management System

## Overview

This is a full-stack web application built for creating, managing, and translating technical documentation with rich multimedia content. The system provides a modular approach to document creation, supporting various content types including text, images, videos, 3D models, PDFs, Bill of Materials (BOM), and specialized safety/warning modules. The application is designed for multi-language documentation workflows with comprehensive translation capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Rich Text Editor**: TipTap for advanced text editing capabilities
- **State Management**: React Query (@tanstack/react-query) for server state management
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Radix UI primitives for accessible, unstyled components

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js (implied from package structure)
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **File Storage**: Local uploads directory for media files
- **API**: RESTful API design with structured endpoints

### Database Strategy
- **ORM**: Drizzle for type-safe database interactions
- **Migration System**: Drizzle-kit for schema management
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Key Components

### Document Management System
- **Hierarchical Structure**: Documents organized in sections with nested levels
- **Module-Based Content**: Extensible module system supporting 17+ content types
- **Version Control**: Document versioning and revision tracking
- **Export Capabilities**: HTML export functionality with structured markup

### Translation System
- **Multi-Language Support**: Complete translation workflow for documents
- **BOM Translation**: Specialized translation for Bill of Materials with component-level descriptions
- **Interface Localization**: Translation of UI elements and system messages
- **Language Context**: User role-based translation permissions

### File Upload System
- **Multi-Format Support**: Images, videos, PDFs, 3D models, and custom file types
- **Organized Storage**: Timestamped file naming with hash-based organization
- **File Processing**: Automatic file type detection and validation
- **3D Model Integration**: Support for interactive 3D model viewers

### Module Types
- Text modules with rich formatting
- Media modules (images, videos)
- Interactive 3D model viewers
- PDF document embedding
- Data tables and checklists
- Safety and warning alerts (4 severity levels)
- Bill of Materials (BOM) with component tracking
- External link integration
- Component references

## Data Flow

### Document Creation Flow
1. User creates document with title and description
2. Sections are added with hierarchical numbering
3. Modules are inserted into sections with specific types
4. Content is authored using appropriate editors (TipTap for text, file uploads for media)
5. Documents can be exported to HTML with complete styling

### Translation Workflow
1. Source document is marked for translation
2. Translators access translation interface by language
3. Module content is translated with context preservation
4. BOM components get individual description translations
5. Translated versions maintain structural integrity with original

### File Management Flow
1. Files are uploaded through drag-and-drop or file picker
2. Server generates unique timestamps and hash-based filenames
3. Files are stored in `/uploads` directory with metadata
4. References are maintained in database for cleanup and organization

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connectivity
- **drizzle-orm**: Type-safe database ORM
- **@radix-ui/react-**: Comprehensive accessible UI component library
- **@tanstack/react-query**: Server state management and caching
- **@tiptap/**: Rich text editor with extensive plugin system

### Development Tools
- **TypeScript**: Static type checking across frontend and backend
- **Vite**: Fast build tool with hot module replacement
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration

### Replit Integration
- **@replit/vite-plugin-shadcn-theme-json**: Theme customization
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development tooling (conditional)

## Deployment Strategy

### Replit Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module
- **Development Server**: Runs on port 5000 with auto-restart
- **Build Process**: Vite build + ESBuild bundle for production
- **File Storage**: Local filesystem with `/uploads` directory

### Environment Configuration
- **Development**: `npm run dev` with hot reloading
- **Production**: `npm run build && npm run start`
- **Database Management**: Drizzle migrations with `npm run db:push`
- **Type Checking**: Continuous TypeScript validation

### Scaling Considerations
- File storage currently local (can be migrated to cloud storage)
- Database uses serverless PostgreSQL for automatic scaling
- Frontend assets optimized with Vite for fast loading
- API designed for horizontal scaling with stateless architecture

## Changelog

```
Changelog:
- June 25, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```