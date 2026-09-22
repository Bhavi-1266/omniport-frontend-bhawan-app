# Bulk resident registration: changes and remaining work

Branch: `feat/Bulk-Create-NewResidetns`.
Commits so far: `89b9a48` (Initial framework), `b8e1c5a` (Addded a bulk api), `fa8f6a5` (added undo after uploading) and `c29ee09` (these notes).
The backend endpoint is on `feat/Bulk-New-Resident` in `omniport-backend` (`5760a81`, fixed in `5effc44`), and its notes are in `BULK_REGISTER_NOTES.md` there.

## What the feature does

Wardens, supervisors and global admins open **Bulk Register Students** from the navbar (`/bhawan_app/bulk_registration`) and upload a CSV of students.
Students are registered into the bhawan picked in the navbar, so the CSV has no bhawan column.
The page checks every row in the browser and lists exactly what is wrong in each row, using the row numbers from the spreadsheet.
When the file is clean, the admin clicks **Preview changes**, which sends a dry run to the server.
The preview shows what will happen to each row, and rows the server cannot register, such as students not on Channeli yet, are marked as skipped with the reason.
**Confirm and register N students** sends the real run, which registers the other rows and skips the same ones.
N is the number of rows the preview would create or update, and the button stays disabled when N is 0.

## Changes

### New files

| File | Purpose |
|---|---|
| `src/components/bulk_register/index.js` | The page: target bhawan, file chooser, Remove file, template download, error and summary messages, preview table, Preview and Confirm buttons, and the CSV guide. |
| `src/components/bulk_register/index.css` | Layout for the button rows and horizontally scrolling tables. |
| `src/components/bulk_register/residents-csv.js` | Column definitions, CSV parser and all row checks, with no browser code. |
| `src/components/bulk_register/residents-csv.check.js` | Assert script for the parser and checks. |
| `src/actions/bulk-register.js` | The POST to the bulk register endpoint. |

### Changed files

| File | Change |
|---|---|
| `src/urls.js` | Added `bulkRegistrationUrl` (page) and `bulkRegisterResidentsUrl` (API). |
| `src/components/app.js` | Added the lazy-loaded `BulkRegister` page behind `AdminRoute`. |
| `src/components/navbar/index.js` | Added the "Bulk Register Students" item and its active state. |
| `README.md` | Documented the CSV format, the checks and the API contract. |

### CSV format

- Required columns: `Enrollment_NO`, `Room_No`.
- Optional columns: `Seat`, `Fee_Type`, `Admission_Date`, `Mobile_No`, `Address`, `Fathers_Name`, `Fathers_Contact`, `Mothers_Name`, `Mothers_Contact`.
- `Room_No` and `Seat` are stored together as `A-101-B`, the same way the admin import script does it.
- An empty cell keeps what is already stored for that student, and a new resident without a `Fee_Type` is LIVING.
- Headers are matched ignoring case, spaces and underscores.
- Other columns, including the old `Name`, `Bhawan_Name`, `Branch_Code`, `Current_Semester`, `Email` and `Date_Of_Birth`, are ignored with a warning, because the backend does not store them.
- Dates are DD/MM/YYYY, and DD-MM-YYYY or YYYY-MM-DD are also accepted.
- Only `.csv` files are accepted, and Excel users save with File > Save As > CSV UTF-8.

### Checks done in the browser

- `Enrollment_NO` is exactly 8 digits (the kernel Student rule) and is not repeated in the file.
- `Room_No` and `Seat` together are at most 10 characters (the Resident model limit).
- Contacts are at most 15 characters and parent names at most 255 (the backend serializer limits).
- `Fee_Type` is a known fee type and `Admission_Date` is a real calendar date.
- File-level problems are reported before any row: not a CSV, unreadable file, unclosed quote, empty header row, missing or duplicate required columns, and headers with no student rows.

Any of these problems blocks the upload until the file is fixed.
Whether a student is on Channeli can only be checked by the server, so those rows are skipped rather than blocking the upload.

### Request sent to the backend

