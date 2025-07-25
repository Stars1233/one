/* ------------------------------------------------------------------------ */
/* Copyright 2002-2025, OpenNebula Project, OpenNebula Systems              */
/*                                                                          */
/* Licensed under the Apache License, Version 2.0 (the "License"); you may  */
/* not use this file except in compliance with the License. You may obtain  */
/* a copy of the License at                                                 */
/*                                                                          */
/* http://www.apache.org/licenses/LICENSE-2.0                               */
/*                                                                          */
/* Unless required by applicable law or agreed to in writing, software      */
/* distributed under the License is distributed on an "AS IS" BASIS,        */
/* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. */
/* See the License for the specific language governing permissions and      */
/* limitations under the License.                                           */
/* ------------------------------------------------------------------------ */

#ifndef HOST_SHARE_PCI_H_
#define HOST_SHARE_PCI_H_

#include "ObjectXML.h"
#include "Template.h"
#include <time.h>
#include <set>
#include <map>

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

/**
 *  This class represents a PCI DEVICE list for the host. The list is in the
 *  form:
 *  <PCI>
 *    <DOMAIN> PCI address domain
 *    <BUS>    PCI address bus
 *    <SLOT>   PCI address slot
 *    <FUNCTION> PCI address function
 *    <ADDRESS> PCI address, bus, slot and function
 *    <VENDOR> ID of PCI device vendor
 *    <DEVICE> ID of PCI device
 *    <CLASS> ID of PCI device class
 *    <VMID> ID using this device, -1 if free
 *
 *  The monitor probe may report additional information such as VENDOR_NAME,
 *  DEVICE_NAME, CLASS_NAME...
 */
struct HostShareConf;

struct HostShareCapacity;

class HostSharePCI : public Template
{
public:

    HostSharePCI() : Template(false, '=', "PCI_DEVICES") {};

    HostSharePCI(const HostSharePCI& src);

    virtual ~HostSharePCI()
    {
        HostSharePCI::clear();
    };

    /**
     *  Builds the devices list from its XML representation. This function
     *  is used when importing it from the DB.
     *    @param node xmlNode for the template
     *    @return 0 on success
     */
    int from_xml_node(const xmlNodePtr node);

    /**
     *  Test whether this PCI device set has the requested devices available.
     *    @param devs list of requested devices by the VM.
     *    @return true if all the devices are available.
     */
    bool test(const std::vector<VectorAttribute *> &devs) const;

    /**
     *  Assign the requested devices to the given VM. The assigned devices will
     *  be labeled with the VM and the PCI attribute of the VM extended with
     *  the address of the assigned devices.
     *    @param devs list of requested PCI devices, will include address of
     *    assigned devices.
     *    @param vmid of the VM
     *    @param hp host/cluster vGPU profile
     *
     *    @return true if the devices where added
     *
     *    NOTE THIS FUNCTION DOES NOT PERFORM ANY ROLLBACK
     */
    bool add(HostShareCapacity &sr);

    /**
     *  Remove the VM assignment from the PCI device list
     */
    void del(HostShareCapacity &sr);

    /**
     *  Revert the VM assignment from the PCI device list. It copies
     *  back the attributes from the previous PCI device
     */
    void revert(std::vector<VectorAttribute *> &devs);

    /**
     *  Updates the PCI list with monitor data, it will create or
     *  remove PCIDevices as needed.
     */
    void set_monitorization(Template& ht, const HostShareConf& hconf);

    void clear() override;

    /**
     *  Prints the PCI device list to an output stream. This function is used
     *  for logging purposes and *not* for generating DB content.
     */
    friend std::ostream& operator<<(std::ostream& o, const HostSharePCI& p);

    HostSharePCI& operator=(const HostSharePCI& other);

    HostSharePCI& operator=(HostSharePCI&& other) noexcept;

