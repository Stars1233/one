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

#include "RequestManagerSecurityGroup.h"
#include "LifeCycleManager.h"
#include "Nebula.h"
#include "SecurityGroupPool.h"

/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */

SecurityGroupCommit::SecurityGroupCommit()
    : Request("one.secgroup.commit", "A:sib",
              "Commit security group changes to VMs")
{
    Nebula& nd  = Nebula::instance();
    pool        = nd.get_secgrouppool();

    auth_object = PoolObjectSQL::SECGROUP;
    auth_op     = AuthRequest::MANAGE;
}

/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */

void SecurityGroupCommit::request_execute(xmlrpc_c::paramList const& paramList,
                                          RequestAttributes& att)
{
    int  oid     = xmlrpc_c::value_int(paramList.getInt(1));
    bool recover = xmlrpc_c::value_boolean(paramList.getBoolean(2));

    LifeCycleManager*  lcm = Nebula::instance().get_lcm();


    if ( basic_authorization(oid, att) == false )
    {
        return;
    }

    auto sg = static_cast<SecurityGroupPool *>(pool)->get(oid);

    if ( sg == 0 )
    {
        att.resp_id = oid;
        failure_response(NO_EXISTS, att);
        return;
    }

    sg->commit(recover);

    pool->update(sg.get());

    lcm->trigger_updatesg(oid);

    success_response(oid, att);

    return;
}