Each row carries `row_number`, the CSV values under the keys the backend reads, and `hostel_code` set to the active bhawan.
The active bhawan is also the `<hostel>` in `POST /api/bhawan_app/<hostel>/resident/bulk_register/`.
The full request and response are in `README.md`.

## How to test

- **Check script:** from the `omniport` folder, run `npx babel-node --presets @babel/preset-env apps/bhawan_app/src/components/bulk_register/residents-csv.check.js`.
- **Backend tests:** from the `omniport` folder inside the Django container, run `python manage.py test bhawan_app`.
- **Real app:** needs the frontend built (`yarn install` then `NODE_OPTIONS=--openssl-legacy-provider yarn build`) and served through the `reverse-proxy` container.
- **Local data:** the local database currently has no bhawans or branches.
  Create `Residence` rows (for example `rjb`, `rkb`, `snb`, `azb`), a `HostelAdmin` for your user with designation `gsha`, and a few `Student` rows to register, otherwise every row is skipped and the admin menu does not appear.

Rows built by `residents-csv.js` from a sample CSV were posted to the real endpoint as an rjb supervisor, against a test database.
The preview and the real run both created a newcomer and moved a student from rkb, and skipped a student not on Channeli.
A second upload of the same file reported every row as existing, and a post to rkb returned 403 with a `detail` message.

## Things left to do

### Backend

- [x] Build `POST /api/bhawan_app/<hostel>/resident/bulk_register/`, taking `dry_run` and `rows`.
- [x] Return the report shape the page expects: `dry_run`, `summary` (`created`, `updated`, `existing`, `skipped`) and per-row `row_number`, `enrolment_number`, `action`, `status`, `message`.
- [x] Mark rows that fail with `"status": "error"` and count them in `summary.skipped`.
- [x] Return a 4xx status with a `detail` message for errors that affect the whole request, such as permissions.
- [x] Permission rule: wardens and supervisors for their own bhawan, global admins for any bhawan.
- [x] Only register students already on Channeli, so no student is ever created without a branch.
- [x] Re-check everything the browser checks, because requests can be sent without the page.
- [ ] `make_row` in the backend `tests.py` still sends the keys the page no longer sends (`full_name`, `branch_code`, `current_semester`, `email`, `dob`).
  This is harmless, but its docstring no longer describes the page.

### Frontend

- [x] Remove the dummy adapter in `src/actions/bulk-register.js`.
- [x] Update the "Backend API" section of `README.md`.
- [x] Let Confirm run when the preview skips rows, so admins do not have to delete students who are not on Channeli from the file.
- [x] Drop the columns the backend ignores, and take the bhawan from the navbar instead of a CSV column.
- [ ] Test the page in the real app against the real endpoint, including the navbar item and route, which have not been rendered yet.

### Manual testing on a running server

- [ ] Log in as a supervisor of one bhawan, open Bulk Register Students, upload a CSV with a mix of Channeli students, a non-Channeli enrolment number and a bad row, and check the preview.
- [ ] Confirm, then check the Student Database page shows the new residents with the right rooms.
- [ ] Upload the same file again and check every row says No change.
- [ ] Switch bhawan in the navbar as a global admin and check the upload goes to the new bhawan.

### Decisions still open

- [ ] Whether the CSV needs a "Date of Joining" column; the backend sets the bhawan start date to the time of import.
- [ ] Whether the import script should accept the same CSV; it would need the bhawan as an argument, since the CSV no longer has one.
- [ ] Whether admins need a downloadable report of the results.

### Known limits

- No CI runs in this repository, so the check script only runs when someone runs it by hand.
- The date checks rely on the moment version in `yarn.lock` (2.24).
  From moment 2.30, strict `D/M/YYYY` rejects zero-padded dates such as 20/07/2026, and the check script fails if moment is upgraded that far.
- A US-style date such as 07/08/2026 is read as 7 August; the page asks for DD/MM/YYYY.
- CSV files saved in a non-UTF-8 encoding may show wrong characters.
- On phone widths the tables scroll sideways.
