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

function manageOPCUAAdapter(req, resp) {

  var ADAPTER_PROCESS_NAME = "opc-ua-go-adapter";
  
  var opcuaAdapter = ClearBladeAsync.Adapter('opcua');
  
  if (!ClearBlade.isEdge()) {
    resp.error("only run on edge");
  }

  setInterval(function() {
    log("checking if adapter is running");
    try {
      var results = child_process.execSync("pgrep -f " + ADAPTER_PROCESS_NAME, {});
    } catch (e) {
      if (e.status === 1) {
        log("adapter process not found, starting it");
        startAdapter();
        return;
      } else {
        resp.error("unexpected error from pgrep:  " + JSON.stringify(e));
      }
    }
    log("adapter already running")
  }, 5000);

  var startAdapter = function() {
    opcuaAdapter.control('start', [ClearBlade.edgeId()]).then(function (results) {
      log("adapter started");
    }).catch(function (e) {
      resp.error("failed to start adapter: " + e.message);
    });
  }
}

