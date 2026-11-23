# Security Specification — Controle de Abastecimento - Jair

## 1. Data Invariants
1. **Strict Ownership**: Every document under `/users/{userId}` (profile, `vehicles`, `refuelings`) can only be read, created, updated, or deleted by the verified authenticated user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **No Orphaned Refuelings**: A `Refueling` document under `/users/{userId}/refuelings/{refuelingId}` cannot be created unless its `vehicleId` points to an existing vehicle document in `/users/{userId}/vehicles/{vehicleId}` (`exists()`).
3. **Immutable Identity & Linkage**: `uid`, `ownerId`, `vehicleId`, and `createdAt` cannot be changed after creation.
4. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
5. **Strict Schema & Bounds**: No extra/ghost fields (`hasOnly`), bounded string lengths, positive numbers for liters/totalPaid/pricePerLiter, non-negative odometer, valid fuel enum (`Gasolina`, `Etanol`, `Diesel`, `GNV`), valid ID regex (`^[a-zA-Z0-9_\-]+$`).

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Cross-user read**: User B (`uid-b`) reads `/users/uid-a/vehicles/veh-1`.
2. **Cross-user list**: User B (`uid-b`) lists `/users/uid-a/refuelings`.
3. **Identity spoofing on create**: User A creates `/users/uid-a/vehicles/veh-1` with `ownerId: "uid-b"`.
4. **Shadow/ghost field injection**: User A creates a vehicle with an extra field `isAdmin: true`.
5. **Orphaned refueling**: User A creates a refueling with `vehicleId: "non-existent-veh"`.
6. **Immutable field mutation**: User A updates a refueling to change `vehicleId` to another vehicle.
7. **Client-forged timestamp**: User A creates a vehicle with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
8. **Negative odometer / negative liters**: User A creates a refueling with `odometerKm: -50` or `liters: -10`.
9. **Oversized string DoW attack**: User A creates a vehicle with `name` of 500 characters (`> 80`).
10. **Invalid fuel type**: User A creates a refueling with `fuelType: "Querosene"`.
11. **Unverified email write**: Authenticated user with `email_verified: false` tries to create a vehicle.
12. **ID poisoning**: User A tries to write to `/users/uid-a/vehicles/bad.id$with$chars`.
