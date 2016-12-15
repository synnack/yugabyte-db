// Copyright (c) YugaByte, Inc.

import React, { Component, PropTypes } from 'react';

import { DescriptionList } from '../common/descriptors';
import { YBPanelItem } from '.';

export default class UniverseInfoPanel extends Component {
  static propTypes = {
    universeInfo: PropTypes.object.isRequired
  };

  render() {
    const { universeInfo } = this.props;
    const { universeDetails } = universeInfo;
    const { userIntent } = universeDetails;
    var azString = universeInfo.universeDetails.nodeDetailsSet.map(function(item, idx){
      return item.cloudInfo.az;
    }).join(", ");

    var regionList = universeInfo.regions.map(function(region) { return region.name; }).join(", ")
    var universeInfoItems = [
      {name: "Provider", data: universeInfo.provider.name},
      {name: "Regions", data: regionList},
      {name: "Instance Type", data: userIntent.instanceType},
      {name: "Availability Zones", data: azString},
      {name: "Replication Factor", data: userIntent.replicationFactor},
      {name: "Number Of Nodes", data: userIntent.numNodes}
    ];

    return (
      <YBPanelItem name="Universe Configuration">
        <DescriptionList listItems={universeInfoItems} />
      </YBPanelItem>
    );
  }
}