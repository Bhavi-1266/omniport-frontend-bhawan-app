import React from 'react'
import { connect } from 'react-redux'
import { toast } from 'react-semantic-toasts'
import moment from 'moment'

import RegistrationTabs from '../registration_tabs'
import {
  Button,
  Confirm,
  Divider,
  Dropdown,
  Form,
  Grid,
  Header,
  Image,
  Message,
  Segment
} from 'semantic-ui-react'

import { searchPerson } from '../../actions/searchPerson'
import { searchResident } from '../../actions/search-resident'
import { addResident, deregister, editResident, fetchPreviousRecords } from '../../actions/residents'

import {
  yellowPagesStudentUrl,
  residentSearchUrl,
  residentUrl,
  deregisterUrl
} from '../../urls'

import './index.css'

const PLACEHOLDER_PICTURE = 'https://react.semantic-ui.com/images/wireframe/square-image.png'
const DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss'

const emptyStudent = {
  selected: '',
  name: '',
  roomNo: '',
  startDate: '',
  emailAddress: '',
  currentYear: '',
  currentSemester: '',
  program: '',
  department: '',
  phoneNumber: '',
  insideCampus: false,
  feeStatus: '',
  dateOfBirth: '',
  displayPicture: '',
  address: '',
  addressBhawan: '',
  admissionDate: '',
  contactNumberAsBhawan: '',
  state: '',
  city: '',
  country: '',
  postalCode: '',
  fathersName: '',
  fathersContact: '',
  mothersName: '',
  mothersContact: '',
  isResident: false,
  currentRoom: '',
  currentStart: '',
  previousRecords: [],
  loading: false
}

// Channeli values can arrive as lists, so join them for display
const asText = (value) => (Array.isArray(value) ? value.filter(Boolean).join(', ') : value)

const formatDate = (value) => (value ? moment(value).format('D MMM YYYY') : '')

