import axios from 'axios'

import { getCookie } from 'formula_one/src/utils'

// Stands in for the bulk register endpoint until the backend ships it; drop the adapter option then.
const dummyBulkRegisterAdapter = (config) => {
  const { dry_run: dryRun, rows } = JSON.parse(config.data)
  const data = {
    dry_run: dryRun,
    summary: { created: rows.length, updated: 0, existing: 0, skipped: 0 },
    rows: rows.map((row) => ({
      row_number: row.row_number,
      enrolment_number: row.enrolment_number,
      action: dryRun ? 'would_create' : 'created',
      status: dryRun ? 'dry_run' : 'success',
      message: dryRun ? 'No database changes were made' : 'Student resident saved successfully'
    }))
  }
  return new Promise((resolve) => {
    setTimeout(() => resolve({ data, status: 200, statusText: 'OK', headers: {}, config }), 800)
  })
}

export const bulkRegisterResidents = (url, data, successCallBack, errCallBack) => {
  let headers = {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken')
  }
  return (dispatch) => {
    axios
      .post(url, data, {
        headers: headers,
        adapter: dummyBulkRegisterAdapter
      })
      .then((res) => {
        successCallBack(res)
      })
      .catch((err) => {
        errCallBack(err)
      })
  }
}
