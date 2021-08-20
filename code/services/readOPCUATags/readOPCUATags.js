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

function readOPCUATags(req, resp) {
  ClearBlade.init({ request: req });
  var client = new MQTT.Client();
  setInterval(processMessage, 10000);

  function processMessage() {
    client.publish("opcua/read", JSON.stringify({
        "node_ids":["ns=5;s=Arp.Plc.Eclr/xRun_Pump1", "ns=5;s=Arp.Plc.Eclr/arrPumps[1].Statistics.DailyStarts", "ns=5;s=Arp.Plc.Eclr/arrPumps[1].Statistics.DailyRuntime"]
    }));
  }
}
