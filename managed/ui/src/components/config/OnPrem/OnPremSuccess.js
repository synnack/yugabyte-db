// Copyright (c) YugaByte, Inc.

import React, { Component } from 'react';
import { Link, withRouter, browserHistory } from 'react-router';
import { cloneDeep, pluck, sortBy } from 'lodash';

import { YBButton } from '../../common/forms/fields';
import { Row, Col } from 'react-bootstrap';
import { getPromiseState } from 'utils/PromiseUtils';

import { isNonEmptyArray, isDefinedNotNull, isEmptyObject, pickArray } from 'utils/ObjectUtils';
import { YBConfirmModal } from '../../modals';
import { DescriptionList } from '../../common/descriptors';
import { RegionMap } from '../../maps';
import OnPremNodesListContainer from './OnPremNodesListContainer';

const PROVIDER_TYPE = "onprem";

class OnPremSuccess extends Component {
  constructor(props) {
    super(props);
    this.getReadyState = this.getReadyState.bind(this);
    this.handleManageNodesClick = this.handleManageNodesClick.bind(this);
  }

  deleteProvider(uuid) {
    this.props.deleteProviderConfig(uuid);
  }

  componentWillMount() {
    const {configuredProviders, location} = this.props;
    const currentProvider = configuredProviders.data.find(provider => provider.code === 'onprem');
    if (isDefinedNotNull(currentProvider)) {
      this.props.fetchConfiguredNodeList(currentProvider.uuid);
      this.props.fetchInstanceTypeList(currentProvider.uuid);
    }

    this.manageNodesLocation = cloneDeep(location);
    this.manageNodesLocation.query.section = 'instances';
  }

  getReadyState(dataObject) {
    return getPromiseState(dataObject).isSuccess() || getPromiseState(dataObject).isEmpty();
  }

  handleManageNodesClick() {
    browserHistory.push(this.manageNodesLocation);
  }

  componentWillReceiveProps(nextProps) {
    const {
      accessKeys,
      cloud: {nodeInstanceList, instanceTypes, onPremJsonFormData},
      cloudBootstrap,
      cloudBootstrap: {data: {type, response}},
      configuredProviders,
      configuredRegions,
    } = nextProps;

    if (cloudBootstrap !== this.props.cloudBootstrap && type === "cleanup"
        && isDefinedNotNull(response)) {
      this.props.resetConfigForm();
      this.props.fetchCloudMetadata();
    }

    // setOnPremJSONFormData if not already set.
    if (isEmptyObject(onPremJsonFormData) && this.getReadyState(nodeInstanceList) &&
        this.getReadyState(instanceTypes) && this.getReadyState(accessKeys)) {
      const onPremRegions = configuredRegions.data.filter(
        (configuredRegion) => configuredRegion.provider.code === PROVIDER_TYPE
      );
      const currentProvider = configuredProviders.data.find(provider => provider.code === 'onprem');
      let onPremAccessKey = {};
      if (isNonEmptyArray(accessKeys.data)) {
        onPremAccessKey = accessKeys.data.find((accessKey) => accessKey.idKey.providerUUID === currentProvider.uuid);
      }
      const jsonData = {
        provider: {name: currentProvider.name},
        key: {
          code: onPremAccessKey.idKey && onPremAccessKey.idKey.keyCode,
          privateKeyContent: onPremAccessKey.keyInfo && onPremAccessKey.keyInfo.privateKey,
          sshUser: onPremAccessKey.keyInfo && onPremAccessKey.keyInfo.sshUser,
        },
        regions: onPremRegions.map((regionItem) => {
          return {
            code: regionItem.code,
            longitude: regionItem.longitude,
            latitude: regionItem.latitude,
            zones: regionItem.zones.map(zoneItem => zoneItem.code)
          }
        }),
        instanceTypes: instanceTypes.data.map(instanceTypeItem => ({
          instanceTypeCode: instanceTypeItem.instanceTypeCode,
          numCores: instanceTypeItem.numCores,
          memSizeGB: instanceTypeItem.memSizeGB,
          volumeDetailsList: pickArray(instanceTypeItem.instanceTypeDetails.volumeDetailsList, 
            ['volumeSizeGB', 'volumeType', 'mountPath']),
        })),
        nodes: nodeInstanceList.data.map(nodeItem => ({
          ip: nodeItem.details.ip,
          region: nodeItem.details.region,
          zone: nodeItem.details.zone,
          instanceType: nodeItem.details.instanceType
        })),
      };
      this.props.setOnPremJsonData(jsonData);
    }
  }

