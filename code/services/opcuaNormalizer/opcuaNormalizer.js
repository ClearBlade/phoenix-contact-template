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
	const cbTagAttMapCol = ClearBlade.Collection("tag_attribute_mapping");

	const OPC_UA_READ_TOPIC = "opcua/read/response";

	const OUTGOING_ASSET_MODEL_TOPIC = "_monitor/_asset/<ASSET_ID>/status";
	const OUTGOING_DB_TOPIC = "_dbupdate/_monitor/_asset/<ASSET_ID>/status";
	const OUTGOING_DB_TOPIC_PLATFORM = "_dbupdate/_monitor/_asset/<ASSET_ID>/status/_platform";
	const OUTGOING_HISTORY_TOPIC = "_history/_monitor/_asset/<ASSET_ID>";

	log("subscribing to topic: " + OPC_UA_READ_TOPIC);
	cbClient.subscribe(OPC_UA_READ_TOPIC, function (topic, msg) {
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

		const edgeId = ClearBlade.edgeId();
		var assetMap = getAssetMap(edgeId);
		var assets = getAssets();
		var prefix = getPrefix(edgeId);
		msg.timestamp = new Date(msg.server_timestamp);
		var messagesToPublish = [];

		Object.keys(assetMap).forEach(function (key) {
			var customData = {};
			var assetId = assetMap[key].asset_id.replace("{asset_prefix}", prefix);
			if (assetId !== undefined && assets.length > 0) {
				var asset = searchById(assetId, assets);
			}
			if (asset !== undefined) {
				var assetType = asset.type;
				for (var nodeid in msg.data) {
					if (nodeid !== key) {
						continue;
					} else {
						customData[assetMap[key].attribute_id] = msg.data[nodeid].value;
					}
				}
				if (assetId !== undefined && messagesToPublish.length > 0) {
					var existingMsg = searchById(assetId, messagesToPublish);
				}
				if (existingMsg !== undefined) {
					existingMsg.custom_data[assetMap[key].attribute_id] = customData[assetMap[key].attribute_id];
					messagesToPublish[findIndexById(assetId, messagesToPublish)] = existingMsg;
				} else {
					if (Object.keys(customData).length > 0) {
						var assetModelMsg = {
							id: assetId,
							custom_data: customData,
							last_updated: msg.timestamp.toISOString(),
							type: assetType,
						};
						messagesToPublish.push(assetModelMsg);
					}
				}
			} else {
				log("asset with id " + assetId + " is undefined, skipping");
			}
		});

		messagesToPublish.forEach(function (assetModelMsg) {
			log("publishing message to asset/db/history topics: " + JSON.stringify(assetModelMsg));
			cbClient.publish(OUTGOING_ASSET_MODEL_TOPIC.replace("<ASSET_ID>", assetModelMsg.id), JSON.stringify(assetModelMsg));
			cbClient.publish(OUTGOING_DB_TOPIC.replace("<ASSET_ID>", assetModelMsg.id), JSON.stringify(assetModelMsg));
			cbClient.publish(OUTGOING_DB_TOPIC_PLATFORM.replace("<ASSET_ID>", assetModelMsg.id), JSON.stringify(assetModelMsg));
			cbClient.publish(OUTGOING_HISTORY_TOPIC.replace("<ASSET_ID>", assetModelMsg.id), JSON.stringify(assetModelMsg));
		});
	}

	function getPrefix(edgeId) {
		var prefix = "";
		var query = ClearBlade.Query();
		query.equalTo("id", edgeId);
		var callback = function (err, data) {
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
		var callback = function (err, data) {
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

	function findIndexById(idKey, myArray) {
		for (var i = 0; i < myArray.length; i++) {
			if (myArray[i].id === idKey) {
				return i;
			}
		}
	}

	function getAssetMap(edgeId) {
		var assetMap = "";
		var query = ClearBlade.Query();
		query.equalTo("edge_id", edgeId);
		var callback = function (err, data) {
			if (err) {
				console.log("getAssetMap: No rows returned from tag_attribute_mapping Collection for id: " + edgeId);
				console.log("error : " + JSON.stringify(data));
			} else {
				assetMap = data.DATA[0].mappings;
			}
		};
		cbTagAttMapCol.fetch(query, callback);
		return assetMap;
	}
}
