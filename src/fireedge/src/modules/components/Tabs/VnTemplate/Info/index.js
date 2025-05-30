/* ------------------------------------------------------------------------- *
 * Copyright 2002-2025, OpenNebula Project, OpenNebula Systems               *
 *                                                                           *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may   *
 * not use this file except in compliance with the License. You may obtain   *
 * a copy of the License at                                                  *
 *                                                                           *
 * http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                           *
 * Unless required by applicable law or agreed to in writing, software       *
 * distributed under the License is distributed on an "AS IS" BASIS,         *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 * See the License for the specific language governing permissions and       *
 * limitations under the License.                                            *
 * ------------------------------------------------------------------------- */
import { Box, Stack } from '@mui/material'
import PropTypes from 'prop-types'
import { ReactElement, useCallback } from 'react'

import {
  AttributePanel,
  Ownership,
  Permissions,
} from '@modules/components/Tabs/Common'
import QOS from '@modules/components/Tabs/Vn/Info/qos'
import Information from '@modules/components/Tabs/VnTemplate/Info/information'
import { VnTemplateAPI } from '@FeaturesModule'

import { Tr } from '@modules/components/HOC'
import { T } from '@ConstantsModule'
import { filterAttributes, getActionsAvailable, jsonToXml } from '@ModelsModule'
import { cloneObject, set } from '@UtilsModule'

const LXC_ATTRIBUTES_REG = /^LXC_/
const HIDDEN_ATTRIBUTES_REG =
  /^(AR|CLUSTERS|SECURITY_GROUPS|INBOUND_AVG_BW|INBOUND_PEAK_BW|INBOUND_PEAK_KB|OUTBOUND_AVG_BW|OUTBOUND_PEAK_BW|OUTBOUND_PEAK_KB)$/

/**
 * Renders mainly information tab.
 *
 * @param {object} props - Props
 * @param {object} props.tabProps - Tab information
 * @param {string} props.id - Virtual network template id
 * @returns {ReactElement} Information tab
 */
const VNetTemplateInfoTab = ({ tabProps = {}, id }) => {
  const {
    information_panel: informationPanel,
    permissions_panel: permissionsPanel,
    ownership_panel: ownershipPanel,
    qos_panel: qosPanel,
    attributes_panel: attributesPanel,
    lxc_panel: lxcPanel,
  } = tabProps

  const [changeOwnership] = VnTemplateAPI.useChangeVNTemplateOwnershipMutation()
  const [changePermissions] =
    VnTemplateAPI.useChangeVNTemplatePermissionsMutation()
  const [update] = VnTemplateAPI.useUpdateVNTemplateMutation()
  const { data: vnetTemplate } = VnTemplateAPI.useGetVNTemplateQuery({ id })

  const { UNAME, UID, GNAME, GID, PERMISSIONS, TEMPLATE } = vnetTemplate

  const { attributes, lxc: lxcAttributes } = filterAttributes(TEMPLATE, {
    extra: {
      lxc: LXC_ATTRIBUTES_REG,
    },
    hidden: HIDDEN_ATTRIBUTES_REG,
  })

  const handleChangeOwnership = async (newOwnership) => {
    await changeOwnership({ id, ...newOwnership })
  }

  const handleChangePermission = async (newPermission) => {
    await changePermissions({ id, ...newPermission })
  }

  const handleAttributeInXml = async (path, newValue) => {
    const newTemplate = cloneObject(TEMPLATE)
    set(newTemplate, path, newValue)

    const xml = jsonToXml(newTemplate)
    await update({ id, template: xml, replace: 0 })
  }

  const getActions = useCallback(
    (actions) => getActionsAvailable(actions),
    [getActionsAvailable]
  )

  const ATTRIBUTE_FUNCTION = {
    handleAdd: handleAttributeInXml,
    handleEdit: handleAttributeInXml,
    handleDelete: handleAttributeInXml,
  }

  return (
    <Stack
      display="grid"
      gap="1em"
      gridTemplateColumns="repeat(auto-fit, minmax(49%, 1fr))"
      padding={{ sm: '0.8em' }}
    >
      {informationPanel?.enabled && (
        <Information
          vnetTemplate={vnetTemplate}
          actions={getActions(informationPanel?.actions)}
        />
      )}
      {permissionsPanel?.enabled && (
        <Permissions
          actions={getActions(permissionsPanel?.actions)}
          handleEdit={handleChangePermission}
          ownerUse={PERMISSIONS.OWNER_U}
          ownerManage={PERMISSIONS.OWNER_M}
          ownerAdmin={PERMISSIONS.OWNER_A}
          groupUse={PERMISSIONS.GROUP_U}
          groupManage={PERMISSIONS.GROUP_M}
          groupAdmin={PERMISSIONS.GROUP_A}
          otherUse={PERMISSIONS.OTHER_U}
          otherManage={PERMISSIONS.OTHER_M}
          otherAdmin={PERMISSIONS.OTHER_A}
        />
      )}
      {ownershipPanel?.enabled && (
        <Ownership
          actions={getActions(ownershipPanel?.actions)}
          handleEdit={handleChangeOwnership}
          userId={UID}
          userName={UNAME}
          groupId={GID}
          groupName={GNAME}
        />
      )}
      {qosPanel?.enabled && (
        <Box
          sx={{
            gridColumn: '1 / -1',
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '1rem',
          }}
        >
          <QOS vnet={vnetTemplate} />
        </Box>
      )}
      {attributesPanel?.enabled && attributes && (
        <AttributePanel
          {...ATTRIBUTE_FUNCTION}
          attributes={attributes}
          actions={getActions(attributesPanel?.actions)}
          title={Tr(T.Attributes)}
        />
      )}
      {lxcPanel?.enabled && lxcAttributes && (
        <AttributePanel
          {...ATTRIBUTE_FUNCTION}
          actions={getActions(lxcPanel?.actions)}
          attributes={lxcAttributes}
          title={`LXC ${Tr(T.Information)}`}
        />
      )}
    </Stack>
  )
}

VNetTemplateInfoTab.propTypes = {
  tabProps: PropTypes.object,
  id: PropTypes.string,
}

VNetTemplateInfoTab.displayName = 'VNetTemplateInfoTab'

export default VNetTemplateInfoTab
