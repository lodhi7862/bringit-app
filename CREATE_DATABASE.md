# Create Database in RDS

## Option 1: Using AWS Console (Easiest)

1. **Go to AWS Console** → **RDS**
2. Click on your database: **`bringit-db`**
3. Scroll to **"Databases"** section (or look for database management)
4. Click **"Create database"** or **"Actions"** → **"Create database"**
5. Enter database name: **`bringit`**
6. Click **"Create"**

**Note**: Some RDS instances don't allow creating databases through console. Use Option 2 instead.

## Option 2: Using psql Command Line (Recommended)

### Step 1: Connect to RDS Default Database

Connect to the default `postgres` database first:

```bash
psql -h bringit-db.c722akseg3is.eu-north-1.rds.amazonaws.com -U bringit_admin -d postgres -p 5432
```

**Note**: You might need to install PostgreSQL client tools first.

### Step 2: Create Database

Once connected, run:

```sql
CREATE DATABASE bringit;
```

### Step 3: Exit

```sql
\q
```

## Option 3: Using pgAdmin

1. Open **pgAdmin**
2. Add new server:
   - Host: `bringit-db.c722akseg3is.eu-north-1.rds.amazonaws.com`
   - Port: `5432`
   - Username: `bringit_admin`
   - Password: `English=321..`
   - Database: `postgres`
3. Right-click on **"Databases"** → **"Create"** → **"Database"**
4. Name: `bringit`
5. Click **"Save"**

## Option 4: Temporary Fix - Use Default Database

If you can't create the database right now, we can temporarily use the default `postgres` database:

Update `.env`:
```
DATABASE_URL=postgresql://bringit_admin:English=321..@bringit-db.c722akseg3is.eu-north-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify
```

Then run migrations. Later, you can create `bringit` database and switch back.

## After Creating Database

1. Update `.env` to use `bringit` database:
   ```
   DATABASE_URL=postgresql://bringit_admin:English=321..@bringit-db.c722akseg3is.eu-north-1.rds.amazonaws.com:5432/bringit?sslmode=no-verify
   ```

2. Run migrations:
   ```bash
   npm run db:push
   ```

