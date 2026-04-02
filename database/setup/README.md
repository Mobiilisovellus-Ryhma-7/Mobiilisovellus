# Database setup shortcuts

Use these files to quickly reset and repopulate Data Connect Cloud SQL.

## Open SQL shell

From project root:

npm run db:shell

(or: firebase dataconnect:sql:shell)

## One-step rebuild

Inside SQL shell, run:

\i database/setup/00_rebuild.sql

## Two-step flow

Inside SQL shell, run:

\i database/setup/01_reset.sql
\i database/setup/02_seed.sql

## Verify data

SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM facilities;
SELECT COUNT(*) FROM facility_sections;
SELECT COUNT(*) FROM bookings;

SELECT id, name FROM facilities ORDER BY name;

## Notes

- Table/column names here follow the live snake_case database names.
- You can edit database/setup/02_seed.sql whenever you want new sample data.