class RegisterStudent extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      ...emptyStudent,
      options: [],
      registerLoading: false,
      deregisterLoading: false,
      editLoading: false,
      confirmOpen: false
    }
    this.delayedCallback = _.debounce(this.ajaxCall, 300)
  }

  successCallBack = (res) => {
    let options = res.data.map((person, index) => {
      let text = person.fullName
      if (
        person.person.roles &&
        person.person.roles.length > 0 &&
        person.person.roles[0].data &&
        person.person.roles[0].data.branch &&
        person.person.roles[0].data.enrolmentNumber
      ) {
        text = `${person.person.roles[0].data.enrolmentNumber} · ${person.person.fullName}`
      }
      return { key: index, text: text, value: person }
    })
    this.setState({
      options: options
    })
  }

  ajaxCall = (e) => {
    this.props.searchPerson(
      yellowPagesStudentUrl(e.target.value),
      this.successCallBack
    )
  }

  onSearchChange = (e) => {
    e.persist()
    this.delayedCallback(e)
  }

  onChange = (e, { value }) => {
    this.loadStudent(value)
  }

  isSelected = (enrolmentNumber) =>
    this.state.selected && this.state.selected.enrolmentNumber === enrolmentNumber

  loadStudent = (student) => {
    const { activeHostel } = this.props
    this.setState({
      ...emptyStudent,
      selected: student,
      name: student.person.fullName,
      loading: true
    })
    this.props.searchResident(
      residentSearchUrl(activeHostel, student.enrolmentNumber),
      (res) => this.searchResidentSuccessCallBack(res, student.enrolmentNumber)
    )
    this.props.fetchPreviousRecords(
      `${residentUrl(activeHostel)}${student.enrolmentNumber}/previous_records/`,
      (res) => {
        if (this.isSelected(student.enrolmentNumber)) {
          this.setState({ previousRecords: res.data })
        }
      },
      () => {}
    )
  }

  searchResidentSuccessCallBack = (res, enrolmentNumber) => {
    // Ignore a late response for a student who is no longer selected
    if (!this.isSelected(enrolmentNumber)) {
      return
    }
    this.setState({
      loading: false,
      roomNo: res.roomNumber || '',
      startDate: moment(res.startDate).format(DATE_TIME_FORMAT),
      emailAddress: res.emailAddress,
      currentYear: res.currentYear,
      currentSemester: res.currentSemester,
      program: res.program,
      department: res.department,
      phoneNumber: res.phoneNumber,
      dateOfBirth: res.dateOfBirth,
      displayPicture: res.displayPicture,
      insideCampus: !!res.isLivingInCampus,
      feeStatus: res.feeType || '',
      address: res.address,
      addressBhawan: res.addressBhawan || '',
      admissionDate: moment(res.admissionDate).format(DATE_TIME_FORMAT),
      contactNumberAsBhawan: res.contactNumberAsBhawan || '',
      state: res.state,
      city: res.city,
      postalCode: res.postalCode,
      country: res.country,
      fathersName: res.fathersName || '',
      fathersContact: res.fathersContact || '',
      mothersName: res.mothersName || '',
      mothersContact: res.mothersContact || '',
      isResident: res.isResident,
      currentRoom: res.isResident ? res.roomNumber : '',
      currentStart: res.isResident ? res.startDate : ''
    })
  }

  clearStudent = () => {
    this.setState({ ...emptyStudent, options: [] })
  }

  reloadStudent = () => {
    if (this.state.selected) {
      this.loadStudent(this.state.selected)
    }
  }

  fieldsChange = (event, { name, value }) => {
    if (this.state.hasOwnProperty(name)) {
      this.setState({ [name]: value })
    }
  }

  checkedChange = (event, { checked }) => {
    this.setState({
      insideCampus: checked
    })
  }

  residentSuccessCallBack = (res) => {
    this.setState({ registerLoading: false })
    toast({
      type: 'success',
      title: 'Student Registered Succesfully',
      animation: 'fade up',
      icon: 'smile outline',
      time: 4000
    })
    this.reloadStudent()
  }

  residentErrCallBack = (err) => {
    // 409 means the backend found an active registration in this bhawan
    const isDuplicate = err.response && err.response.status === 409
    this.setState({ registerLoading: false })
    toast({
      type: 'error',
      title: isDuplicate
        ? 'Student is already registered in this bhawan'
        : 'Unable to register Student',
      animation: 'fade up',
      icon: 'frown outline',
      time: 4000
    })
    if (isDuplicate) {
      this.reloadStudent()
    }
  }

  residentEditSuccessCallBack = (res) => {
    this.setState({ editLoading: false })
    toast({
      type: 'success',
      title: 'Student Edited Succesfully',
      animation: 'fade up',
      icon: 'smile outline',
      time: 4000
    })
    this.reloadStudent()
  }

  residentEditErrCallBack = (err) => {
    this.setState({ editLoading: false })
    toast({
      type: 'error',
      title: 'Unable to edit Student',
      animation: 'fade up',
      icon: 'frown outline',
      time: 4000
    })
  }

  deRegisterStudent = () => {
    let url = deregisterUrl(this.props.activeHostel, this.state.selected.person.id)
    this.setState({
      confirmOpen: false,
      deregisterLoading: true
    })
    this.props.deregister(
      url,
      this.deregisterSuccessCallBack,
      this.deregisterFailureCallBack
    )
  }

  deregisterSuccessCallBack = (res) => {
    this.setState({ deregisterLoading: false })
    toast({
      type: 'success',
      title: res.data,
      animation: 'fade up',
      icon: 'smile outline',
      time: 4000
    })
    this.reloadStudent()
  }

  deregisterFailureCallBack = (err) => {
    this.setState({ deregisterLoading: false })
    toast({
      type: 'error',
      title: 'Unable to deregister student please try again',
      animation: 'fade up',
      icon: 'frown outline',
      time: 4000
    })
  }

  formData = () => {
    const {
      roomNo,
      fathersName,
      fathersContact,
      mothersName,
      mothersContact,
      insideCampus,
      feeStatus,
      startDate,
      addressBhawan,
      admissionDate,
      contactNumberAsBhawan
    } = this.state
    return {
      'room_number': roomNo,
      'start_date': startDate,
      'is_living_in_campus': !!insideCampus,
      'fee_type': feeStatus,
      'fathers_name': fathersName,
      'mothers_name': mothersName,
      'fathers_contact': fathersContact,
      'mothers_contact': mothersContact,
      'address_bhawan': addressBhawan,
      'admission_date': admissionDate,
      'contact_number_as_bhawan': contactNumberAsBhawan
    }
  }

  registerStudent = () => {
    if (this.state.isResident) {
      toast({
        type: 'error',
        title: 'Student is already registered in this bhawan',
        animation: 'fade up',
        icon: 'frown outline',
        time: 4000
      })
      return
    }
    this.setState({
      registerLoading: true
    })
    this.props.addResident(
      { person: this.state.selected.person.id, ...this.formData() },
      residentUrl(this.props.activeHostel),
      this.residentSuccessCallBack,
      this.residentErrCallBack
    )
  }

  editStudent = () => {
    this.setState({
      editLoading: true
    })
    this.props.editResident(
      this.formData(),
      `${residentUrl(this.props.activeHostel)}${this.state.selected.enrolmentNumber}/`,
      this.residentEditSuccessCallBack,
      this.residentEditErrCallBack
    )
  }

  // The student's residency decides which action the form offers
  getStatus = () => {
    const { selected, loading, isResident, previousRecords } = this.state
    if (!selected) {
      return { key: 'none' }
    }
    if (loading) {
      return { key: 'loading' }
    }
    if (isResident) {
      return { key: 'here' }
    }
    const elsewhere = previousRecords.find(
      (record) => !record.endDate && record.hostel !== this.props.activeHostel
    )
    if (elsewhere) {
      return { key: 'elsewhere', record: elsewhere }
    }
    return { key: 'new' }
  }

  renderStatus = (status, hostelName) => {
    const { constants } = this.props
    const { currentRoom, currentStart } = this.state
    switch (status.key) {
      case 'here':
        return (
          <Message positive size='small'>
            <Message.Header>Resident of {hostelName}</Message.Header>
            <p>Room {currentRoom}{currentStart && ` · since ${formatDate(currentStart)}`}</p>
          </Message>
        )
      case 'elsewhere':
        return (
          <Message warning size='small'>
            <Message.Header>Lives in {constants.hostels[status.record.hostel] || status.record.hostel}</Message.Header>
            <p>Since {formatDate(status.record.startDate)}. Registering here ends that residency today.</p>
          </Message>
        )
      case 'new':
        return (
          <Message info size='small'>
            <Message.Header>Not registered in any bhawan</Message.Header>
          </Message>
        )
      default:
        return null
    }
  }

  renderStudentCard = (status, hostelName) => {
    const { constants } = this.props
    const {
      selected,
      name,
      displayPicture,
      loading,
      program,
      department,
      currentYear,
      currentSemester,
      emailAddress,
      phoneNumber,
      dateOfBirth,
      address,
      city,
      state,
      postalCode,
      country,
      previousRecords
    } = this.state
    const homeAddress = [address, city, state, postalCode, country].map(asText).filter(Boolean).join(', ')
    const details = [
      ['Program', asText(program)],
      ['Department', department],
      ['Year · Sem', [currentYear, currentSemester].filter((value) => value || value === 0).join(' · ')],
      ['Email', emailAddress],
      ['Phone', phoneNumber],
      ['Date of birth', dateOfBirth && formatDate(dateOfBirth)],
      ['Home address', homeAddress]
    ]
    const earlier = previousRecords.filter((record) => record.endDate)

    return (
      <Segment loading={loading}>
        <div styleName='student-head'>
          <Image src={displayPicture || PLACEHOLDER_PICTURE} size='tiny' circular />
          <Header as='h3'>
            {name}
            <Header.Subheader>{selected.enrolmentNumber}</Header.Subheader>
          </Header>
        </div>
        {this.renderStatus(status, hostelName)}
        <Divider />
        <div styleName='section-label'>From Channeli · read only</div>
        <dl styleName='details'>
          {details.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value || '—'}</dd>
            </React.Fragment>
          ))}
        </dl>
        {earlier.length > 0 && (
          <React.Fragment>
            <Divider />
            <div styleName='section-label'>Earlier residencies</div>
            {earlier.map((record) => (
              <div key={`${record.hostel}-${record.startDate}`} styleName='earlier'>
                {constants.hostels[record.hostel] || record.hostel} · {formatDate(record.startDate)} to {formatDate(record.endDate)}
              </div>
            ))}
          </React.Fragment>
        )}
      </Segment>
    )
  }

  renderForm = (status, hostelName) => {
    const { constants } = this.props
    const {
      roomNo,
      startDate,
      feeStatus,
      insideCampus,
      admissionDate,
      contactNumberAsBhawan,
      addressBhawan,
      fathersName,
      fathersContact,
      mothersName,
      mothersContact,
      registerLoading,
      editLoading
    } = this.state
    const feeOptions = Object.keys(constants.statuses.FEE_TYPES).map((option) => ({
      key: option,
      text: constants.statuses.FEE_TYPES[option],
      value: option
    }))
    const incomplete = !roomNo || !feeStatus
    const isHere = status.key === 'here'

    return (
      <Segment.Group>
        <Segment>
          <Form>
            <Header as='h4' dividing>Room</Header>
            <Form.Group widths='equal'>
              <Form.Input required label='Room no.' name='roomNo' value={roomNo} onChange={this.fieldsChange} />
              <Form.Input label='Date of joining' name='startDate' type='datetime-local' value={startDate} onChange={this.fieldsChange} />
            </Form.Group>
            <Form.Group widths='equal'>
              <Form.Dropdown
                required
                selection
                label='Fee status'
                name='feeStatus'
                placeholder='Choose fee status'
                options={feeOptions}
                value={feeStatus}
                onChange={this.fieldsChange}
              />
              <Form.Field styleName='toggle-field'>
                <Form.Checkbox toggle label='Living inside campus' checked={!!insideCampus} onChange={this.checkedChange} />
              </Form.Field>
            </Form.Group>

            <Header as='h4' dividing>As per bhawan records</Header>
            <Form.Group widths='equal'>
              <Form.Input label='Admission date' name='admissionDate' type='datetime-local' value={admissionDate} onChange={this.fieldsChange} />
              <Form.Input label='Contact number' name='contactNumberAsBhawan' value={contactNumberAsBhawan} onChange={this.fieldsChange} />
            </Form.Group>
            <Form.TextArea label='Home address' name='addressBhawan' rows={2} value={addressBhawan} onChange={this.fieldsChange} />

            <Header as='h4' dividing>Parents</Header>
            <Form.Group widths='equal'>
              <Form.Input label="Father's name" name='fathersName' value={fathersName} onChange={this.fieldsChange} />
              <Form.Input label="Father's contact" name='fathersContact' value={fathersContact} onChange={this.fieldsChange} />
            </Form.Group>
            <Form.Group widths='equal'>
              <Form.Input label="Mother's name" name='mothersName' value={mothersName} onChange={this.fieldsChange} />
              <Form.Input label="Mother's contact" name='mothersContact' value={mothersContact} onChange={this.fieldsChange} />
            </Form.Group>
          </Form>
        </Segment>
        <Segment secondary styleName='form-footer'>
          <span styleName='hint'>* Required. Channeli details are never changed here.</span>
          <div>
            {isHere ? (
              <React.Fragment>
                <Button basic type='button' onClick={this.reloadStudent} disabled={editLoading}>
                  Discard changes
                </Button>
                <Button primary type='button' loading={editLoading} disabled={incomplete || editLoading} onClick={this.editStudent}>
                  Save changes
                </Button>
              </React.Fragment>
            ) : (
              <Button primary type='button' loading={registerLoading} disabled={incomplete || registerLoading} onClick={this.registerStudent}>
                {status.key === 'elsewhere' ? `Move to ${hostelName}` : `Register in ${hostelName}`}
              </Button>
            )}
          </div>
        </Segment>
      </Segment.Group>
    )
  }

  render () {
    const { constants, activeHostel } = this.props
    const { selected, options, name, confirmOpen, deregisterLoading } = this.state
    const hostelName = constants.hostels[activeHostel] || activeHostel
    const status = this.getStatus()

    return (
      <Grid>
        <Grid.Column width={16}>
          <RegistrationTabs active='single' hostelName={hostelName} />
          <Segment>
            <Form>
              <Form.Field>
                <label>Find student</label>
                <div styleName='search-row'>
                  <Dropdown
                    fluid
                    search
                    selection
                    icon='search'
                    placeholder='Enrolment number or name'
                    noResultsMessage='No student found. Only students on Channeli can be registered.'
                    onSearchChange={this.onSearchChange}
                    onChange={this.onChange}
                    value={selected}
                    options={options}
                  />
                  <Button basic type='button' disabled={!selected} onClick={this.clearStudent}>
                    Clear
                  </Button>
                </div>
              </Form.Field>
            </Form>
            <p styleName='hint'>Search by enrolment number or name. Only students on Channeli appear here.</p>
          </Segment>

          {selected && (
            <Grid stackable>
              <Grid.Column width={5}>
                {this.renderStudentCard(status, hostelName)}
              </Grid.Column>
              <Grid.Column width={11}>
                {this.renderForm(status, hostelName)}
                {status.key === 'here' && (
                  <Segment color='red' styleName='danger'>
                    <div>
                      <Header as='h4' color='red'>Deregister from {hostelName}</Header>
                      <p>Ends the residency today. The record stays in Student Database under earlier residencies.</p>
                    </div>
                    <Button basic negative type='button' loading={deregisterLoading} disabled={deregisterLoading} onClick={() => this.setState({ confirmOpen: true })}>
                      Deregister…
                    </Button>
                  </Segment>
                )}
              </Grid.Column>
            </Grid>
          )}

          <Confirm
            open={confirmOpen}
            header={`Deregister ${name}?`}
            content={`This ends their residency in ${hostelName} today.`}
            confirmButton='Deregister'
            onCancel={() => this.setState({ confirmOpen: false })}
            onConfirm={this.deRegisterStudent}
          />
        </Grid.Column>
      </Grid>
    )
  }
}

function mapStateToProps (state) {
  return {
    searchPersonResults: state.searchPersonResults,
    searchResidentResult: state.searchResidentResult,
    activeHostel: state.activeHostel
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    searchPerson: (url, successCallBack) => {
      dispatch(searchPerson(url, successCallBack))
    },
    searchResident: (url, successCallBack, errCallBack) => {
      dispatch(searchResident(url, successCallBack, errCallBack))
    },
    addResident: (data, url, successCallBack, errCallBack) => {
      dispatch(addResident(data, url, successCallBack, errCallBack))
    },
    deregister: (url, successCallBack, errCallBack) => {
      dispatch(deregister(url, successCallBack, errCallBack))
    },
    editResident: (data, url, successCallBack, errCallBack) => {
      dispatch(editResident(data, url, successCallBack, errCallBack))
    },
    fetchPreviousRecords: (url, successCallBack, errCallBack) => {
      dispatch(fetchPreviousRecords(url, successCallBack, errCallBack))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(RegisterStudent)
