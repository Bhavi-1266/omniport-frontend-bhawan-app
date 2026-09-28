import React from 'react'
import { connect } from 'react-redux'
import { toast } from 'react-semantic-toasts'

import {
  Button,
  Grid,
  Header,
  Icon,
  Label,
  Message,
  Segment,
  Statistic,
  Step,
  Table
} from 'semantic-ui-react'

import { bulkRegisterResidents } from '../../actions/bulk-register'
import RegistrationTabs from '../registration_tabs'
import { bulkRegisterResidentsUrl } from '../../urls'
import { COLUMNS, TEMPLATE_CSV, checkResidentsCsv } from './residents-csv'

import './index.css'

const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`

const ACTION_LABELS = {
  would_create: 'Will be created',
  would_update: 'Will be updated',
  created: 'Created',
  updated: 'Updated',
  existing: 'No change',
  skipped: 'Skipped'
}

// Groups a report action under the filter and summary key it counts towards
const ACTION_GROUPS = {
  would_create: 'created',
  created: 'created',
  would_update: 'updated',
  updated: 'updated',
  existing: 'existing',
  skipped: 'skipped'
}

const GROUP_COLORS = {
  created: 'blue',
  updated: 'teal',
  existing: 'grey',
  skipped: 'red'
}

const emptyFile = {
  fileName: '',
  fileErrors: [],
  ignoredHeaders: [],
  rows: [],
  report: null,
  reportHostel: null,
  filter: 'all'
}

class BulkRegister extends React.Component {
  state = {
    ...emptyFile,
    submitting: '',
    dragging: false
  }

  fileInput = React.createRef()

  chooseFile = () => {
    this.fileInput.current.click()
  }

  handleFileChange = (e) => {
    const file = e.target.files[0]
    // Clearing the input lets the same file be picked again after it is fixed.
    e.target.value = ''
    this.readFile(file)
  }

  handleDragOver = (e) => {
    e.preventDefault()
    if (!this.state.dragging) {
      this.setState({ dragging: true })
    }
  }

  handleDragLeave = () => {
    this.setState({ dragging: false })
  }

  handleDrop = (e) => {
    e.preventDefault()
    this.setState({ dragging: false })
    this.readFile(e.dataTransfer.files[0])
  }

  readFile = (file) => {
    if (!file) {
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.setState({
        ...emptyFile,
        fileName: file.name,
        fileErrors: [
          `"${file.name}" is not a CSV file. In Excel use File > Save As and pick "CSV UTF-8 (Comma delimited)".`
        ]
      })
      return
    }
    const { constants } = this.props
    file.text().then(
      (text) => {
        this.setState({
          ...emptyFile,
          fileName: file.name,
          ...checkResidentsCsv(text, { feeTypes: constants.statuses.FEE_TYPES })
        })
      },
      () => {
        this.setState({
          ...emptyFile,
          fileName: file.name,
          fileErrors: [`"${file.name}" could not be read. Choose the file again.`]
        })
      }
    )
  }

  removeFile = () => {
    this.setState(emptyFile)
  }

  submit = (dryRun) => {
    const { activeHostel } = this.props
    this.setState({ submitting: dryRun ? 'preview' : 'register' })
    this.props.bulkRegisterResidents(
      bulkRegisterResidentsUrl(activeHostel),
      {
        dry_run: dryRun,
        rows: this.state.rows.map((row) => ({ row_number: row.rowNumber, hostel_code: activeHostel, ...row.data }))
      },
      (res) => this.successCallBack(res, activeHostel),
      this.errCallBack
    )
  }

  successCallBack = (res, hostel) => {
    this.setState({
      report: res.data,
      reportHostel: hostel,
      filter: 'all',
      submitting: ''
    })
    if (!res.data.dry_run) {
      toast({
        type: 'success',
        title: 'Students registered successfully',
        animation: 'fade up',
        icon: 'smile outline',
        time: 4000
      })
    }
  }

  errCallBack = (err) => {
    this.setState({
      submitting: ''
    })
    const data = err.response && err.response.data
    toast({
      type: 'error',
      title: 'Unable to register students',
      description: (data && data.detail) || 'Please try again',
      animation: 'fade up',
      icon: 'frown outline',
      time: 4000
    })
  }

  renderSteps = (step, invalidCount, report) => {
    const { rows } = this.state
    const done = report && !report.dry_run
    return (
      <Step.Group ordered fluid widths={4} size='small'>
        <Step completed={rows.length > 0} active={step === 1}>
          <Step.Content>
            <Step.Title>Upload file</Step.Title>
            <Step.Description>{rows.length > 0 ? `${rows.length} rows read` : 'Choose a CSV'}</Step.Description>
          </Step.Content>
        </Step>
        <Step completed={rows.length > 0 && invalidCount === 0} active={step === 2} disabled={rows.length === 0}>
          <Step.Content>
            <Step.Title>Check rows</Step.Title>
            <Step.Description>
              {invalidCount > 0 ? `${invalidCount} rows need fixing` : rows.length > 0 ? 'All rows valid' : 'In your browser'}
            </Step.Description>
          </Step.Content>
        </Step>
        <Step completed={!!report} active={step === 3} disabled={step < 3}>
          <Step.Content>
            <Step.Title>Preview</Step.Title>
            <Step.Description>Nothing saved yet</Step.Description>
          </Step.Content>
        </Step>
        <Step completed={done} disabled={!done}>
          <Step.Content>
            <Step.Title>Confirm</Step.Title>
            <Step.Description>Register students</Step.Description>
          </Step.Content>
        </Step>
      </Step.Group>
    )
  }

  renderUpload = () => {
    const { constants } = this.props
    const { fileErrors, dragging } = this.state
    return (
      <Grid stackable>
        <Grid.Column width={9}>
          <div
            styleName={dragging ? 'dropzone dragging' : 'dropzone'}
            onDragOver={this.handleDragOver}
            onDragLeave={this.handleDragLeave}
            onDrop={this.handleDrop}
          >
            <Icon name='upload' size='big' color='blue' />
            <Header as='h3'>Drop your CSV file here</Header>
            <span styleName='muted'>or</span>
            <Button primary type='button' onClick={this.chooseFile}>Choose file</Button>
            <span styleName='muted'>CSV UTF-8, one student per row</span>
          </div>
          {fileErrors.length > 0 && (
            <Message negative header='This file cannot be used' list={fileErrors} />
          )}
          <Segment>
            <Header as='h4'>Before you upload</Header>
            <ul styleName='tips'>
              <li>Students must already be on Channeli. Anyone else is skipped and listed with the reason.</li>
              <li>An empty cell keeps what is already stored for that student.</li>
              <li>Room No and Seat are saved together, like A-101-B, in 10 characters or fewer.</li>
              <li>In Excel, use File &gt; Save As &gt; CSV UTF-8 (Comma delimited).</li>
            </ul>
            <Button
              as='a'
              href={TEMPLATE_HREF}
              download='bulk_register_template.csv'
              basic
              icon='download'
              content='Download template'
            />
          </Segment>
        </Grid.Column>
        <Grid.Column width={7}>
          <Segment>
            <Header as='h4'>CSV columns</Header>
            <div styleName='table-overflow'>
              <Table celled compact unstackable>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Column</Table.HeaderCell>
                    <Table.HeaderCell>Required</Table.HeaderCell>
                    <Table.HeaderCell>Example</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {COLUMNS.map((column) => (
                    <Table.Row key={column.key} title={column.note}>
                      <Table.Cell>{column.required ? <strong>{column.header}</strong> : column.header}</Table.Cell>
                      <Table.Cell>{column.required && 'Yes'}</Table.Cell>
                      <Table.Cell>{column.example}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
            <Header as='h5'>Fee types</Header>
            <Label.Group size='small'>
              {Object.values(constants.statuses.FEE_TYPES).map((label) => (
                <Label key={label}>{label}</Label>
              ))}
            </Label.Group>
          </Segment>
        </Grid.Column>
      </Grid>
    )
  }

  renderFileBar = (report) => {
    const { fileName, rows, submitting } = this.state
    const done = report && !report.dry_run
    let detail = 'checked in your browser, nothing sent yet'
    if (report) {
      detail = done ? 'registered' : 'checked by the server as a dry run'
    }
    return (
      <Segment styleName='file-bar'>
        <Icon name='file alternate outline' size='large' />
        <div styleName='file-name'>
          <strong>{fileName}</strong>
          <span styleName='muted'>{rows.length} rows · {detail}</span>
        </div>
        <Button basic type='button' disabled={!!submitting} onClick={this.chooseFile}>
          {done ? 'Upload another file' : 'Choose another file'}
        </Button>
        {!done && (
          <Button basic type='button' disabled={!!submitting} onClick={this.removeFile}>Remove</Button>
        )}
      </Segment>
    )
  }

  renderInvalid = (invalidRows) => {
    const { rows } = this.state
    return (
      <React.Fragment>
        <Message
          negative
          icon='exclamation circle'
          header={`${invalidRows.length} of ${rows.length} rows need fixing`}
          content={`Fix them in your sheet, save it as CSV again and choose the file again. The other ${rows.length - invalidRows.length} rows are fine.`}
        />
        <div styleName='table-overflow'>
          <Table celled unstackable>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell collapsing>Row</Table.HeaderCell>
                <Table.HeaderCell collapsing>Enrollment No</Table.HeaderCell>
                <Table.HeaderCell collapsing>Room No</Table.HeaderCell>
                <Table.HeaderCell collapsing>Seat</Table.HeaderCell>
                <Table.HeaderCell>What to fix</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {invalidRows.map((row) => (
                <Table.Row key={row.rowNumber} negative>
                  <Table.Cell>{row.rowNumber}</Table.Cell>
                  <Table.Cell>{row.data.enrolment_number}</Table.Cell>
                  <Table.Cell>{row.data.room_no}</Table.Cell>
                  <Table.Cell>{row.data.seat}</Table.Cell>
                  <Table.Cell>{row.errors.map((error) => <div key={error}>{error}</div>)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
        <div styleName='action-bar'>
          <span styleName='muted'>Fix the rows above to preview.</span>
          <Button primary disabled>Preview changes</Button>
        </div>
      </React.Fragment>
    )
  }

  renderReady = () => {
    const { rows, submitting } = this.state
    return (
      <React.Fragment>
        <Message
          info
          header={`${rows.length} students are ready`}
          content='Preview the changes so the server can check them. Nothing is saved until you confirm.'
        />
        <Segment styleName='action-bar'>
          <span styleName='muted'>The preview runs every row on the server and saves nothing.</span>
          <Button primary loading={submitting === 'preview'} disabled={!!submitting} onClick={() => this.submit(true)}>
            Preview changes
          </Button>
        </Segment>
      </React.Fragment>
    )
  }

  renderReport = (report) => {
    const { rows, filter, submitting } = this.state
    const { summary } = report
    const done = !report.dry_run
    const toRegister = summary.created + summary.updated
    const reportRows = {}
    report.rows.forEach((reportRow) => { reportRows[reportRow.row_number] = reportRow })
    const groupOf = (row) => reportRows[row.rowNumber] && ACTION_GROUPS[reportRows[row.rowNumber].action]
    const visibleRows = filter === 'all' ? rows : rows.filter((row) => groupOf(row) === filter)
    const tiles = [
      ['created', done ? 'Created' : 'Will be created'],
      ['updated', done ? 'Updated' : 'Will be updated'],
      ['existing', 'No change'],
      ['skipped', 'Skipped']
    ]

    return (
      <React.Fragment>
        <Segment>
          <Statistic.Group widths='four' size='small'>
            {tiles.map(([key, label]) => (
              <Statistic key={key} color={key === 'skipped' && summary.skipped > 0 ? 'red' : undefined}>
                <Statistic.Value>{summary[key]}</Statistic.Value>
                <Statistic.Label>{label}</Statistic.Label>
              </Statistic>
            ))}
          </Statistic.Group>
        </Segment>
        {done ? (
          <Message positive header='Registration complete' content={`${toRegister} students registered into this bhawan.`} />
        ) : (
          summary.skipped > 0 && (
            <Message warning content='Skipped rows are marked below with the reason and are left out when you confirm.' />
          )
        )}
        <Segment attached='top' styleName='filters'>
          <Button.Group basic size='small'>
            <Button active={filter === 'all'} onClick={() => this.setState({ filter: 'all' })}>All {rows.length}</Button>
            {tiles.map(([key, label]) => (
              <Button key={key} active={filter === key} disabled={summary[key] === 0} onClick={() => this.setState({ filter: key })}>
                {label} {summary[key]}
              </Button>
            ))}
          </Button.Group>
        </Segment>
        <div styleName='table-overflow'>
          <Table celled unstackable attached='bottom'>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell collapsing>Row</Table.HeaderCell>
                <Table.HeaderCell collapsing>Enrollment No</Table.HeaderCell>
                <Table.HeaderCell collapsing>Room</Table.HeaderCell>
                <Table.HeaderCell collapsing>Result</Table.HeaderCell>
                <Table.HeaderCell>Note</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {visibleRows.map((row) => {
                const reportRow = reportRows[row.rowNumber] || {}
                const group = ACTION_GROUPS[reportRow.action]
                return (
                  <Table.Row key={row.rowNumber} negative={reportRow.status === 'error'}>
                    <Table.Cell>{row.rowNumber}</Table.Cell>
                    <Table.Cell>{row.data.enrolment_number}</Table.Cell>
                    <Table.Cell>{row.data.seat ? `${row.data.room_no}-${row.data.seat}` : row.data.room_no}</Table.Cell>
                    <Table.Cell>
                      <Label size='small' color={GROUP_COLORS[group]} basic={group !== 'skipped'}>
                        {ACTION_LABELS[reportRow.action] || reportRow.action}
                      </Label>
                    </Table.Cell>
                    <Table.Cell>{reportRow.message}</Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        </div>
        {!done && (
          <Segment styleName='action-bar'>
            <span>Nothing is saved until you confirm.</span>
            <div>
              <Button basic type='button' disabled={!!submitting} onClick={this.chooseFile}>Choose another file</Button>
              <Button
                primary
                loading={submitting === 'register'}
                disabled={toRegister === 0 || !!submitting}
                onClick={() => this.submit(false)}
              >
                Confirm and register {toRegister} students
              </Button>
            </div>
          </Segment>
        )}
      </React.Fragment>
    )
  }

  render () {
    const { constants, activeHostel } = this.props
    const { fileName, ignoredHeaders, rows, reportHostel } = this.state
    const hostelName = constants.hostels[activeHostel] || activeHostel
    // A report only applies to the bhawan it was made for.
    const report = reportHostel === activeHostel ? this.state.report : null
    const invalidRows = rows.filter((row) => row.errors.length > 0)
    let step = 1
    if (rows.length > 0) {
      step = invalidRows.length > 0 ? 2 : 3
    }

    return (
      <Grid.Column width={16}>
        <RegistrationTabs active='bulk' hostelName={hostelName} />
        <input
          ref={this.fileInput}
          type='file'
          accept='.csv'
          hidden
          onChange={this.handleFileChange}
        />
        {this.renderSteps(step, invalidRows.length, report)}

        {rows.length === 0 ? this.renderUpload() : (
          <React.Fragment>
            {fileName && this.renderFileBar(report)}
            {ignoredHeaders.length > 0 && (
              <Message
                warning
                header='These columns are not used and will be ignored'
                content={ignoredHeaders.join(', ')}
              />
            )}
            {invalidRows.length > 0
              ? this.renderInvalid(invalidRows)
              : report ? this.renderReport(report) : this.renderReady()}
          </React.Fragment>
        )}
      </Grid.Column>
    )
  }
}

function mapStateToProps (state) {
  return {
    activeHostel: state.activeHostel
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    bulkRegisterResidents: (url, data, successCallBack, errCallBack) => {
      dispatch(bulkRegisterResidents(url, data, successCallBack, errCallBack))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BulkRegister)
