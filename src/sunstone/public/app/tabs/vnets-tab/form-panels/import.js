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
  /*
    DEPENDENCIES
   */

//  require('foundation.tab');
  var BaseFormPanel = require('utils/form-panels/form-panel');
  var Sunstone = require('sunstone');
  var Locale = require('utils/locale');
  var VCenterNetworks = require('utils/vcenter/networks');
  var HostsTable = require('tabs/hosts-tab/datatable');
  var UniqueId = require('utils/unique-id');
  var Notifier = require('utils/notifier');

  /*
    TEMPLATES
   */

  var TemplateHTML = require('hbs!./import/html');

  /*
    CONSTANTS
   */

  var FORM_PANEL_ID = require('./import/formPanelId');
  var TAB_ID = require('../tabId');

  /*
    CONSTRUCTOR
   */

  function FormPanel() {
    this.formPanelId = FORM_PANEL_ID;
    this.tabId = TAB_ID;
    this.actions = {
      'import': {
        'title': Locale.tr("Import vCenter Networks"),
        'buttonText': Locale.tr("Import"),
        'resetButton': true
      }
    };

    this.vCenterNetworks = new VCenterNetworks();

    var options = {
      'select': true,
      'selectOptions': {
        'multiple_choice': false,
        "filter_fn": function(host) { return host.VM_MAD === "vcenter" && host.IM_MAD === "vcenter"; }
      }
    };
    this.hostsTable = new HostsTable('HostsTable' + UniqueId.id(), options);

    BaseFormPanel.call(this);
  }

  FormPanel.FORM_PANEL_ID = FORM_PANEL_ID;
  FormPanel.prototype = Object.create(BaseFormPanel.prototype);
  FormPanel.prototype.constructor = FormPanel;
  FormPanel.prototype.htmlWizard = _htmlWizard;
  FormPanel.prototype.submitWizard = _submitWizard;
  FormPanel.prototype.onShow = _onShow;
  FormPanel.prototype.setup = _setup;

  return FormPanel;

  /*
    FUNCTION DEFINITIONS
   */

  function _htmlWizard() {
    return TemplateHTML({
      'formPanelId': this.formPanelId,
      'vCenterHostsHTML': this.hostsTable.dataTableHTML,
      'vCenterNetworksHTML': this.vCenterNetworks.html()
    });
  }

  function _setup(context) {
    var that = this;
    this.hostsTable.initialize();
    this.hostsTable.refreshResourceTableSelect();

    $(context).off("click", "#get-vcenter-networks");
    $(context).on("click", "#get-vcenter-networks", function(){
      var selectedHost = that.hostsTable.retrieveResourceTableSelect();
      if (selectedHost !== ""){
        that.vCenterNetworks.insert({
          container: context,
          selectedHost: selectedHost
        });
        $("#import_vcenter_networks", this.parentElement).prop("disabled", false);
      }
      else {
        Notifier.notifyMessage("You need select a vCenter host first");
      }
    });

    $(context).off("click", "#import_vcenter_networks");
    $(context).on("click", "#import_vcenter_networks", function(){
      that.vCenterNetworks.import(context);
      return false;
    });

    return false;
  }

  function _submitWizard(context) {
    var that = this;

    Sunstone.hideFormPanelLoading(TAB_ID);

    this.vCenterNetworks.import(context.closest("#import_networks_form_wrapper"));

    return false;
  }

  function _onShow(context) {
    $("#vnets-tab .submit_button").hide();
  }
});
