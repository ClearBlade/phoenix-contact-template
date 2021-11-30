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
 * It polls the adapter_config collection every 30 seconds and looks for changes in poll rates / nodeIDs
 * It queries the adapter_config table for asset with id as the edgeID.
 *
 * It triggers polling on the Opcua adapter
 * by publishing on the opcua/read topic that adapter listens on
 *
 */
function readOPCUATags(req, resp) {
  ClearBlade.init({ request: req });
  if (!ClearBlade.isEdge()) {
    log("Not an Edge..");
    resp.success("Not an edge...");
  }
  const client = new MQTT.Client();
  const staticPollMillis = 30000;
  var existingTags = [];

  //leave as is, static
  setInterval(adapter_configPoll, staticPollMillis);

  function adapter_configPoll() {
    try {
      const database = ClearBladeAsync.Database();
      var edgeId = ClearBlade.edgeId();

      const rawQuery =
        "select * from adapter_config where edge_name='" + edgeId + "';";
      log(rawQuery);
      database
        .query(rawQuery)
        .then(function (res) {
          var newTags = JSON.parse(res[0].adapter_settings).tags;
          log("updated newTags to: ", JSON.stringify(newTags));
          //check if there's a change
          if (!arraysEqual(existingTags, newTags)) {
            existingTags = newTags;
            var sortedTags = {};

            //convert tags to object array with poll rate as key, and each
            for (var i = 0; i < newTags.length; i++) {
              if (newTags[i].read_method.type === "polling") {
                if (!sortedTags.hasOwnProperty(newTags[i].read_method.rate)) {
                  sortedTags[newTags[i].read_method.rate] = [
                    newTags[i].node_id,
                  ];
                } else {
                  sortedTags[newTags[i].read_method.rate].push(
                    newTags[i].node_id
                  );
                }
              }
            }

            //for each object key, setInterval to key
            for (var key in sortedTags) {
              //setInterval for each different poll rate
              log(
                "setting interval of: " +
                  key +
                  " for node Ids: " +
                  sortedTags[key]
              );
              setInterval(opcuaPoll(sortedTags[key]), key);
            }
          } else {
            log("no changes to adapter_config tags");
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

  function opcuaPoll(node_ids) {
    client.publish(
      "opcua/read",
      JSON.stringify({
        node_ids: node_ids,
      })
    );
  }

  function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    a.sort(dynamicSort(Object.keys(a[0])[0]));
    b.sort(dynamicSort(Object.keys(b[0])[0]));

    for (var i = 0; i < a.length; ++i) {
      if (!deepEqual(a, b)) return false;
    }
    return true;
  }

  function deepEqual(x, y) {
    return x && y && typeof x === "object" && typeof y === "object"
      ? Object.keys(x).length === Object.keys(y).length &&
          Object.keys(x).reduce(function (isEqual, key) {
            return isEqual && deepEqual(x[key], y[key]);
          }, true)
      : x === y;
  }

  function dynamicSort(property) {
    var sortOrder = 1;
    if (property[0] === "-") {
      sortOrder = -1;
      property = property.substr(1);
    }
    return function (a, b) {
      var result =
        a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
      return result * sortOrder;
    };
  }
}
