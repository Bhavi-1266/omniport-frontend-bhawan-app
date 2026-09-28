import React from 'react'
import { Link } from 'react-router-dom'
import { Header, Menu } from 'semantic-ui-react'

import { registrationUrl, bulkRegistrationUrl } from '../../urls'

const RegistrationTabs = ({ active, hostelName }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <Header as='h2'>
      Register New Student
      <Header.Subheader>
        Registering into <strong>{hostelName}</strong>. Change the bhawan from the navbar.
      </Header.Subheader>
    </Header>
    <Menu pointing secondary>
      <Menu.Item as={Link} to={registrationUrl()} name='single' active={active === 'single'}>
        Single student
      </Menu.Item>
      <Menu.Item as={Link} to={bulkRegistrationUrl()} name='bulk' active={active === 'bulk'}>
        Bulk upload (CSV)
      </Menu.Item>
    </Menu>
  </div>
)

export default RegistrationTabs
