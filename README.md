# Audiothread

Audiothread is a modern, crowdsourced discussion platform dedicated to high-end audio, in-ear monitors (IEMs), DACs, and sound science. It provides a robust community hub for audiophiles to share reviews, build tier lists, and discuss audio gear.

## Architecture

The application is built on a modern React stack:

- Framework: Next.js 16 (App Router with Turbopack)
- Language: TypeScript
- Styling: Tailwind CSS v4
- Authentication: NextAuth.js
- Database: PostgreSQL 
- Interaction: @dnd-kit/core for drag-and-drop operations
- Icons: Lucide React

## Core Features

- Community Forums: Dedicated community spaces (e.g., r/audiophile, r/iem) with threaded discussions and voting mechanics.
- Interactive Tier Lists: A comprehensive tier list builder featuring drag-and-drop categorization and a multi-variable rating matrix (Bass, Mids, Treble, Tonality, Technicality).
- Smart Gear Search: Automated retrieval of baseline specs and frequency response graphs.
- Direct Messaging: User-to-user messaging system.
- User Profiles: Comprehensive profiles tracking user karma, post history, and custom gear signatures.
- Robust Settings: Granular controls for privacy, notifications, and profile details.

## Development Setup

### Prerequisites

- Node.js 18.x or later
- PostgreSQL database

### Environment Variables

Create a `.env.local` file in the root directory and configure the following variables:

```env
# PostgreSQL Database
DATABASE_URL="postgres://user:password@host:port/database"

# NextAuth Configuration
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"

# Email Authentication (Magic Link)
# We use direct SSL (smtps://) on port 465 for providers like Resend.
EMAIL_SERVER="smtps://resend:YOUR_RESEND_API_KEY@smtp.resend.com:465"
EMAIL_FROM="noreply@yourdomain.com"
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run database migrations and seed data:
```bash
node db/migrate.js
node db/seed.js
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Production Build

To build the application for production:

```bash
npm run build
npm start
```
