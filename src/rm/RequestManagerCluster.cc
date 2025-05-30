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

#include "RequestManagerCluster.h"
#include "HostPool.h"
#include "PlanPool.h"
#include "VirtualMachinePool.h"
#include "PlanManager.h"
#include "SchedulerManager.h"

using namespace std;

/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */

void RequestManagerCluster::action_generic(
        int                         cluster_id,
        int                         object_id,
        RequestAttributes&          att,
        PoolSQL *                   pool,
        PoolObjectSQL::ObjectType   type,
        bool                        add)
{
    int rc;

    string cluster_name;
    string obj_name;

    Clusterable * cluster_obj = nullptr;

    unique_ptr<PoolObjectSQL> object;

    PoolObjectAuth c_perms;
    PoolObjectAuth obj_perms;

    rc = get_info(clpool, cluster_id, PoolObjectSQL::CLUSTER, att, c_perms,
                  cluster_name, true);

    if ( rc == -1 )
    {
        return;
    }

    rc = get_info(pool, object_id, type, att, obj_perms, obj_name, true);

    if ( rc == -1 )
    {
        return;
    }

    AuthRequest ar(att.uid, att.group_ids);

    ar.add_auth(att.auth_op, c_perms);          // ADMIN  CLUSTER
    ar.add_auth(AuthRequest::ADMIN, obj_perms); // ADMIN  OBJECT

    if (UserPool::authorize(ar) == -1)
    {
        att.resp_msg = ar.message;
        failure_response(AUTHORIZATION, att);

        return;
    }

    // ------------- Set new cluster id in object ---------------------
    get(object_id, object, &cluster_obj);

    if ( object == nullptr )
    {
        att.resp_obj = type;
        att.resp_id  = object_id;
        failure_response(NO_EXISTS, att);
        return;
    }

    if (add)
    {
        rc = cluster_obj->add_cluster(cluster_id);
    }
    else
    {
        rc = cluster_obj->del_cluster(cluster_id);
    }

    if ( rc == -1 )
    {
        success_response(cluster_id, att);
        return;
    }

    pool->update(object.get());

    object.reset();

    // ------------- Add/del object to new cluster ---------------------
    auto cluster = clpool->get(cluster_id);

    if ( cluster == nullptr )
    {
        att.resp_obj = PoolObjectSQL::CLUSTER;
        att.resp_id  = cluster_id;
        failure_response(NO_EXISTS, att);

        // Rollback
        get(object_id, object, &cluster_obj);

        if ( object != nullptr )
        {
            if (add)
            {
                cluster_obj->del_cluster(cluster_id);
            }
            else
            {
                cluster_obj->add_cluster(cluster_id);
            }

            pool->update(object.get());
        }

        return;
    }

    if (add)
    {
        rc = add_object(cluster.get(), object_id, att.resp_msg);
    }
    else
    {
        rc = del_object(cluster.get(), object_id, att.resp_msg);
    }

    if ( rc < 0 )
    {
        cluster.reset();

        failure_response(ACTION, att);

        // Rollback
        get(object_id, object, &cluster_obj);

        if ( object != nullptr )
        {
            if (add)
            {
                cluster_obj->del_cluster(cluster_id);
            }
            else
            {
                cluster_obj->add_cluster(cluster_id);
            }

            pool->update(object.get());
        }

        return;
    }

    clpool->update(cluster.get());

    success_response(cluster_id, att);

    return;
}

/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */

