/**
 * Type: Library
 * Description: A library that contains a function which, when called, returns an object with a public API.
 */
function edge_metrics(ClearBlade){
    if (!ClearBlade.isEdge()) {
        throw ('Not an edge!')
    }

    function execCmd(cmd, delimiterRegExp, searchColNameIndex, searchColVal, metricColNameIndex) {
        // Execute a command that returns a table. Find the row with the desired metric using
        // searchColNameIndex and searchColVal. Within the row use metricColNameIndex to find
        // the desired metric
        
        try {
            var cmdOutput = child_process.execSync(cmd, {});
            var rows = cmdOutput.split('\n');
            var rowStartIndex = 0;
            var headings;

            // Split using passed in RegExp
            const re = new RegExp(delimiterRegExp);

            // If metricColNameIndex is an integer it is an index.
            // If it is not it is a column name. In that case find the corresponding index.
            if (metricColNameIndex !== parseInt(metricColNameIndex, 10)) {
                headings = rows[0].split(re);
                metricColNameIndex = headings.indexOf(metricColNameIndex);
                rowStartIndex = 1;
            }
            
            // If searchColNameIndex is an integer it is an index.
            // If it is not it is a column name. In that case find the corresponding index.
            if ((searchColNameIndex !== parseInt(searchColNameIndex, 10)) && headings) {
                searchColNameIndex = headings.indexOf(searchColNameIndex)
            }

            for (var i = rowStartIndex; i < rows.length; i++) {
                var splitRow = rows[i].split(re);
                if (splitRow[searchColNameIndex] === searchColVal) {
                    return splitRow[metricColNameIndex]
                }
            }
        } catch (e) {
            return 'Unexpected error from "' + cmd +'": ' + JSON.stringify(e);
        }
    }

    function mem() {
        // Use 'free' cmd to return 'available' from 'Mem' row
        return parseInt(execCmd('free', '\\s+', 0, 'Mem:', 'available'));
    }
    
    function cpu() {
        // Run 'top' with flags -b (send output to another program), -n 1 (run top once)
        var idlePercentReturnRow = execCmd('top -b -n 1', '[:,]\\s+', 0, '%Cpu(s)', 4);
        var idlePercent = idlePercentReturnRow.split(' id')[0];
        var cpu = 100 - parseFloat(idlePercent);
        return cpu;
    }

    function disk(mountPoint) {
        // Use 'df -a' cmd to return 'Use%' from mountPoint
        
        // If mountPoint is undefined use '/'
        mountPoint = mountPoint || '/';
        
        var diskUsageReturn = execCmd('df -a', '\\s+', 'Mounted', mountPoint, 'Use%');
        var diskUsage = parseFloat(diskUsageReturn.split('%')[0]);
        return diskUsage;
    }

    function data() {
        var dataUsageReturn = child_process.execSync('grep "RPC STATS" /var/log/clearblade-edge.log | tail -1', {});
        var dataUsage = dataUsageReturn.split('RPC STATS: ')[1];
        var dataUsageArr = dataUsage.split('bytes sent,');
        var sent = parseInt(dataUsageArr[0]);
        var received = parseInt(dataUsageArr[1].split('bytes received')[0]);
        var dataUsageObj = { sent, received };
        return dataUsageObj;
    }
    
    return {
        mem,
        cpu,
        disk,
        data
    }
}