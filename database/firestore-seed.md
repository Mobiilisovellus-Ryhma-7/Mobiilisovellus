# Firestore seed from SQL mock data

This project includes a VS Code-friendly seed script that reads SQL INSERT data from setup2.txt and writes documents to Firestore.

## What it creates

Collections and document counts from setup2.txt:
- users: 2 docs
- facilities: 30 docs
- facility_sections: 90 docs
- bookings: 2 docs

## 1) Create service account key

1. Open Firebase Console for project hallille.
2. Go to Project settings -> Service accounts.
3. Click Generate new private key and save the JSON file.
4. Put the file somewhere safe on your machine, for example:
   C:/Users/valtt/Documents/GitHub/Mobiilisovellus/secrets/firebase-admin.json

## 2) Seed from VS Code terminal

From project root:

PowerShell:

$env:FIREBASE_PROJECT_ID='hallille'
npm run db:seed:firestore -- --service-account ./secrets/firebase-admin.json

Notes:
- By default the script resets target collections first (similar to TRUNCATE).
- Use --no-reset to append/update without deleting existing docs.

## 3) Helpful commands

Dry run (parse only, no writes):

npm run db:seed:firestore:dry

No reset mode:

npm run db:seed:firestore:no-reset -- --service-account ./secrets/firebase-admin.json

Custom SQL file:

npm run db:seed:firestore -- --sql ./setup2.txt --service-account ./secrets/firebase-admin.json

Reseed only facility_sections (clear + insert only that collection):

npm run db:seed:firestore:facility-sections -- --service-account ./secrets/firebase-admin.json

You can also choose any comma-separated collection list:

npm run db:seed:firestore -- --collections facility_sections,facilities --service-account ./secrets/firebase-admin.json
