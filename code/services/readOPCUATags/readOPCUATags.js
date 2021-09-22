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
/**
 * This service runs only at the edge.
 * It polls the assets collection every 30 seconds and looks for if the nodeIDs are updated 
 * It queries the assets table for asset with id as the edgeID.
 * 
 * It triggers polling on the Opcua adapter 
 * by publishing on the opcua/read topic that adapter listens on
 * 
 */
function readOPCUATags(req, resp) {
  ClearBlade.init({ request: req });
  if (!ClearBlade.isEdge()) {
    log('Not an Edge..');
    resp.success("Not an edge...");
  }
  const client = new MQTT.Client();
  var node_ids = "";

  setInterval(opcuaPoll, 30000);
  setInterval(assetsPoll, 30000);

  function assetsPoll() {
    try {
      const database = ClearBladeAsync.Database();
      var edgeId = ClearBlade.edgeId();

      const rawQuery = "select * from assets where id='" + edgeId + "';";
      log(rawQuery);
      database.query(rawQuery).then(function (res) {
        node_ids = JSON.parse(res[0].custom_data).nodeIDs;
        log("updated node_ids to: ", node_ids);

      }).catch(function (rej) {
        log("failed to query database: ", rej, rej.message);
        resp.error(rej);
      });
    } catch (e) {
      log('exception: ', e.message);
      resp.error(e.stack);
    }
  }
  function opcuaPoll() {
    log("opcuapoll for node Ids: ", node_ids.split(','));
    client.publish("opcua/read", JSON.stringify({
      "node_ids": node_ids.split(',')
    }));
  }
}
