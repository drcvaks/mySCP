# Supabase Schema Draft

These files are the Checkpoint 3 database and RLS draft for a clean Supabase project.

## Files

- `migrations/202606220001_initial_schema.sql`: enums, tables, indexes, triggers, profile synchronization, and member-count maintenance.
- `migrations/202606220002_rls_and_storage.sql`: helper functions, RPC functions, grants, RLS policies, and the private `learning-files` Storage bucket.
- Later migrations add membership approvals, chaburah switching/count fixes, leadership assignment, member management, the My Chaburah roster RPC, learning-file coverage, pending-request profile visibility for local managers, and staged review-question publishing.
- `pilot_cleanup.sql`: optional cleanup script for removing disposable test content/history before creating real pilot material.
- `seed.sql`: optional development chaburah records matching the current app mock data.

## Recommended Setup

Use a new Supabase project because the current project contains only disposable test data. Do not run the older starter SQL before these migrations.

Apply the migrations in filename order with the Supabase CLI or paste them into the SQL editor one at a time. Apply `seed.sql` only after the migrations succeed.

Do not put the service-role key in the Expo application or in a committed file.

## Resetting an Existing Test Project

If the first migration reports that a type such as `app_role` already exists, the old starter schema is still installed.

Because this operation deletes all mySCP application data, first confirm the project contains only disposable test data. Then run:

1. `reset_app_schema.sql`
2. `migrations/202606220001_initial_schema.sql`
3. `migrations/202606220002_rls_and_storage.sql`
4. `seed.sql`

The reset script preserves Supabase Auth users and leaves the `learning-files` Storage bucket in place. Migration 2 safely creates the bucket when missing or updates its configuration when it already exists.

If you want to remove existing Storage objects, delete them through the Supabase Storage interface or Storage API. Supabase intentionally blocks direct deletion from its Storage tables.

## First Global Administrator

1. Create the first user through Supabase Auth.
2. Confirm that `public.profiles` contains the matching row. The auth trigger should create it automatically.
3. Bootstrap the first global administrator once from the SQL editor:

```sql
update public.profiles
set role = 'global_admin'
where id = (
  select id
  from auth.users
  where email = 'replace-with-your-email@example.com'
);
```

After the first global administrator exists, role changes should use:

```sql
select public.admin_set_user_role(
  'target-user-uuid',
  'local_admin'::public.app_role
);
```

The client cannot directly update the `profiles.role` column.

Pending role requests should be approved or rejected atomically with:

```sql
select public.review_role_request(
  'role-request-uuid',
  true,
  'Approved after verification'
);
```

## Security Model

- Profiles: users edit only their non-authorization fields. Global admins change roles through a protected RPC.
- Chaburos: authenticated users see active chaburos. Global admins create/delete them. Active rabbis/admins manage their own chaburah.
- Membership: participants join through `join_chaburah()`. Direct membership mutation is limited to authorized managers.
- Announcements and files: everyone content is global-admin managed. Chaburah content is managed by that chaburah's rabbi/admin.
- Review questions: published prompts and choices are readable when authorized. Staged questions are manager-only until published. Correct answers are stored separately and checked through `check_review_answer()`.
- Review history: `complete_review_session()` computes scores on the server and stores per-question results.
- Ask Rav: only the asker and the chaburah's active assigned rabbi can read a question.
- Storage: the `learning-files` bucket is private. Object access is allowed only when a matching `learning_files.storage_path` row grants access.

## Learning File Upload Order

Storage authorization looks up the database row by `storage_path`, so:

1. Create the `learning_files` row with its intended unique `storage_path`.
2. Upload the object to the `learning-files` bucket using exactly that path.
3. If the upload fails permanently, remove or repair the database row.

For external links, set `external_url` and leave `storage_path` null.

## RLS Verification Checklist

Test with separate participant, rabbi, local-admin, and global-admin accounts.

- A participant cannot change `profiles.role`.
- A participant can read active chaburos and join one through the RPC.
- A participant cannot directly promote a membership role.
- A participant sees everyone content and content for active memberships only.
- A rabbi/admin can see profile basics for active and pending members in their own chaburah.
- A participant cannot select rows from `review_question_answers`.
- `check_review_answer()` returns feedback only for an accessible enabled question.
- `complete_review_session()` rejects inaccessible, duplicate, or invalid answers.
- An Ask Rav question is visible to its asker but not unrelated participants.
- The assigned rabbi can read and answer questions only for that chaburah.
- A local admin cannot read other participants' Ask Rav questions.
- A local admin cannot create global announcements or global files.
- A global admin can manage all application records.
- Private Storage downloads follow the matching file record's visibility.

## Before App Integration

The migrations are drafted but have not been applied to a live project from this repository. Before connecting Expo:

1. Apply the migrations to a clean Supabase project.
2. Run the RLS verification checklist.
3. Generate Supabase TypeScript database types.
4. Add the project URL and publishable key to an ignored environment file.
5. Replace the local `AppStateProvider` workflows incrementally.
