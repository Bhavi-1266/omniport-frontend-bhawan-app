import React from 'react'
import { connect } from 'react-redux'
import { toast } from 'react-semantic-toasts'
import moment from 'moment'

import RegistrationTabs from '../registration_tabs'
import {
  Button,
  Form,
  Input,
  Image,
  Grid,
  Container,
  Dropdown,
  Checkbox
} from 'semantic-ui-react'

import { searchPerson } from '../../actions/searchPerson'
import { searchResident } from '../../actions/search-resident'
import { addResident, deregister, editResident } from '../../actions/residents'

import {
  yellowPagesStudentUrl,
  residentSearchUrl, 
  residentUrl, 
  deregisterUrl,
  markInsideUrl,
  markOutUrl,
} from '../../urls'

import './index.css'

class RegisterStudent extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      options: [],
      selected: '',
      enrollmentNo: '',
      name: '',
      roomNo: '',
      startDate: '',
      emailAddress : '',
      currentYear : '',
      currentSemester : '',
      program : '',
      department : '',
      phoneNumber : '',
      insideCampus: '',
      feeStatus: '',
      dateOfBirth :'',
      displayPicture: '',
      loading: false,
      registerLoading: false,
      deregisterLoading: false,
      editLoading: false,
      address: '',
      addressBhawan:'',
      admissionDate:'',
      contactNumberAsBhawan:'',
      state: '',
      city: '',
      country: '',
      postalCode: '',
      fathersName: '',
      fathersContact: '',
      mothersName: '',
      mothersContact: '',
      isResident: false,
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
        text = `${person.person.roles[0].data.enrolmentNumber}`
      }
      return { key: index, text: text, value: person }
    })
    this.setState({
      options: options,
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
    this.setState({ [e.target.name]: e.target.value })
    this.delayedCallback(e)
  }

  searchResidentSuccessCallBack = (res) => {
    this.setState({
      loading: false,
      roomNo: res.roomNumber,
      startDate: moment(res.startDate).format('YYYY-MM-DDThh:mm:ss'),
      emailAddress : res.emailAddress,
      currentYear : res.currentYear,
      currentSemester : res.currentSemester,
      program : res.program,
      department: res.department,
      phoneNumber : res.phoneNumber,
      dateOfBirth : res.dateOfBirth,
      displayPicture : res.displayPicture,
      havingComputer: res.havingComputer,
      insideCampus: res.isLivingInCampus,
      feeStatus: res.feeType,
      address: res.address,
      addressBhawan:res.addressBhawan,
      admissionDate: moment(res.admissionDate).format('YYYY-MM-DDThh:mm:ss'),
      contactNumberAsBhawan: res.contactNumberAsBhawan,
      state: res.state,
      city: res.city,
      postalCode: res.postalCode,
      country: res.country,
      fathersName: res.fathersName,
      fathersContact: res.fathersContact,
      mothersName: res.mothersName,
      mothersContact: res.mothersContact,
      isResident: res.isResident,
    })
  }

  onChange = (e, data) => {
    if (data.name == "enrollment") {
      this.setState({
        roomNo: '',
        feeStatus: '',
      })
    }
    this.setState(
      { selected: data.value,
        name: data.value.person.fullName,
        loading: true,
      })
    this.props.searchResident(
      residentSearchUrl(this.props.activeHostel, data.value.enrolmentNumber),
      this.searchResidentSuccessCallBack
    )
  }

  fieldsChange = (event, { name, value }) => {
    if (this.state.hasOwnProperty(name)) {
      this.setState({ [name]: value })
    }
  }

  checkedChange = (event, {name, checked}) => {
    this.setState({
      insideCampus:checked,
    })
  }

  residentSuccessCallBack = (res) => {
    this.setState({
      errMessage: '',
      registerLoading: false,
      roomNo: '',
      startDate: '',
      enrollmentNo: '',
      feeStatus: '',
      insideCampus: '',
      emailAddress : '',
      currentYear : '',
      currentSemester : '',
      program : '',
      department : '',
      phoneNumber : '',
      dateOfBirth : '',
      displayPicture : '',
      successMessage : 'Student Registered',
      address: '',
      addressBhawan:'',
      admissionDate:'',
      contactNumberAsBhawan:'',
      city: '',
      postalCode: '',
      country: '',
      fathersName: '',
      fathersContact: '',
      mothersName: '',
      mothersContact: '',
      // The selected student stays selected and is now a resident, so keep
      // Register blocked until another student is picked
      isResident: true
    })
    toast({
      type: 'success',
      title: 'Student Registered Succesfully',
      animation: 'fade up',
      icon: 'smile outline',
      time: 4000,
    })
  }

  residentErrCallBack = (err) => {
    // 409 means the backend found an active registration in this bhawan
    const isDuplicate = err.response && err.response.status === 409
    this.setState({
      errMessage: 'Failed to register student',
      successMessage: '',
      registerLoading: false,
      isResident: isDuplicate || this.state.isResident,
    })
    toast({
      type: 'error',
      title: isDuplicate
        ? 'Student is already registered in this bhawan'
        : 'Unable to register Student',
      animation: 'fade up',
      icon: 'frown outline',
      time: 4000,
    })
  }
  residentEditSuccessCallBack = (res) => {
    this.setState({
      errMessage: '',
      editLoading: false,
      roomNo: '',
      startDate: '',
      enrollmentNo: '',
      feeStatus: '',
      insideCampus: '',
      emailAddress : '',
      currentYear : '',
      currentSemester : '',
      program : '',
      department : '',
      phoneNumber : '',
      dateOfBirth : '',
      displayPicture : '',
      successMessage : 'Student Edited Succesfully',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      fathersName: '',
      addressBhawan: '',
      admissionDate: '',
      contactNumberAsBhawan:'',
      fathersContact: '',
      mothersName: '',
      mothersContact: '',
    })
    toast({
      type: 'success',
      title: 'Student Edited Succesfully',
      animation: 'fade up',
      icon: 'smile outline',
      time: 4000,
    })
  }

  residentEditErrCallBack = (err) => {
    this.setState({
      errMessage: 'Failed to edit student',
      successMessage: '',
      editLoading: false,
    })
    toast({
      type: 'error',
      title: 'Unable to register Student',
      animation: 'fade up',
      icon: 'frown outline',
      time: 4000,
    })
  }

  markSuccessCallBack = (res) => {
    toast({
      type: 'success',
      title: res.data,
      animation: 'fade up',
      icon: 'smile outline',
      time: 4000,
    })
  }

  markFailureCallBack = (err) => {
    toast({
      type: 'error',
      title: "Unable to edit student please try again",
      animation: 'fade up',
      icon: 'frown outline',
      time: 4000,
    })
  }

  markInCampus = () => {
    let url = markInsideUrl(this.props.activeHostel, this.state.selected.person.id)
    
    this.props.markResident(
      url,
      this.markSuccessCallBack,
      this.markFailureCallBack
    )
  }

  markOutCampus = () => {
    let url = markOutUrl(this.props.activeHostel, this.state.selected.person.id)
    
    this.props.markResident(
      url,
      this.markSuccessCallBack,
      this.markFailureCallBack
    )
  }

  deRegisterStudent = () => {
    let url = deregisterUrl(this.props.activeHostel, this.state.selected.person.id)
    this.setState({
      deregisterLoading: true,
    })
    this.props.deregister(
      url,
      this.deregisterSuccessCallBack,
      this.deregisterFailureCallBack
    )
  }

  deregisterSuccessCallBack = (res) => {
    this.setState({
      deregisterLoading: false,
      isResident: false,
    })
    toast({
      type: 'success',
      title: res.data,
      animation: 'fade up',
      icon: 'smile outline',
      time: 4000,
    })
  }

  deregisterFailureCallBack = (err) => {
    this.setState({
      deregisterLoading: false,
    })
    toast({
      type: 'error',
      title: "Unable to register student please try again",
      animation: 'fade up',
      icon: 'frown outline',
      time: 4000,
    })
  }

  registerStudent = () => {
    if (this.state.isResident) {
      toast({
        type: 'error',
        title: 'Student is already registered in this bhawan',
        animation: 'fade up',
        icon: 'frown outline',
        time: 4000,
      })
      return
    }
    const {
      selected,
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
      contactNumberAsBhawan,
    } = this.state
    let data = {
      "person" : selected.person.id,
      "room_number" : roomNo,
      "start_date" : startDate,
      "is_living_in_campus" : insideCampus,
      "fee_type" : feeStatus,
      "fathers_name": fathersName,
      "mothers_name": mothersName,
      "fathers_contact": fathersContact,
      "mothers_contact": mothersContact,
      "address_bhawan":addressBhawan,
      "admission_date":admissionDate,
      "contact_number_as_bhawan":contactNumberAsBhawan,
    }
    this.setState({
      registerLoading: true
    })
    this.props.addResident(
      data,
      residentUrl(this.props.activeHostel),
      this.residentSuccessCallBack,
      this.residentErrCallBack
    )
  }
  editStudent = () => {
    const {
      selected,
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
    let data = {
      "room_number" : roomNo,
      "start_date" : startDate,
      "is_living_in_campus" : insideCampus,
      "fee_type" : feeStatus,
      "fathers_name": fathersName,
      "mothers_name": mothersName,
      "fathers_contact": fathersContact,
      "mothers_contact": mothersContact,
      "address_bhawan":addressBhawan,
      "admission_date":admissionDate,
      "contact_number_as_bhawan":contactNumberAsBhawan
    }
    this.setState({
      editLoading: true
    })
    this.props.editResident(
      data,
      `${residentUrl(this.props.activeHostel)}${selected.enrolmentNumber}/`,
      this.residentEditSuccessCallBack,
      this.residentEditErrCallBack
    )
  }

  toggle = () =>
      this.setState((prevState) =>
      ({ havingComputer: !prevState.havingComputer }
        )
    )

  render () {
    const {
      selected,
      options,
      name,
      roomNo,
      startDate,
      emailAddress,
      currentYear,
      currentSemester,
      program,
      department,
      phoneNumber,
      dateOfBirth,
      displayPicture,
      loading,
      address,
      addressBhawan,
      admissionDate,
      contactNumberAsBhawan,
      feeStatus,
      city,
      state,
      country,
      insideCampus,
      postalCode,
      fathersName,
      fathersContact,
      mothersName,
      mothersContact,
      editLoading,
      registerLoading,
      deregisterLoading,
      isResident
    } = this.state
    const { constants } = this.props;
    let feeOptions = [];
    for(const option in constants.statuses.FEE_TYPES) {
      feeOptions = [
        ...feeOptions,
        {
          key: option.toString(),
          text: constants.statuses.FEE_TYPES[option].toString(),
          value: option.toString(),
        }
      ]
    }

    return (
      <React.Fragment>
      <RegistrationTabs active='single' />
      <Grid container centered>
        <Grid.Column width={6} centered>
          <Container centered>
            <Image
              src={displayPicture?
                    displayPicture:
                    "https://react.semantic-ui.com/images/wireframe/square-image.png"
                  }
              size='tiny'
              circular
              centered
            />
            <Form centered>
              <Form.Group>
                <Form.Field >
                  <label>Enrollment No.</label>
                  <Dropdown
                    name='enrollment'
                    onSearchChange={this.onSearchChange}
                    onChange={this.onChange}
                    value={selected}
                    search
                    selection
                    closeOnChange
                    options={options}
                  />
                </Form.Field>
                <Form.Field>
                  <label>Name</label>
                  <Input
                    name='name'
                    value={name}
                    readOnly
                    disabled
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group fluid widths='equal'>
                <Form.Field required>
                  <label>Room No.</label>
                  <Input
                    name='roomNo'
                    value={roomNo}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
                <Form.Field required>
                  <label>Date of Joining in Bhawan</label>
                  <Input
                    name='startDate'
                    type='datetime-local'
                    value={startDate}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group fluid widths='equal'>
                <Form.Field>
                  <label>Inside Campus</label>
                  <Checkbox
                    name='insideCampus'
                    checked={insideCampus}
                    onClick={this.checkedChange}
                  />
                </Form.Field>
                <Form.Field required>
                  <label>Fee Status</label>
                  <Dropdown
                    name='feeStatus'
                    selection
                    options={feeOptions}
                    value={feeStatus}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group fluid widths='equal'>
                <Form.Field>
                  <label>Fathers Name</label>
                  <Input
                    name='fathersName'
                    value={fathersName}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
                <Form.Field>
                  <label>Fathers Contact</label>
                  <Input
                    name='fathersContact'
                    value={fathersContact}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group fluid widths='equal'>
                <Form.Field>
                  <label>Mothers Name</label>
                  <Input
                    name='mothersName'
                    value={mothersName}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
                <Form.Field>
                  <label>Mothers Contact</label>
                  <Input
                    name='mothersContact'
                    value={mothersContact}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group fluid widths='equal'>
                <Form.Field>
                  <label>Student Home Address as per Bhawan Records</label>
                  <Input
                    name='addressBhawan'
                    value={addressBhawan}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group  fluid widths='equal'>
                <Form.Field>
                  <label>Admission Date</label>
                  <Input
                    name='admissionDate'
                    type='datetime-local'
                    value={admissionDate}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
                <Form.Field>
                  <label>Contact Number As Per Bhawan Records</label>
                  <Input
                    name='contactNumberAsBhawan'
                    value={contactNumberAsBhawan}
                    onChange={this.fieldsChange}
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group>
                <Form.Field>
                  <label>Department</label>
                  <Input
                    name="department"
                    value={department}
                    readOnly
                    disabled
                    loading={loading}
                  />
                </Form.Field>
                <Form.Field>
                    <label>Current Semester</label>
                    <Input
                      name="currentSemester"
                      value={currentSemester}
                      readOnly
                      disabled
                      loading={loading}
                    />
                </Form.Field>
              </Form.Group>
              <Form.Group>
                <Form.Field>
                    <label>Current Year</label>
                    <Input
                      name="currentYear"
                      value={currentYear}
                      readOnly
                      disabled
                      loading={loading}
                    />
                </Form.Field>
                <Form.Field>
                  <label>Program</label>
                  <Input
                    name="program"
                    value={program}
                    readOnly
                    disabled
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group>
                <Form.Field>
                    <label>Phone Number</label>
                    <Input
                      name="phoneNumber"
                      value={phoneNumber}
                      readOnly
                      disabled
                      loading={loading}
                    />
                </Form.Field>
                <Form.Field>
                  <label>Date of Birth</label>
                  <Input
                    name="dateOfBirth"
                    value={dateOfBirth}
                    readOnly
                    disabled
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group>
                <Form.Field>
                    <label>Address</label>
                    <Input
                      name="address"
                      value={address}
                      readOnly
                      disabled
                      loading={loading}
                    />
                </Form.Field>
                <Form.Field>
                  <label>City</label>
                  <Input
                    name="city"
                    value={city}
                    readOnly
                    disabled
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group>
                <Form.Field>
                    <label>State</label>
                    <Input
                      name="state"
                      value={state}
                      readOnly
                      disabled
                      loading={loading}
                    />
                </Form.Field>
                <Form.Field>
                  <label>Country</label>
                  <Input
                    name="country"
                    value={country}
                    readOnly
                    disabled
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              <Form.Group>
                <Form.Field>
                  <label>Email Address</label>
                  <Input
                    name="emailAddress"
                    value={emailAddress}
                    readOnly
                    disabled
                    loading={loading}
                  />
                </Form.Field>
                <Form.Field>
                  <label>Postal Code</label>
                  <Input
                    name="postalCode"
                    value={postalCode}
                    readOnly
                    disabled
                    loading={loading}
                  />
                </Form.Field>
              </Form.Group>
              {isResident && (
                <div className='ui negative message'>
                  This student is already registered in this bhawan. Use Edit Resident to update their details.
                </div>
              )}
              <div>
              <Button
                  primary
                  type='submit'
                  loading={editLoading}
                  onClick={this.editStudent}
                  disabled={!roomNo || !selected || !feeStatus}
                >
                  Edit Resident
                </Button>
                <Button
                  primary
                  type='submit'
                  loading={registerLoading}
                  onClick={this.registerStudent}
                  disabled={!roomNo || !selected || !feeStatus || isResident}
                >
                  Register
                </Button>
                <Button
                  secondary
                  type='submit'
                  onClick={this.deRegisterStudent}
                  loading={deregisterLoading}
                  disabled={!selected}
                >
                  Deregister
                </Button>
              </div>
            </Form>
          </Container>
        </Grid.Column>
      </Grid>
      </React.Fragment>
    )
  }
}

function mapStateToProps(state) {
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
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps) (RegisterStudent)