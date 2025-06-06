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
/* eslint-disable jsdoc/require-jsdoc */
import FormWithSchema from '@modules/components/Forms/FormWithSchema'
import { T } from '@ConstantsModule'

import {
  FORM_FIELDS,
  STEP_FORM_SCHEMA,
} from '@modules/components/Forms/Provision/CreateForm/Steps/BasicConfiguration/schema'

export const STEP_ID = 'configuration'

const BasicConfiguration = () => ({
  id: STEP_ID,
  label: T.ProvisionOverview,
  resolver: () => STEP_FORM_SCHEMA,
  optionsValidate: { abortEarly: false },
  content: () => (
    <FormWithSchema cy="form-provision" fields={FORM_FIELDS} id={STEP_ID} />
  ),
})

export default BasicConfiguration
