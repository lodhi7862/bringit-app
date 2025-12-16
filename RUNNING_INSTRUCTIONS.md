# Running Your Project - Quick Guide

## Current Status

Your project is set up with AWS integration, but to run it locally, you need a database connection.

## Option 1: Quick Start (Without Database - Limited Functionality)

If you just want to test the app without setting up a database:

1. **Stop the current server** (if running)
2. **Comment out database operations** temporarily (not recommended for production)

## Option 2: Set Up Local PostgreSQL (Recommended for Development)

### Install PostgreSQL

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the password you set for the `postgres` user

### Create Database

1. Open **pgAdmin** (comes with PostgreSQL) or use command line:
```bash
# Using psql command line
psql -U postgres
```

2. Create database:
```sql
CREATE DATABASE bringit;
```

3. Update your `.env` file:
```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/bringit
```

### Run Database Migrations

```bash
cd Bri-Application
npm run db:push
```

### Start Server

```bash
npm run server:dev
```

## Option 3: Use AWS RDS (For Production)

Follow the instructions in `AWS_SETUP.md` to set up AWS RDS PostgreSQL.

## Starting the Application

### Terminal 1 - Start Server
```bash
cd Bri-Application
npm run server:dev
```

You should see:
```
express server serving on port 3000
WebSocket server initialized
```

### Terminal 2 - Start Expo Client
```bash
cd Bri-Application
npm run expo:dev
```

Or use the combined command:
```bash
npm run all:dev
```

## Troubleshooting

### "Cannot connect to database" Error

- Check if PostgreSQL is running
- Verify DATABASE_URL in `.env` file
- Ensure database `bringit` exists
- Check PostgreSQL is listening on port 5432

### Server Won't Start

1. Check if port 3000 is already in use:
```bash
netstat -ano | findstr :3000
```

2. Kill the process if needed or change PORT in `.env`

### WebSocket Connection Fails

- Ensure server is running on the same port as EXPO_PUBLIC_DOMAIN
- Check firewall settings
- Verify WebSocket URL format in browser console

## Quick Test

Once server is running:

1. Open browser: http://localhost:3000
2. You should see the landing page or API response
3. Check server logs for any errors

## Next Steps

1. Set up database (PostgreSQL local or AWS RDS)
2. Run `npm run db:push` to create tables
3. Start server: `npm run server:dev`
4. Start Expo: `npm run expo:dev`
5. Test the app!

For AWS setup, see `AWS_SETUP.md`
For quick setup, see `QUICK_START.md`

