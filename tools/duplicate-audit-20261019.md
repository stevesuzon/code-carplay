# Duplicate audit — 19 October 2026

All 114 France/Belgium nearby shards and valid daily catalog files were read. Corse daily files required uppercase 2A/2B paths. Areas 98 and 988 have shards but no daily chunk JSON.

33,409 source entries reduced to 23,419 distinct display identities. Categories: 21,111 regular markets; 529 Christmas markets; 1,754 brocante/fair entries; 25 traveller markets. 184,203 within-city/category candidate comparisons were made. Days and known event dates were checked before matching.

The complete D1 scan additionally checked all 8,949 imported records (including records excluded from the public feed), 34 staged records, and the 64 prior archived duplicate records. No further records were deleted during this audit.

Shared review queue after combining current candidates, prior review entries and archives: 3,378 records — 1,767 detected duplicates and 1,611 uncertain candidates. Classification is a comparison of catalog data, not independent verification of every event against organizers.

The admin-only queue supports comparison, restore and confirm-duplicate actions. Decisions persist in D1. Archived-record restore and the decision write run in a D1 batch. Public clients receive restored rows; unauthorized queue access is rejected. Restored records are protected against later automatic merging.

Validation: SQLite-backed authorization/restore/shared-decision integration test; mobile browser comparison/restore/back flow; real Rungis/Bagneux fixture regression, including preservation of different days and different sites.
