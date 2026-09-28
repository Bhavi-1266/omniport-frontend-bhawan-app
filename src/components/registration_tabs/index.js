import React from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'semantic-ui-react'

import { registrationUrl, bulkRegistrationUrl } from '../../urls'

const RegistrationTabs = ({ active }) => (
  <Menu pointing secondary>
    <Menu.Item as={Link} to={registrationUrl()} name='single' active={active === 'single'}>
      Single student
    </Menu.Item>
    <Menu.Item as={Link} to={bulkRegistrationUrl()} name='bulk' active={active === 'bulk'}>
      Bulk upload (CSV)
    </Menu.Item>
  </Menu>
)

export default RegistrationTabs
