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
import { useMemo, ReactElement } from 'react'

import { useTheme, Paper, Typography, CircularProgress } from '@mui/material'

import { ProvisionAPI } from '@FeaturesModule'
import { SingleBar } from '@modules/components/Charts'
import NumberEasing from '@modules/components/NumberEasing'
import { groupBy } from '@UtilsModule'
import { T, PROVISIONS_STATES } from '@ConstantsModule'

import useStyles from '@modules/components/Widgets/TotalProvisionsByState/styles'

/**
 * Renders a widget to display the provisions grouped by state.
 *
 * @returns {ReactElement} Total provisions by state
 */
const TotalProvisionsByState = () => {
  const theme = useTheme()
  const classes = useMemo(() => useStyles(theme), [theme])
  const { data: provisions = [], isLoading } =
    ProvisionAPI.useGetProvisionsQuery()
  const totalProvisions = provisions?.length

  const chartData = useMemo(() => {
    const groups = groupBy(provisions, 'TEMPLATE.BODY.state')

    return PROVISIONS_STATES.map(
      (_, stateIndex) => groups[stateIndex]?.length ?? 0
    )
  }, [totalProvisions])

  return (
    <Paper
      data-cy="dashboard-widget-provisions-by-states"
      className={classes.root}
    >
      <div className={classes.title}>
        <Typography className={classes.titlePrimary}>
          {isLoading ? (
            <CircularProgress size={20} />
          ) : (
            <NumberEasing value={totalProvisions} />
          )}
          <span>{T.Provisions}</span>
        </Typography>
        <Typography className={classes.titleSecondary}>{T.InTotal}</Typography>
      </div>
      <div className={classes.content}>
        <SingleBar
          legend={PROVISIONS_STATES}
          data={chartData}
          total={totalProvisions}
        />
      </div>
    </Paper>
  )
}

TotalProvisionsByState.displayName = 'TotalProvisionsByState'

export default TotalProvisionsByState
