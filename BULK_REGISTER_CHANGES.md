# Bulk resident registration: changes and remaining work

Branch: `feat/Bulk-Create-NewResidetns`.
Commits so far: `89b9a48` (Initial framework), `b8e1c5a` (Addded a bulk api) and `fa8f6a5` (added undo after uploading).

## What the feature does

Admins open **Bulk Register Students** from the navbar (`/bhawan_app/bulk_registration`) and upload a CSV of new students.
The page checks every row in the browser and lists exactly what is wrong in each row, using the row numbers from the spreadsheet.
When the file is clean, the admin clicks **Preview changes**, which sends a dry run to the server.
**Confirm and register** unlocks only after a dry run with no skipped rows, and sends the real run.
The backend endpoint does not exist yet, so a dummy adapter answers in its place.

## Changes

### New files

| File | Purpose |
|---|---|
| `src/components/bulk_register/index.js` | The page: file chooser, Remove file, template download, error and summary messages, preview table, Preview and Confirm buttons, and the CSV guide. |
| `src/components/bulk_register/index.css` | Layout for the button rows and horizontally scrolling tables. |
| `src/components/bulk_register/residents-csv.js` | Column definitions, CSV parser and all row checks, with no browser code. |
| `src/components/bulk_register/residents-csv.check.js` | Assert script for the parser and checks. |
| `src/actions/bulk-register.js` | The API call, currently routed through a dummy axios adapter. |

### Changed files

| File | Change |
|---|---|
| `src/urls.js` | Added `bulkRegistrationUrl` (page) and `bulkRegisterResidentsUrl` (API). |
| `src/components/app.js` | Added the lazy-loaded `BulkRegister` page behind `AdminRoute`. |
| `src/components/navbar/index.js` | Added the "Bulk Register Students" item and its active state. |
| `README.md` | Documented the CSV format, the checks and the API contract. |

### CSV format

- Required columns: `Enrollment_NO`, `Name`, `Bhawan_Name`, `Room_No`.
- Optional columns: `Seat`, `Branch_Code`, `Current_Semester`, `Fee_Type`, `Admission_Date`, `Date_Of_Birth`, `Email`, `Mobile_No`, `Address`, `Fathers_Name`, `Fathers_Contact`, `Mothers_Name`, `Mothers_Contact`.
- Headers are matched ignoring case, spaces and underscores, and unknown columns are ignored with a warning.
- `Bhawan_Name` takes a bhawan name (`Rajendra bhawan`) or code (`rjb`), and the code is what gets sent.
- Dates are DD/MM/YYYY, and DD-MM-YYYY or YYYY-MM-DD are also accepted.
- Only `.csv` files are accepted, and Excel users save with File > Save As > CSV UTF-8.

### Checks done in the browser

- `Enrollment_NO` is exactly 8 digits (the kernel Student rule) and is not repeated in the file.
- `Bhawan_Name` and `Branch_Code` exist in the kernel, using `hostels` and `branches` from the constants API.
- `Room_No` is at most 10 characters (the Resident model limit).
- `Current_Semester` is a whole number of 1 or more, `Fee_Type` is a known fee type, dates are real calendar dates, and `Email` looks like an email address.
- File-level problems are reported before any row: not a CSV, unreadable file, unclosed quote, empty header row, missing or duplicate required columns, and headers with no student rows.

## How to test

- **Check script:** from the `omniport` folder, run `npx babel-node --presets @babel/preset-env apps/bhawan_app/src/components/bulk_register/residents-csv.check.js`.
- **Real app:** needs the frontend built (`yarn install` then `NODE_OPTIONS=--openssl-legacy-provider yarn build`) and served through the `reverse-proxy` container.
- **Local data:** the local database currently has no bhawans or branches.
  Create `Residence` rows (for example `rjb`, `rkb`, `snb`, `azb`) and a `HostelAdmin` for your user with designation `gsha`, otherwise every row fails and the admin menu does not appear.

## Things left to do

### Backend

- [ ] Build `POST /api/bhawan_app/<hostel>/resident/bulk_register/` following the import script flow, taking `dry_run` and `rows` as documented in `README.md`.
- [ ] Return the report shape the page expects: `dry_run`, `summary` (`created`, `updated`, `existing`, `skipped`) and per-row `row_number`, `enrolment_number`, `action`, `status`, `message`.
- [ ] Mark rows that fail with `"status": "error"` and count them in `summary.skipped`, so the page blocks the real run.
- [ ] Return a 4xx status with a `detail` message for errors that affect the whole request, such as permissions.
- [ ] Decide the permission rule, for example global admins for any bhawan and wardens or supervisors only for rows of their own bhawan.
- [ ] Reject new students without a branch instead of falling back to the first branch, which the import script currently does.
- [ ] Re-check everything the browser checks, because requests can be sent without the page.

### Frontend

- [ ] Remove the `adapter: dummyBulkRegisterAdapter` option and the dummy function in `src/actions/bulk-register.js` once the endpoint exists.
- [ ] Test the page end to end in the real app against the real endpoint, including the navbar item and route, which have not been rendered yet.

### Decisions still open

- [ ] Whether the CSV needs a "Date of Joining" column; the import script sets the bhawan start date to the time of import.
- [ ] Whether `Bhawan_Name` should only accept student hostels; today any residence in the kernel passes, including `nor` (Non-resident) and guest houses.
- [ ] Whether the import script should accept the same CSV; it would need a `"bhawan name": "hostel_code"` alias and support for bhawan names.
- [ ] Whether admins need a downloadable report of the results.

### Known limits

- No CI runs in this repository, so the check script only runs when someone runs it by hand.
- A US-style date such as 07/08/2026 is read as 7 August; the page asks for DD/MM/YYYY.
- CSV files saved in a non-UTF-8 encoding may show wrong characters in names.
- On phone widths the tables scroll sideways.
