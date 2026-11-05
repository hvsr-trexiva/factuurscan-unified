# MySQL revision

Replaced the SQLite/filesystem adapter with lazy mysql2 persistence, initial MySQL schema, compatibility for the app's JSON expressions, inserts, conditional claims and RETURNING operations, plus atomic private document chunks. First database access initializes tables; importing routes performs no database or filesystem writes. No DATA_DIRECTORY is needed.

The original local SQLite tests no longer describe the runtime. This revision includes SQL compatibility and session tests; no live Hostinger database was accessible in the build environment. Follow README.md to update the repository/environment and verify health after deployment.
