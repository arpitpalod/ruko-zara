# Database changes waiting to go live

Put a new database change here as `NNN_short_name.sql` before applying it to the live database.
The Ship workflow copies the live database into a throwaway local Supabase, applies these files,
and runs the security tests (`supabase/tests/`). Only after that passes is the change applied to the
live database; then the file moves to `supabase/history/`.
