/**
 * Type: Stream Service
 * Description: A service that does not have an execution timeout which allows for infinite execution of logic.
 * @param {CbServer.BasicReq} req
 * @param {string} req.systemKey
 * @param {string} req.systemSecret
 * @param {string} req.userEmail
 * @param {string} req.userid
 * @param {string} req.userToken
 * @param {boolean} req.isLogging
 * @param {[id: string]} req.params
 * @param {CbServer.Resp} resp
 */

function opcuaNormalizer(req, resp) {

  var ONLY_SEND_ON_CHANGE = true; // only send values that have changed to intelligent assets
  var MINIMUM_SEND_INTERVAL_MINUTES = 1; // at minimum send value to intelligent assets at this interval, even if value hasn't changed 
  
  var previousMessage = null; 
  var lastTimeMessageSent = null;

  var cbClient;
  try {
    cbClient = new MQTT.Client();
  } catch (e) {
    resp.error("failed to init cb client: " + e);
  }
  
  const OPC_UA_READ_TOPIC = "opcua/read/response";

  const OUTGOING_ASSET_MODEL_TOPIC = "_monitor/_asset/<ASSET_ID>/status";
  const OUTGOING_DB_TOPIC = "_dbupdate/_monitor/_asset/<ASSET_ID>/status";
  const OUTGOING_HISTORY_TOPIC = "_history/_monitor/_asset/<ASSET_ID>";
  
  log("subscribing");
  cbClient.subscribe(OPC_UA_READ_TOPIC, function(topic, msg) {
    processMessage(msg.payload, topic);
  });

/*
{
  "timestamp": "2020-02-24T12:06:38Z",
  "data": {
    "ns=5;s=Arp.Plc.Eclr/main1.boolTest": false,
    "ns=5;s=Arp.Plc.Eclr/main1.intTest": 0,
    "ns=5;s=Arp.Plc.Eclr/main1.stringTest": ""
  }
}
*/
  function processMessage(msg, topic) {
    log("message received; topic: " + topic, msg);
    try {
        msg = JSON.parse(msg);
    } catch(e) {
        log("failed to parse json: " + e);
        return;
    }
    msg.timestamp = new Date(msg.server_timestamp);
    var decodedMessage = {};
    var assetId = "testing";
    if (ClearBlade.isEdge()) {
      assetId = ClearBlade.edgeId();
    }
    // transform opc node ids to a format asset monitor accepts
    // ns=5;s=Arp.Plc.Eclr/main1.boolTest
    // ns-5_s-Arp_Plc_Eclr_main1_boolTest	
    var customData = {}
    var sendMessage = false;
    for (var nodeid in msg.data) {
      log(nodeid);
      var newNodeID = nodeid.replace(/=/g, "-");
      newNodeID = newNodeID.replace(/;/g, "_");
      newNodeID = newNodeID.replace(/\./g, "_");
      newNodeID = newNodeID.replace(/\//g, "_");
      log("newNodeID: " ,newNodeID);
      // check if value changed, if not don't send
      if (previousMessage == null) {
        customData[newNodeID] = msg.data[nodeid].value;
        sendMessage = true;
      } else if (previousMessage.data[nodeid] !== msg.data[nodeid]) {
        log("value changed");
        customData[newNodeID] = msg.data[nodeid].value;
        sendMessage = true;
      } else {
        var timeDifference = msg.timestamp.getTime() - lastTimeMessageSent.getTime();
        if ((timeDifference/60000) >= MINIMUM_SEND_INTERVAL_MINUTES) {
          customData[newNodeID] = msg.data[nodeid].value;
          sendMessage = true;
        } else {
          log("no change to report for nodeid " + nodeid);
        }
      }
    }
    var assetModelMsg = {
      id: assetId,
      custom_data: customData,
      last_updated: msg.timestamp.toISOString(),
      "type": "plc-next"
    };
    log(assetModelMsg);
    if (sendMessage) {
      lastTimeMessageSent = msg.timestamp;
      cbClient.publish(OUTGOING_ASSET_MODEL_TOPIC.replace("<ASSET_ID>", assetId), JSON.stringify(assetModelMsg));
      cbClient.publish(OUTGOING_DB_TOPIC.replace("<ASSET_ID>", assetId), JSON.stringify(assetModelMsg));
      cbClient.publish(OUTGOING_HISTORY_TOPIC.replace("<ASSET_ID>", assetId), JSON.stringify(assetModelMsg));
    }
    previousMessage = msg;
  }
}
