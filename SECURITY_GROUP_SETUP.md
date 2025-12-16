# Security Group Setup - Step by Step

## Your IP Address
**103.163.255.58/32** ✅ (This is correct format for a single IP)

## How to Add Security Group Rule Correctly

### Step 1: Go to Security Groups
1. Open **AWS Console**
2. Go to **EC2** service (not RDS)
3. In the left sidebar, click **"Security Groups"**

### Step 2: Find Your RDS Security Group
1. Look for security group: **`default (sg-0eed42e95c9767210)`**
   - This is the one attached to your RDS instance
2. **Click on the security group name** (not the checkbox)

### Step 3: Add Inbound Rule
1. Click on the **"Inbound rules"** tab
2. Click **"Edit inbound rules"** button
3. Click **"Add rule"** button
4. Fill in:
   - **Type**: Select **"PostgreSQL"** from dropdown (or "Custom TCP")
   - **Protocol**: Should auto-fill as **TCP**
   - **Port range**: Should auto-fill as **5432**
   - **Source**: Select **"My IP"** from dropdown
     - OR manually enter: **103.163.255.58/32**
   - **Description**: (Optional) "Allow PostgreSQL from my IP"
5. Click **"Save rules"**

## Alternative: If "My IP" Doesn't Work

If the dropdown doesn't work, manually enter:
- **Source**: `103.163.255.58/32`
- Make sure there's **no space** before or after

## If Rule Already Exists

If you see an error that the rule exists:
1. Check the **"Inbound rules"** tab
2. Look for an existing PostgreSQL rule on port 5432
3. If it exists with `0.0.0.0/0`, you can:
   - **Option A**: Edit that rule and change source to `103.163.255.58/32`
   - **Option B**: Delete the old rule and add a new one

## Troubleshooting

### Error: "You may not specify an IPv4 CIDR for an existing referenced group id rule"
This means:
- You might be trying to edit a rule that references another security group
- Or there's a conflict with an existing rule

**Solution**:
1. Check all existing inbound rules
2. If there's a PostgreSQL rule with a different source, delete it first
3. Then add your new rule with IP `103.163.255.58/32`

### Can't Find Security Group
1. Go to **RDS Console** → Your database
2. Scroll to **"Connectivity & security"**
3. Click on the security group name (it's a link)
4. This will take you directly to the security group

## Quick Test After Setup

Once the rule is added:
1. Wait 1-2 minutes for changes to propagate
2. Test connection from your local machine:
   ```bash
   # This will test if you can reach the database
   # Replace with your actual password
   psql -h bringit-db.c722akseg3is.eu-north-1.rds.amazonaws.com -U bringit_admin -d bringit
   ```

## For Development (Less Secure - Not Recommended)

If you want to allow all IPs temporarily (for testing only):
- **Source**: `0.0.0.0/0`
- ⚠️ **Warning**: This allows anyone to try to connect (they still need password)
- **Remove this rule** before going to production!

