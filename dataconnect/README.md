# Firebase Data Connect Operations

This directory contains local GraphQL operations for Firebase Data Connect (PostgreSQL).

## Structure

```
dataconnect/
├── postgresql.yaml          # Data Connect service config
└── connectors/
    └── facilities/
        ├── connector.yaml   # Connector definition
        └── operations/
            └── listAllFacilities.gql    # GraphQL operations
```

## Editing Operations

1. Create `.gql` files in `connectors/facilities/operations/`
2. Define GraphQL query or mutation with operation name
3. Save and deploy

## Deploying

After editing operations locally:

```bash
# Login to Firebase (one-time)
firebase login

# Deploy all operations to Firebase Data Connect
firebase dataconnect:deploy
```

## Example: Create a New Operation

Create file: `connectors/facilities/operations/createBooking.gql`

```graphql
mutation CreateBooking($userId: UUID!, $facilityId: UUID!, $slotId: UUID!, $notes: String) @auth(level: USER) {
  bookings_insert(data: { userId: $userId, facilityId: $facilityId, bookingSlotId: $slotId, notes: $notes, status: "pending", bookingTime: now() }) {
    id
    status
  }
}
```

Deploy:
```bash
firebase dataconnect:deploy
```

Then use in your app:
- Operation name: `CreateBooking`
- Arguments: `userId, facilityId, slotId, notes`

## Operation Naming Convention

- Queries: `List*`, `Get*`, `Search*`, `Check*`
- Mutations: `Create*`, `Update*`, `Delete*`, `Insert*`

Example: `listAllFacilities.gql` → operation name `ListAllFacilities`
