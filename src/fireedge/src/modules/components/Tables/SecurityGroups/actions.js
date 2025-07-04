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
import { Typography } from '@mui/material'
import { Group, Plus, Trash } from 'iconoir-react'
import { useMemo } from 'react'
import { useHistory } from 'react-router-dom'

import { SecurityGroupAPI, useViews } from '@FeaturesModule'
import { Form, PATH } from '@modules/components'

import {
  GlobalAction,
  createActions,
} from '@modules/components/Tables/Enhanced/Utils'

import {
  RESOURCE_NAMES,
  SEC_GROUP_ACTIONS,
  STYLE_BUTTONS,
  T,
} from '@ConstantsModule'
import { Tr, Translate } from '@modules/components/HOC'
const { SecurityGroup, Vm } = Form

const ListSecGroupNames = ({ rows = [] }) =>
  rows?.map?.(({ id, original }) => {
    const { ID, NAME } = original

    return (
      <Typography
        key={`segGroup-${id}`}
        variant="inherit"
        component="span"
        display="block"
      >
        {`#${ID} ${NAME}`}
      </Typography>
    )
  })

const SubHeader = (rows) => <ListSecGroupNames rows={rows} />

const MessageToConfirmAction = (rows, message) => (
  <>
    <ListSecGroupNames rows={rows} />
    {message && (
      <p>
        <Translate word={message} />
      </p>
    )}
    <Translate word={T.DoYouWantProceed} />
  </>
)

/**
 * Generates the actions to operate resources on Security Groups table.
 *
 * @param {object} props - datatable props
 * @param {Function} props.setSelectedRows - set selected rows
 * @returns {GlobalAction} - Actions
 */
