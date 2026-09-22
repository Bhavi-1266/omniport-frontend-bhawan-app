import React from 'react'
import { connect } from 'react-redux'
import { toast } from 'react-semantic-toasts'

import {
  Button,
  Grid,
  Header,
  Label,
  Message,
  Segment,
  Table
} from 'semantic-ui-react'

import { bulkRegisterResidents } from '../../actions/bulk-register'
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

const emptyFile = {
  fileName: '',
  fileErrors: [],
  ignoredHeaders: [],
  rows: [],
  report: null
}

class BulkRegister extends React.Component {
  state = {
    ...emptyFile,
    submitting: ''
  }

  fileInput = React.createRef()

  handleFileChange = (e) => {
    const file = e.target.files[0]
    // Clearing the input lets the same file be picked again after it is fixed.
    e.target.value = ''
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
      this.successCallBack,
      this.errCallBack
    )
  }

  successCallBack = (res) => {
    this.setState({
      report: res.data,
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

  renderSummary = (invalidRows) => {
    const { rows, report } = this.state
    if (invalidRows.length > 0) {
      return (
        <Message
          negative
          header={`${invalidRows.length} of ${rows.length} rows need fixing`}
          content='They are listed below. Fix them in your sheet, save it as CSV again and choose the file again.'
        />
      )
    }
    if (!report) {
      return (
        <Message
          info
          header={`${rows.length} students are ready`}
          content='Preview the changes so the server can check them. Nothing is saved until you confirm.'
        />
      )
    }
    const { created, updated, existing, skipped } = report.summary
    if (report.dry_run) {
      return (
        <Message
          info={skipped === 0}
          warning={skipped > 0}
          header={`${created} will be created, ${updated} updated, ${existing} unchanged and ${skipped} skipped`}
          content={skipped > 0
            ? 'Skipped rows are marked below with the reason and are left out when you confirm. Nothing has been saved yet.'
            : 'Nothing has been saved yet. Confirm to register these students.'}
        />
      )
    }
    return (
      <Message
        positive
        header='Registration complete'
        content={`${created} created, ${updated} updated, ${existing} unchanged and ${skipped} skipped.`}
      />
    )
  }

  renderStatus = (row, reportRow) => {
    if (row.errors.length > 0) {
      return row.errors.map((error) => <div key={error}>{error}</div>)
    }
    if (reportRow) {
      return (
        <React.Fragment>
          <strong>{ACTION_LABELS[reportRow.action] || reportRow.action}</strong>
          {reportRow.message && <div>{reportRow.message}</div>}
        </React.Fragment>
      )
    }
    return 'Ready'
  }

  render () {
    const { constants, activeHostel } = this.props
    const { fileName, fileErrors, ignoredHeaders, rows, report, submitting } = this.state

    const reportRows = {}
    if (report) {
      report.rows.forEach((reportRow) => { reportRows[reportRow.row_number] = reportRow })
    }
    const hasProblem = (row) =>
      row.errors.length > 0 || (reportRows[row.rowNumber] && reportRows[row.rowNumber].status === 'error')
    // Browser errors block the upload; rows the server skips are only left out of the real run.
    const invalidRows = rows.filter((row) => row.errors.length > 0)
    const visibleRows = invalidRows.length > 0 ? invalidRows : rows
    const toRegister = report ? report.summary.created + report.summary.updated : rows.length
    const previewed = report && report.dry_run && toRegister > 0
    const canSubmit = invalidRows.length === 0 && (!report || report.dry_run)

    return (
      <Grid.Column width={16}>
        <Header as='h4'>Bulk Register Students</Header>
        <p>Students are registered into <strong>{constants.hostels[activeHostel]}</strong>.</p>
        <div styleName='actions'>
          <Button
            basic
            icon='file alternate outline'
            content={fileName || 'Choose CSV file'}
            disabled={!!submitting}
            onClick={() => this.fileInput.current.click()}
          />
          {fileName && (
            <Button basic icon='close' content='Remove file' disabled={!!submitting} onClick={this.removeFile} />
          )}
          <input
            ref={this.fileInput}
            type='file'
            accept='.csv'
            hidden
            onChange={this.handleFileChange}
          />
          <Button
            as='a'
            href={TEMPLATE_HREF}
            download='bulk_register_template.csv'
            basic
            icon='download'
            content='Download template'
          />
        </div>

        {fileErrors.length > 0 && (
          <Message negative header='This file cannot be used' list={fileErrors} />
        )}
        {ignoredHeaders.length > 0 && (
          <Message
            warning
            header='These columns are not used and will be ignored'
            content={ignoredHeaders.join(', ')}
          />
        )}

        {rows.length > 0 && (
          <React.Fragment>
            {this.renderSummary(invalidRows)}
            {canSubmit && (
              <div styleName='actions'>
                <Button
                  primary
                  loading={submitting === 'preview'}
                  disabled={!!submitting}
                  onClick={() => this.submit(true)}
                >
                  Preview changes
                </Button>
                <Button
                  positive
                  loading={submitting === 'register'}
                  disabled={!previewed || !!submitting}
                  onClick={() => this.submit(false)}
                >
                  Confirm and register {toRegister} students
                </Button>
              </div>
            )}
            <div styleName='table-overflow'>
              <Table celled compact unstackable styleName='wide-table'>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell collapsing>Row</Table.HeaderCell>
                    <Table.HeaderCell collapsing>Enrollment No</Table.HeaderCell>
                    <Table.HeaderCell collapsing>Room No</Table.HeaderCell>
                    <Table.HeaderCell collapsing>Seat</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {visibleRows.map((row) => (
                    <Table.Row key={row.rowNumber} negative={hasProblem(row)}>
                      <Table.Cell>{row.rowNumber}</Table.Cell>
                      <Table.Cell>{row.data.enrolment_number}</Table.Cell>
                      <Table.Cell>{row.data.room_no}</Table.Cell>
                      <Table.Cell>{row.data.seat}</Table.Cell>
                      <Table.Cell>{this.renderStatus(row, reportRows[row.rowNumber])}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </React.Fragment>
        )}

        <Segment>
          <Header as='h5'>What the CSV should look like</Header>
          <p>
            Put one student per row with the column headers below in the first row.
            Column order does not matter, and optional columns can be left out.
            An empty cell keeps what is already stored for that student.
            In Excel, save the sheet with File &gt; Save As and pick CSV UTF-8 (Comma delimited).
          </p>
          <div styleName='table-overflow'>
            <Table celled compact unstackable styleName='wide-table'>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Column</Table.HeaderCell>
                  <Table.HeaderCell>Required</Table.HeaderCell>
                  <Table.HeaderCell>Example</Table.HeaderCell>
                  <Table.HeaderCell>Notes</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {COLUMNS.map((column) => (
                  <Table.Row key={column.key}>
                    <Table.Cell>{column.header}</Table.Cell>
                    <Table.Cell>{column.required && 'Yes'}</Table.Cell>
                    <Table.Cell>{column.example}</Table.Cell>
                    <Table.Cell>{column.note}</Table.Cell>
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