    /**
     *  Gets a 4 hex digits value from attribute
     *    @param name of the attribute
     *    @param pci_device VectorAttribute representing the device
     *    @return the 0 if not found, -1 syntax error, >0 valid hex value
     */
    static int get_pci_value(const char * name,
                             const VectorAttribute * pci_device,
                             unsigned int& value);
    /**
     *  Sets the PCI device address in the Virtual Machine as follows;
     *    - VM_DOMAIN: 0x0000
     *    - VM_BUS: dbus or VM_BUS in PCI attribute
     *    - VM_SLOT: PCI_ID + 1
     *    - VM_FUNCTION: 0
     *    - VM_ADDRESS: BUS:SLOT.0
     *
     *  When the machine type is q35, SLOT needs to be 0, and devices are attached
     *  to a different bus. Use param slot_index to select this behavior
     *    - VM_SLOT: 0
     *    - VM_BUS: PCI_ID + 1
     *
     *  When the VM uses a VM topology it assigns a VM_BUS_INDEX to match the
     *  associated pcie-root-port.
     *
     *  @param pci_device to set the address in
     *  @param palloc map of allocated pci ports per numa node
     *  @param bus_index when true devices uses slot = 0 and bus = pci_id + 1
     *  @param numa when true generate NUMA-aware VM addresses for the PCI device
     *
     *  @return -1 if wrong bus 0 on success
     */
    static int set_pci_address(VectorAttribute * pci_device,
                               std::map<unsigned int, std::set<unsigned int>>& palloc,
                               bool bus_index,
                               bool numa);
private:
    /**
     *  Internal structure to represent PCI devices for fast look up and
     *  update
     */
    struct PCIDevice
    {
        PCIDevice(VectorAttribute * _attrs);

        PCIDevice(const PCIDevice& src);

        ~PCIDevice() {};

        unsigned int vendor_id;
        unsigned int device_id;
        unsigned int class_id;

        int vmid;

        std::string address;

        VectorAttribute * attrs;
    };

    std::map<std::string, PCIDevice *> pci_devices;

    /**
     *  Sets the internal class structures from the template
     */
    void init();

    /**
     *  Test if there is a suitable PCI device for the VM request. The test
     *  is done using the VENDOR/DEVICE/CLASS attributes
     *
     *  @param dev VM attribute that represents the decive request
     *  @param addrs PCI addresses that should be considered in use
     *
     *  @return true if the device can be allocated to this host
     */
    bool test_by_name(const VectorAttribute *dev, std::set<std::string>& addrs) const;

    /**
     *  Test if there is a suitable PCI device for the VM request. The test
     *  is done using the a specific address
     *
     *  @param device VM attribute that represents the decive request
     *  @param addr the requested address
     *
     *  @return PCI_ID of the tested device or -1 if no PCI found
     */
    bool test_by_addr(const VectorAttribute *dev, const std::string& addr) const;

    /**
     *  Allocates the given VM device using the VENDOR/DEVICE/CLASS attributes
     *  @param device VM attribute that represents the decive request
     */
    bool add_by_name(VectorAttribute *device,
                     std::map<unsigned int, std::set<unsigned int>>& palloc,
                     HostShareCapacity &sr);

    /**
     *  Allocates the given VM device using the SHORT_ADDRESS attribute
     *  @param device VM attribute that represents the decive request
     */
    bool add_by_addr(VectorAttribute *device,
                     const std::string& addr,
                     std::map<unsigned int, std::set<unsigned int>>& palloc,
                     HostShareCapacity &sr);

    /**
     *  Adds PCI attributes of the selected PCI to the VM PCI device
     *
     *  Sets the VGPU profile for NVIDIA cards NOTE: A migration may overwrite
     *  this value if the new host uses a different profile.
     *
     *  @param device VM attribute
     *  @param pci Host device
     *  @param sp if true set the "PREVIOUS_ADDRESS" attribute
     */
    void pci_attribute(VectorAttribute *device, PCIDevice *pci, bool sp,
            const std::string& vprofile);
};

#endif /*HOST_SHARE_PCI_H_*/
