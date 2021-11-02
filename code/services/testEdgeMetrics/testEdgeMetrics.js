function testEdgeMetrics(req,resp){
    // These are parameters passed into the code service
    var params = req.params;
    try {
        var edgeMetrics = edge_metrics(ClearBlade);
    } catch (e) {
        resp.error(e)
    };
    
    var diskUsage = edgeMetrics.disk();
    log(diskUsage);
    log("------------------------------");
    var memUsage = edgeMetrics.mem();
    log(memUsage);
    log("------------------------------");
    var cpuUsage = edgeMetrics.cpu();
    log(cpuUsage);
    log("------------------------------");
    var dataUsage = edgeMetrics.data();
    log(dataUsage);
    log("------------------------------");
    resp.success("Done!");   
}