  render() {
    const {configuredRegions, configuredProviders, accessKeys, universeList, location,
      cloud: {nodeInstanceList}} = this.props;

    if (location.query.section === 'instances') {
      return <OnPremNodesListContainer changeSection={this.changeSection} />;
    }

    const currentProvider = configuredProviders.data.find(provider => provider.code === PROVIDER_TYPE);
    if (!currentProvider) {
      return <span/>;
    }

    const nodesByRegionAndZone = {};
    nodeInstanceList.data.forEach(node => {
      const region = node.details.region;
      const zone = node.details.zone;
      if (!nodesByRegionAndZone[region]) nodesByRegionAndZone[region] = {};
      if (!nodesByRegionAndZone[region][zone]) nodesByRegionAndZone[region][zone] = [];
      nodesByRegionAndZone[region][zone].push(node);
    });

    const onPremRegions = cloneDeep(configuredRegions.data.filter(region => region.provider.code === PROVIDER_TYPE));
    onPremRegions.forEach(region => {
      region.zones.forEach(zone => {
        zone.nodes = (nodesByRegionAndZone[region.name] && nodesByRegionAndZone[region.name][zone.name]) || [];
      });
    });

    let keyPairName = "Not Configured";
    if (isNonEmptyArray(accessKeys.data)) {
      let onPremAccessKey = accessKeys.data.find((accessKey) => accessKey.idKey.providerUUID === currentProvider.uuid)
      if (isDefinedNotNull(onPremAccessKey)) {
        keyPairName = onPremAccessKey.idKey.keyCode;
      }
    }

    const universeExistsForProvider = (universeList.data || []).some(universe => universe.provider && (universe.provider.uuid === currentProvider.uuid));
    const buttons = (
      <span className="buttons pull-right">
        <YBButton btnText="Manage Instances" disabled={false} btnIcon="fa fa-server"
                  btnClass={"btn btn-default yb-button"} onClick={this.handleManageNodesClick} />
        <YBButton btnText="Edit Provider" disabled={false} btnIcon="fa fa-pencil"
                  btnClass={"btn btn-default yb-button"} onClick={this.props.showEditProviderForm} />
        <YBButton btnText="Delete Provider" disabled={universeExistsForProvider} btnIcon="fa fa-trash"
                  btnClass={"btn btn-default yb-button"} onClick={this.props.showDeleteProviderModal} />
        <YBConfirmModal name="delete-aws-provider" title={"Confirm Delete"}
                        onConfirm={this.deleteProvider.bind(this, currentProvider.uuid)}
                        currentModal="deleteOnPremProvider" visibleModal={this.props.visibleModal}
                        hideConfirmModal={this.props.hideDeleteProviderModal}>
          Are you sure you want to delete this on-premises datacenter configuration?
        </YBConfirmModal>
      </span>
    );

    const editNodesLinkText = 'Setup Instances';
    const nodeItemObject = (
      <div>
        {nodeInstanceList.data.length}
        {(!nodeInstanceList.data.length &&
          <Link onClick={this.handleManageNodesClick} className="node-link-container" title={editNodesLinkText}>{editNodesLinkText}</Link>
        ) || null}
      </div>
    );

    let regionLabels = <Col md={12}>No Regions Configured</Col>;
    if (isNonEmptyArray(onPremRegions)) {
      regionLabels = sortBy(onPremRegions, 'longitude').map(region => {
        const zoneList = sortBy(region.zones, 'name').map(zone => {
          const nodeIps = pluck(pluck(zone.nodes, 'details'), 'ip');
          return (
            <div key={`zone-${zone.uuid}`} className="zone">
              <div className="zone-name">{zone.name}:</div>
              <span title={nodeIps.join(', ')}>{zone.nodes.length} instances</span>
            </div>
          );
        });
        return (
          <Col key={`region-${region.uuid}`} md={3} lg={2} className="region">
            <div className="region-name">{region.name}</div>
            {zoneList}
          </Col>
        );
      });
    }

    const providerInfo = [
      {name: 'Name', data: currentProvider.name},
      {name: 'SSH Key', data: keyPairName},
      {name: 'Instances', data: nodeItemObject},
    ];
    return (
      <div>
        <Row className="config-section-header">
          <Col md={12}>
            {buttons}
            <DescriptionList listItems={providerInfo}/>
          </Col>
        </Row>
        <Row className="yb-map-labels">{regionLabels}</Row>
        <RegionMap title="All Supported Regions" regions={onPremRegions} type="Provider" showRegionLabels={false} showLabels={true} />
      </div>
    );
  }
}

export default withRouter(OnPremSuccess);