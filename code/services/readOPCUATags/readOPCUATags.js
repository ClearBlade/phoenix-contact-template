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
 * It polls the adapter_config collection every second and looks for changes in poll rates / nodeIDs
 * It queries the adapter_config table for asset with id as the edgeID.
 *
 * It triggers polling on the Opcua adapter
 * by publishing on the opcua/read topic that adapter listens on
 *
 */
function readOPCUATags(req, resp) {
  ClearBlade.init({ request: req });
  const client = new MQTT.Client();
  const staticPollMillis = 1000;
  const READ_TOPIC = "opcua/read";
  var tagTimeObj = {};

  setInterval(adapter_configPoll, staticPollMillis);

  function adapter_configPoll() {
    try {
      const database = ClearBladeAsync.Database();
      const edgeId = ClearBlade.edgeId();
      const rawQuery =
        "select * from adapter_config where edge_name='" + edgeId + "';";

      database
        .query(rawQuery)
        .then(function (res) {
          if (res.length > 0) {
            if (JSON.parse(res[0].adapter_settings).tags !== undefined) {
              var tags = JSON.parse(res[0].adapter_settings).tags;

              var tagsObj = {};

              //convert tags to object array with poll rate as key
              for (var i = 0; i < tags.length; i++) {
                if (tags[i].read_method.type === "polling") {
                  if (!tagsObj.hasOwnProperty(tags[i].read_method.rate)) {
                    tagsObj[tags[i].read_method.rate] = [tags[i].node_id];
                  } else {
                    tagsObj[tags[i].read_method.rate].push(tags[i].node_id);
                  }
                }
              }

              var currentTime = Date.now();

              //for each object key, check if it's been longer than its interval. if so, publish.
              for (var tag in tagsObj) {
                var timeLastPublished = 0;
                if (tagTimeObj.hasOwnProperty(tag)) {
                  timeLastPublished = tagTimeObj[tag];
                }
                if (currentTime - timeLastPublished > tag * 1000) {
                  tagTimeObj[tag] = currentTime;
                  client.publish(
                    READ_TOPIC,
                    JSON.stringify({ node_ids: tagsObj[tag] })
                  );
                }
              }
            } else {
              log("no tags in adapter settings");
            }
          } else {
            log("no response from database");
          }
        })
        .catch(function (rej) {
          log("failed to query database: ", rej, rej.message);
          resp.error(rej);
        });
    } catch (e) {
      log("exception: ", e.message);
      resp.error(e.stack);
    }
  }
}