const Actions = (props = {}) => {
  const { setSelectedRows } = props
  const history = useHistory()
  const { view, getResourceView } = useViews()
  const [clone] = SecurityGroupAPI.useCloneSegGroupMutation()
  const [changeOwnership] =
    SecurityGroupAPI.useChangeSecGroupOwnershipMutation()
  const [deleteSecGroup] = SecurityGroupAPI.useRemoveSecGroupMutation()
  const [commitSecGroup] = SecurityGroupAPI.useCommitSegGroupMutation()

  const resourcesView = getResourceView(RESOURCE_NAMES.SEC_GROUP)?.actions

  const segGroupActions = useMemo(
    () =>
      createActions({
        filters: resourcesView,
        actions: [
          {
            accessor: SEC_GROUP_ACTIONS.CREATE_DIALOG,
            dataCy: `securityGroup_${SEC_GROUP_ACTIONS.CREATE_DIALOG}`,
            tooltip: T.Create,
            label: T.Create,
            icon: Plus,
            importance: STYLE_BUTTONS.IMPORTANCE.MAIN,
            size: STYLE_BUTTONS.SIZE.MEDIUM,
            type: STYLE_BUTTONS.TYPE.FILLED,
            action: () => {
              history.push(PATH.NETWORK.SEC_GROUPS.CREATE)
            },
          },
          {
            accessor: SEC_GROUP_ACTIONS.UPDATE_DIALOG,
            label: T.Update,
            tooltip: T.Update,
            selected: { max: 1 },
            importance: STYLE_BUTTONS.IMPORTANCE.SECONDARY,
            size: STYLE_BUTTONS.SIZE.MEDIUM,
            type: STYLE_BUTTONS.TYPE.OUTLINED,
            action: (rows) => {
              const secGroups = rows?.[0]?.original ?? {}
              const path = PATH.NETWORK.SEC_GROUPS.CREATE

              history.push(path, secGroups)
            },
          },
          {
            accessor: SEC_GROUP_ACTIONS.CLONE,
            label: T.Clone,
            tooltip: T.Clone,
            selected: true,
            importance: STYLE_BUTTONS.IMPORTANCE.SECONDARY,
            size: STYLE_BUTTONS.SIZE.MEDIUM,
            type: STYLE_BUTTONS.TYPE.OUTLINED,
            options: [
              {
                dialogProps: {
                  title: (rows) => {
                    const isMultiple = rows?.length > 1
                    const { ID, NAME } = rows?.[0]?.original ?? {}

                    return [
                      Tr(isMultiple ? T.CloneSecGroups : T.CloneSecGroup),
                      !isMultiple && `#${ID} ${NAME}`,
                    ]
                      .filter(Boolean)
                      .join(' - ')
                  },
                  dataCy: 'modal-clone',
                },
                form: (rows) => {
                  const names = rows?.map(({ original }) => original?.NAME)
                  const stepProps = { isMultiple: names.length > 1 }
                  const initialValues = { name: `Copy of ${names?.[0]}` }

                  return SecurityGroup.CloneForm({ stepProps, initialValues })
                },
                onSubmit:
                  (rows) =>
                  async ({ prefix, name } = {}) => {
                    const secGroups = rows?.map?.(
                      ({ original: { ID, NAME } = {} }) =>
                        // overwrite all names with prefix+NAME
                        ({
                          id: ID,
                          name: prefix ? `${prefix} ${NAME}` : name,
                        })
                    )

                    await Promise.all(secGroups.map(clone))
                  },
              },
            ],
          },
          {
            accessor: SEC_GROUP_ACTIONS.COMMIT,
            label: T.Commit,
            tooltip: T.Commit,
            selected: true,
            importance: STYLE_BUTTONS.IMPORTANCE.SECONDARY,
            size: STYLE_BUTTONS.SIZE.MEDIUM,
            type: STYLE_BUTTONS.TYPE.OUTLINED,
            options: [
              {
                dialogProps: {
                  title: T.Confirm,
                  dataCy: `modal-${SEC_GROUP_ACTIONS.COMMIT}`,
                },
                form: (rows) => SecurityGroup.CommitForm(),
                onSubmit: (rows) => async (formData) => {
                  const { recover } = formData
                  const ids = rows?.map?.(({ original }) => original?.ID)
                  await Promise.all(
                    ids.map((id) => commitSecGroup({ id, recover }))
                  )
                },
              },
            ],
          },
          {
            tooltip: T.Ownership,
            icon: Group,
            selected: true,
            importance: STYLE_BUTTONS.IMPORTANCE.SECONDARY,
            size: STYLE_BUTTONS.SIZE.MEDIUM,
            type: STYLE_BUTTONS.TYPE.OUTLINED,
            dataCy: 'securityGroup-ownership',
            options: [
              {
                accessor: SEC_GROUP_ACTIONS.CHANGE_OWNER,
                name: T.ChangeOwner,
                dialogProps: {
                  title: T.ChangeOwner,
                  subheader: SubHeader,
                  dataCy: `modal-${SEC_GROUP_ACTIONS.CHANGE_OWNER}`,
                  validateOn: 'onSubmit',
                },
                form: Vm.ChangeUserForm,
                onSubmit: (rows) => async (newOwnership) => {
                  const ids = rows?.map?.(({ original }) => original?.ID)
                  await Promise.all(
                    ids.map((id) => changeOwnership({ id, ...newOwnership }))
                  )
                },
              },
              {
                accessor: SEC_GROUP_ACTIONS.CHANGE_GROUP,
                name: T.ChangeGroup,
                dialogProps: {
                  title: T.ChangeGroup,
                  subheader: SubHeader,
                  dataCy: `modal-${SEC_GROUP_ACTIONS.CHANGE_GROUP}`,
                  validateOn: 'onSubmit',
                },
                form: Vm.ChangeGroupForm,
                onSubmit: (rows) => async (newOwnership) => {
                  const ids = rows?.map?.(({ original }) => original?.ID)
                  await Promise.all(
                    ids.map((id) => changeOwnership({ id, ...newOwnership }))
                  )
                },
              },
            ],
          },
          {
            accessor: SEC_GROUP_ACTIONS.DELETE,
            tooltip: T.Delete,
            icon: Trash,
            importance: STYLE_BUTTONS.IMPORTANCE.DANGER,
            size: STYLE_BUTTONS.SIZE.MEDIUM,
            type: STYLE_BUTTONS.TYPE.OUTLINED,
            selected: { min: 1 },
            dataCy: `secGroups_${SEC_GROUP_ACTIONS.DELETE}`,
            options: [
              {
                isConfirmDialog: true,
                dialogProps: {
                  title: T.Delete,
                  dataCy: `modal-${SEC_GROUP_ACTIONS.DELETE}`,
                  children: MessageToConfirmAction,
                },
                onSubmit: (rows) => async () => {
                  const ids = rows?.map?.(({ original }) => original?.ID)
                  await Promise.all(ids.map((id) => deleteSecGroup({ id })))
                  setSelectedRows && setSelectedRows([])
                },
              },
            ],
          },
        ],
      }),
    [view]
  )

  return segGroupActions
}

export default Actions
