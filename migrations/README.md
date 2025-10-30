# Database Migrations

This directory contains SQL migration files for the Attendance Tracker PWA database schema. All migrations must be run manually via the Supabase SQL Editor.

## Migration Files

Migrations are numbered sequentially and should be executed in order:

| # | File | Description | Status |
|---|------|-------------|--------|
| 001 | `001_create_user_pins.sql` | Create user_pins table for PIN-based authentication | ✅ Applied |
| 002 | `002_create_auth_security.sql` | Create auth audit logs and rate limiting tables | ✅ Applied |
| 003 | `003_add_super_admin_role.sql` | Add 'super_admin' role to authentication system | ⏳ Pending |

## How to Run Migrations

### Step-by-Step Process

1. **Open Supabase SQL Editor**
   - Log into your Supabase project dashboard
   - Navigate to: SQL Editor → New Query

2. **Copy Migration SQL**
   - Open the migration file you want to run
   - Copy the entire SQL content

3. **Execute in SQL Editor**
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run" to execute the migration
   - Check for any errors in the output

4. **Verify Migration Success**
   - Run the verification queries included at the bottom of each migration file
   - Check that tables/columns/constraints were created correctly

5. **Update Status**
   - Mark the migration as "✅ Applied" in this README
   - Note the date and any important observations

6. **Update TypeScript Types**
   ```bash
   npm run gen:types
   ```
   - This generates updated types in `types/supabase-generated.ts`
   - Manually update `types/supabase.ts` if needed for custom types

7. **Restart Dev Server**
   ```bash
   npm run dev
   ```
   - Ensures new types are loaded correctly

## Rollback Procedures

Each migration file includes rollback instructions in SQL comments at the bottom. To rollback:

1. Read the rollback section in the migration file
2. **IMPORTANT**: Check for data dependencies before rollback
3. Copy the rollback SQL
4. Execute in Supabase SQL Editor
5. Verify rollback success
6. Update this README to mark migration as rolled back

## Best Practices

### Before Running a Migration
- ✅ Review the SQL code carefully
- ✅ Test on a development/staging database first
- ✅ Backup production database (Supabase does automatic daily backups)
- ✅ Understand the rollback procedure
- ✅ Check for any dependencies on existing data

### After Running a Migration
- ✅ Run verification queries
- ✅ Update this README
- ✅ Generate TypeScript types: `npm run gen:types`
- ✅ Update manual types in `types/supabase.ts` if needed
- ✅ Restart dev server: `npm run dev`
- ✅ Test affected features in the application

### Naming Conventions
- Format: `{number}_description.sql`
- Number: 3-digit zero-padded (001, 002, 003, etc.)
- Description: lowercase with underscores (e.g., `create_user_pins`, `add_super_admin_role`)

### Migration File Structure
Each migration should include:
1. Header comment with number, date, description
2. SQL statements with comments
3. Indexes and constraints
4. Rollback instructions in comments
5. Verification queries in comments
6. Usage notes and next steps

## Common Issues

### Issue: "relation already exists"
- **Cause**: Migration was already run
- **Solution**: Check if tables exist: `SELECT * FROM pg_tables WHERE schemaname = 'public';`
- **Action**: Skip migration or rollback first

### Issue: "constraint already exists"
- **Cause**: Constraint was previously added
- **Solution**: Use `IF NOT EXISTS` or `DROP CONSTRAINT IF EXISTS` first

### Issue: TypeScript types don't match database
- **Cause**: Types not regenerated after migration
- **Solution**: Run `npm run gen:types` and restart dev server

### Issue: Permission denied
- **Cause**: Using anon key instead of service role key
- **Solution**: Migrations must be run via Supabase SQL Editor (has admin privileges)

## Migration History

### 2025-10-29
- ✅ Applied `001_create_user_pins.sql`: Created PIN authentication system
- ✅ Applied `002_create_auth_security.sql`: Added audit logging and rate limiting

### 2025-10-30
- ⏳ Created `003_add_super_admin_role.sql`: Added super_admin role (pending execution)

## Resources

- [Supabase SQL Editor Documentation](https://supabase.com/docs/guides/database/sql-editor)
- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL CHECK Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS)

## Support

For questions or issues with migrations:
1. Check the rollback instructions in the migration file
2. Review Supabase logs: Dashboard → Database → Logs
3. Test on a development database first
4. Consult PostgreSQL documentation for syntax questions
