import axios from 'axios'

import { getCookie } from 'formula_one/src/utils'

export const bulkRegisterResidents = (url, data, successCallBack, errCallBack) => {
  let headers = {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken')
  }
  return (dispatch) => {
    axios
      .post(url, data, { headers: headers })
      .then((res) => {
        successCallBack(res)
      })
      .catch((err) => {
        errCallBack(err)
      })
  }
}
