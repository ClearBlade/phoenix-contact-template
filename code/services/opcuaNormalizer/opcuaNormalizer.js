function opcuaNormalizer(req, resp) {

    if (!ClearBlade.isEdge()) {
        resp.error("only run on edge");
    }

    var cbClient;
    try {
        cbClient = new MQTT.Client();
    } catch (e) {
        resp.error("failed to init cb client: " + e);
    }

    const cbAssetsCol = ClearBlade.Collection("assets");

    const OPC_UA_READ_TOPIC = "opcua/read/response";

    const OUTGOING_ASSET_MODEL_TOPIC = "_monitor/_asset/<ASSET_ID>/status";
    const OUTGOING_DB_TOPIC = "_dbupdate/_monitor/_asset/<ASSET_ID>/status";
    const OUTGOING_DB_TOPIC_PLATFORM = "_dbupdate/_monitor/_asset/<ASSET_ID>/status/_platform";
    const OUTGOING_HISTORY_TOPIC = "_history/_monitor/_asset/<ASSET_ID>";

    log("subscribing to topic: " + OPC_UA_READ_TOPIC);
    cbClient.subscribe(OPC_UA_READ_TOPIC, function(topic, msg) {
        processMessage(msg.payload, topic);
    });

    function processMessage(msg, topic) {
        log("message received on: " + topic);
        try {
            msg = JSON.parse(msg);
        } catch (e) {
            log("failed to parse json: " + e);
            return;
        }
        var assets = getAssets();
        var prefix = getPrefix();
        var assetMap = getAssetMap();
        msg.timestamp = new Date(msg.server_timestamp);

        //might have to json parse when really pulling from collection
        Object.keys(assetMap.opcua).forEach(function(key) {

            var customData = {}
            var assetId = assetMap.opcua[key].asset_id.replace("{asset_prefix}", prefix);
            var asset = searchById(assetId, assets);
            
            var assetType = asset.type;
            for (var nodeid in msg.data) {

                if (nodeid !== key) {
                    continue;
                } else {
                    customData[assetMap.opcua[key].attribute_id] = msg.data[nodeid].value;
                }
            }
            //TODO only send one message per asset id
            var assetModelMsg = {
                id: assetId,
                custom_data: customData,
                last_updated: msg.timestamp.toISOString(),
                "type": assetType
            };
            log(assetModelMsg);
            log("publishing to topic: " + OUTGOING_ASSET_MODEL_TOPIC.replace("<ASSET_ID>", assetId));
            log("publishing to topic: " + OUTGOING_DB_TOPIC.replace("<ASSET_ID>", assetId));
            log("publishing to topic: " + OUTGOING_HISTORY_TOPIC.replace("<ASSET_ID>", assetId));
            cbClient.publish(OUTGOING_ASSET_MODEL_TOPIC.replace("<ASSET_ID>", assetId), JSON.stringify(assetModelMsg));
            cbClient.publish(OUTGOING_DB_TOPIC.replace("<ASSET_ID>", assetId), JSON.stringify(assetModelMsg));
            cbClient.publish(OUTGOING_DB_TOPIC_PLATFORM.replace("<ASSET_ID>", assetId), JSON.stringify(assetModelMsg));
            cbClient.publish(OUTGOING_HISTORY_TOPIC.replace("<ASSET_ID>", assetId), JSON.stringify(assetModelMsg));
        });
    }

    function getPrefix() {
        var edgeId = ClearBlade.edgeId();
        var prefix = "";
        var query = ClearBlade.Query();
        query.equalTo("id", edgeId);
        var callback = function(err, data) {
            if (err) {
                console.log("getPrefix: No rows returned from Assets Collection for id: " + edgeId);
                console.log("error : " + JSON.stringify(data));
            } else {
                prefix = JSON.parse(data.DATA[0].custom_data).asset_prefix;
            }
        };
        cbAssetsCol.fetch(query, callback);
        return prefix;
    }

    //TODO only get assets we care about
    function getAssets() {
        var assets = [];
        var query = ClearBlade.Query();
        query.setPage(0, 0);
        var callback = function(err, data) {
            if (err) {
                console.log("getAssets: No rows returned from Assets Collection");
                console.log("error : " + JSON.stringify(data));
            } else {
                assets = data.DATA;
            }
        };
        cbAssetsCol.fetch(query, callback);
        return assets;
    }

    function searchById(idKey, myArray) {
        for (var i = 0; i < myArray.length; i++) {
            if (myArray[i].id === idKey) {
                return myArray[i];
            }
        }
    }

    //TODO this will come from a new collection
    function getAssetMap() {
        return {
            "edge_name": "a8-74-1d-08-2d-94",
            "opcua": {
                "ns=5;s=Arp.Plc.Eclr/arrPumps[0].Config.Enabled": {
                    "asset_id": "{asset_prefix}-pump-1",
                    "attribute_id": "enabled"
                },
                "ns=5;s=Arp.Plc.Eclr/arrPumps[0].Status.ActualSpeed": {
                    "asset_id": "{asset_prefix}-pump-1",
                    "attribute_id": "actual-speed"
                },
                "ns=5;s=Arp.Plc.Eclr/arrPumps[1].Config.Enabled": {
                    "asset_id": "{asset_prefix}-pump-2",
                    "attribute_id": "enabled"
                },
                "ns=5;s=Arp.Plc.Eclr/arrPumps[1].Status.ActualSpeed": {
                    "asset_id": "{asset_prefix}-pump-2",
                    "attribute_id": "actual-speed"
                },
                "ns=5;s=Arp.Plc.Eclr/arrPumps[2].Config.Enabled": {
                    "asset_id": "{asset_prefix}-pump-3",
                    "attribute_id": "enabled"
                },
                "ns=5;s=Arp.Plc.Eclr/arrPumps[2].Status.ActualSpeed": {
                    "asset_id": "{asset_prefix}-pump-3",
                    "attribute_id": "actual-speed"
                },
                "ns=5;s=Arp.Plc.Eclr/arrPumps[3].Config.Enabled": {
                    "asset_id": "{asset_prefix}-pump-4",
                    "attribute_id": "enabled"
                },
                "ns=5;s=Arp.Plc.Eclr/arrPumps[3].Status.ActualSpeed": {
                    "asset_id": "{asset_prefix}-pump-4",
                    "attribute_id": "actual-speed"
                },
                "ns=5;s=Arp.Plc.Eclr/udtStation.Statistics.TotalInfluent": {
                    "asset_id": "{asset_prefix}",
                    "attribute_id": "total-influent"
                },
                "ns=5;s=Arp.Plc.Eclr/udtStation.Statistics.TotalEffluent": {
                    "asset_id": "{asset_prefix}",
                    "attribute_id": "total-effluent"
                },
            }
        };
    }
}