void RequestManagerClusterHost::add_generic(
        int                 cluster_id,
        int                 host_id,
        RequestAttributes&  att)
{
    string cluster_name;
    string obj_name;

    PoolObjectAuth c_perms;
    PoolObjectAuth obj_perms;

    int     old_cluster_id;
    string  old_cluster_name;

    set<int> vm_ids;

    if (get_info(clpool, cluster_id, PoolObjectSQL::CLUSTER, att, c_perms, cluster_name, true) != 0
        || get_info(hpool, host_id, PoolObjectSQL::HOST, att, obj_perms, obj_name, true) != 0)
    {
        return;
    }

    AuthRequest ar(att.uid, att.group_ids);

    ar.add_auth(att.auth_op, c_perms);          // ADMIN  CLUSTER
    ar.add_auth(AuthRequest::ADMIN, obj_perms); // ADMIN  HOST

    if (UserPool::authorize(ar) == -1)
    {
        att.resp_msg = ar.message;
        failure_response(AUTHORIZATION, att);

        return;
    }

    string ccpu;
    string cmem;

    if (auto cluster = clpool->get_ro(cluster_id))
    {
        cluster->get_reserved_capacity(ccpu, cmem);
    }
    else
    {
        att.resp_obj = PoolObjectSQL::CLUSTER;
        att.resp_id  = cluster_id;
        failure_response(NO_EXISTS, att);
        return;
    }

    // ------------- Set new cluster id in object ---------------------
    if ( auto host = hpool->get(host_id) )
    {
        old_cluster_id   = host->get_cluster_id();
        old_cluster_name = host->get_cluster_name();

        if ( old_cluster_id == cluster_id )
        {
            success_response(cluster_id, att);
            return;
        }

        host->set_cluster(cluster_id, cluster_name);
        host->update_reserved_capacity(ccpu, cmem);

        vm_ids = host->get_vm_ids();

        hpool->update(host.get());
    }
    else
    {
        att.resp_obj = PoolObjectSQL::HOST;
        att.resp_id  = host_id;
        failure_response(NO_EXISTS, att);

        return;
    }

    // ------------- Add object to new cluster ---------------------
    auto cluster = clpool->get(cluster_id);

    if ( clpool->add_to_cluster(PoolObjectSQL::HOST, cluster.get(), host_id, att.resp_msg) < 0 )
    {
        failure_response(INTERNAL, att);

        // Rollback
        cluster = clpool->get_ro(old_cluster_id);

        if ( cluster != nullptr )
        {
            cluster->get_reserved_capacity(ccpu, cmem);
        }
        else
        {
            old_cluster_id   = ClusterPool::DEFAULT_CLUSTER_ID;
            old_cluster_name = ClusterPool::DEFAULT_CLUSTER_NAME;

            ccpu = "0";
            cmem = "0";
        }

        if ( auto host = hpool->get(host_id) )
        {
            host->set_cluster(old_cluster_id, old_cluster_name);
            host->update_reserved_capacity(ccpu, cmem);

            hpool->update(host.get());
        }

        return;
    }

    // ------------- Remove host from old cluster ---------------------
    cluster = clpool->get(old_cluster_id);

    if ( cluster == nullptr )
    {
        // This point should be unreachable as old cluster is not empty (host_id)
        success_response(cluster_id, att);
        return;
    }

    if ( clpool->del_from_cluster(PoolObjectSQL::HOST, cluster.get(), host_id, att.resp_msg) < 0 )
    {
        failure_response(INTERNAL, att);
        return;
    }

    // Update cluster quotas and cluster ID in VM
    auto vmpool = Nebula::instance().get_vmpool();

    for (int vm_id : vm_ids)
    {
        VirtualMachineTemplate quota_tmpl;
        int uid = -1, gid = -1;

        if (auto vm = vmpool->get(vm_id))
        {
            if (!vm->hasHistory())
            {
                continue;
            }

            uid = vm->get_uid();
            gid = vm->get_gid();

            vm->get_quota_template(quota_tmpl, true, vm->is_running_quota());

            vm->set_cid(cluster_id);

            vmpool->update_history(vm.get());
            vmpool->update(vm.get());
        }

        // Check cluster quotas on new cluster, remove resources from old cluster
        if (quota_tmpl.empty())
        {
            continue;;
        }

        quota_tmpl.add("SKIP_GLOBAL_QUOTA", true);
        quota_tmpl.replace("CLUSTER_ID", old_cluster_id);

        Quotas::vm_del(uid, gid, &quota_tmpl);

        quota_tmpl.replace("CLUSTER_ID", cluster_id);

        Quotas::vm_add(uid, gid, &quota_tmpl);
    }

    success_response(cluster_id, att);

    return;
}

/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */

void ClusterOptimize::request_execute(xmlrpc_c::paramList const& paramList,
                                      RequestAttributes& att)
{
    int cluster_id = paramList.getInt(1);

    if ( clpool->exist(cluster_id) == -1 )
    {
        att.resp_obj = PoolObjectSQL::CLUSTER;
        att.resp_id  = cluster_id;
        failure_response(NO_EXISTS, att);

        return;
    }

    if (auto plan = plpool->get_ro(cluster_id))
    {
        if (plan->state() == PlanState::APPLYING)
        {
            att.resp_msg = "Can't optimize cluster. A previous plan is currently being applied.";
            failure_response(ACTION, att);

            return;
        }

        Nebula::instance().get_sm()->trigger_optimize(cluster_id);

        success_response(cluster_id, att);
    }
    else
    {
        att.resp_msg = "Can't find plan for existing cluster.";
        failure_response(INTERNAL, att);
    }
}

/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */

void ClusterPlanExecute::request_execute(xmlrpc_c::paramList const& paramList,
                                         RequestAttributes& att)
{
    string error_msg;

    int cluster_id = paramList.getInt(1);

    if ( clpool->exist(cluster_id) == -1 )
    {
        att.resp_obj = PoolObjectSQL::CLUSTER;
        att.resp_id  = cluster_id;
        failure_response(NO_EXISTS, att);

        return;
    }

    Nebula& nd = Nebula::instance();
    auto planm = nd.get_planm();

    if (planm->start_plan(cluster_id, error_msg) != 0)
    {
        att.resp_msg = error_msg;
        failure_response(ACTION, att);

        return;
    };

    success_response(cluster_id, att);
}

/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */

void ClusterPlanDelete::request_execute(xmlrpc_c::paramList const& paramList,
                                        RequestAttributes& att)
{
    int cluster_id = paramList.getInt(1);

    auto cluster = clpool->get(cluster_id);

    if (!cluster)
    {
        att.resp_obj = PoolObjectSQL::CLUSTER;
        att.resp_id  = cluster_id;
        failure_response(NO_EXISTS, att);

        return;
    }

    auto plan = plpool->get(cluster_id);

    if (!plan || plan->state() == PlanState::NONE)
    {
        att.resp_msg = "Plan for cluster " + to_string(cluster_id) + " does not exist";
        failure_response(ACTION, att);

        return;
    }

    plan->clear();

    if (plpool->update(plan.get()) != 0)
    {
        att.resp_msg = "Unable to delete plan for cluster " + to_string(cluster_id);
        failure_response(ACTION, att);

        return;
    }

    success_response(cluster_id, att);
}
