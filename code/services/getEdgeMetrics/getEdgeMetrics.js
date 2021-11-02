/**
* This service retrieves edge metrics using the edge_metrics library
* and passes them to normalizerDefaultMQTT
 */

function getEdgeMetrics(req,resp){
    // These are parameters passed into the code service
    var params = req.params;
    const edgeMetrics = edge_metrics(ClearBlade);
    const client = new MQTT.Client();
    const defaultNormalizerTopic = "_monitor/asset/default/data";
    const cbdb = ClearBladeAsync.Database();

    // Retrieve id from assets. There should only be 1 row, but LIMIT to 1 just in case
    const query = "SELECT id, type FROM assets LIMIT 1";
    cbdb.query(query)
    .then(
        function(data) {
            try {
                var diskUsage = edgeMetrics.disk();
            } catch (e) {
                log("Error while reading diskUsage: " + JSON.stringify(e));
            }

            try {
                var memUsage = edgeMetrics.mem();
            } catch (e) {
                log("Error while reading memUsage: " + JSON.stringify(e));
            }

            try {
                var cpuUsage = edgeMetrics.cpu();
            } catch (e) {
                log("Error while reading cpuUsage: " + JSON.stringify(e));
            }

            try {
                var dataUsage = edgeMetrics.data();

                // Calculate incoming and outgoing data in kilobytes (original data in bytes)
                var networkEgress = dataUsage.sent / 1000;
                var networkIngress = dataUsage.received / 1000;
                
            } catch (e) {
                log("Error while reading dataUsage: " + JSON.stringify(e));
            }

            var asset = {
                id: data[0].id,
                type: data[0].type,
                custom_data: {
                    diskUsage,
                    memUsage,
                    cpuUsage,
                    networkIngress,
                    networkEgress
                }
            }
            
            client_publish(defaultNormalizerTopic, JSON.stringify(asset));
        },

        function(err) {
            resp.error(JSON.stringify(err))
        }
    )
    
    function processMessage(message, topic) {
        log("Received '" + JSON.stringify(message) + "' on topic '" + topic + "'.");
    }

    function client_subscribe(sub_topic) {
        function onMessage(sub_topic, message) {
            log("Received message on topic '" + sub_topic + "': " + message.payload);
            processMessage(message.payload, sub_topic);
        };
        
        client.subscribe(sub_topic, onMessage).catch(function (reason) {
            err_msg = "Failed to subscribe to topic '" + sub_topic + "'. Reason: " + reason.message;
            resp.error(err_msg);
        });
    };

    function client_publish(pub_topic, message) {
        client.publish(pub_topic, message)
        .then(function() { resp.success("Published '" + message + "' to topic '" + pub_topic + "'."); })
        .catch(function (reason) {
            err_msg = "Failed to publish to topic '" + pub_topic + "'. Reason: " + reason.message;
            log(err_msg);
            resp.error(err_msg);
        });
    };
}
