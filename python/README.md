## Instructions for setup:

This is mostly here as a reminder to me of what I did today to set everything up.

Core concepts:

1. Google drive is a drive from google. Files, folders dont have a path, but an Id.
2. These may be opened by various 'applications', e.g pdf, sheets, docs, etc
3. For most use cases a service account is what we need. It has its own email, permissions, and must be invited to shared drives
4. To set up, go to the Google Cloud Console and trace this path:
    - IAM and Admin
    - Service Accounts
    - Create Service Account (or click an existing one)
    - Go to the 'Keys' tab to view or create new keys.
    - Save as Json, DO NOT COMMIT to github, and then boom ur own little bot
