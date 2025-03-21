/* -------------------------------------------------------------------------- */
/* Copyright 2002-2025, OpenNebula Project, OpenNebula Systems                */
/*                                                                            */
/* Licensed under the Apache License, Version 2.0 (the "License"); you may    */
/* not use this file except in compliance with the License. You may obtain    */
/* a copy of the License at                                                   */
/*                                                                            */
/* http://www.apache.org/licenses/LICENSE-2.0                                 */
/*                                                                            */
/* Unless required by applicable law or agreed to in writing, software        */
/* distributed under the License is distributed on an "AS IS" BASIS,          */
/* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   */
/* See the License for the specific language governing permissions and        */
/* limitations under the License.                                             */
/* -------------------------------------------------------------------------- */

define(function(require) {
  var Locale = require('utils/locale');
  var Tips = require('utils/tips');

  var VNetButtons = {
    "VNTemplate.refresh" : {
      type: "action",
      layout: "refresh",
      alwaysActive: true
    },
    "VNTemplate.create_dialog" : {
      type: "create_dialog",
      layout: "create"
    },
    "VNTemplate.update_dialog" : {
      type: "action",
      layout: "main",
      text: Locale.tr("Update")
    },
    "VNTemplate.instantiate_vnets" : {
      type: "action",
      text:  Locale.tr("Instantiate"),
      layout: "main"
    },
    "VNTemplate.addtocluster" : {
      type : "action",
      layout: "main",
      text : Locale.tr("Select cluster"),
      custom_classes: "only-sunstone-info"
    },
    "VNTemplate.chown" : {
      type: "confirm_with_select",
      text: Locale.tr("Change owner"),
      layout: "user_select",
      select: "User",
      tip: Locale.tr("Select the new owner")
    },

    "VNTemplate.chgrp" : {
      type: "confirm_with_select",
      text: Locale.tr("Change group"),
      layout: "user_select",
      select: "Group",
      tip: Locale.tr("Select the new group")
    },

    "VNTemplate.delete" : {
      type: "confirm",
      layout: "del",
      text: Locale.tr("Delete")
    },
    "VNTemplate.edit_labels" : {
      layout: "labels",
    },
    // "VNTemplate.lockA" : {
    //   type: "action",
    //   text: Locale.tr("Admin"),
    //   layout: "lock_buttons",
    //   data: 3
    // },
    // "VNTemplate.lockM" : {
    //   type: "action",
    //   text: Locale.tr("Manage"),
    //   layout: "lock_buttons",
    //   data: 2
    // },
    "VNTemplate.lockU" : {
      type: "action",
      text: Locale.tr("Lock"),
      layout: "lock_buttons",
      data: 1
    },
    "VNTemplate.unlock" : {
      type: "action",
      text: Locale.tr("Unlock"),
      layout: "lock_buttons"
    }
  };

  return VNetButtons;
})
