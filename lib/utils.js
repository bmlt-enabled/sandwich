module.exports = {
    getMeetingDataPoint: function(req, data, dataResponsePointer, meetingResponseCounter) {
        return req.url.indexOf("get_used_formats") > -1 ? 
            data[dataResponsePointer].body.meetings[meetingResponseCounter] :
            data[dataResponsePointer].body[meetingResponseCounter]
    },
    getMeetingData: function(req, data, dataResponsePointer) {
        if (req.url.indexOf("get_used_formats") > -1) {
            return data[dataResponsePointer].body.meetings
        } else {
            return (data[dataResponsePointer].body != null) ? data[dataResponsePointer].body : []
        }
    },
    getFormatDataPoint: function(req, data, dataResponsePointer, formatResponseCounter) {
        return req.url.indexOf("get_used_formats") > -1 ? 
            data[dataResponsePointer].body.formats[formatResponseCounter] :
            data[dataResponsePointer].body[meetingResponseCounter]
    },
    getFormatData: function(req, data, dataResponsePointer) {
        return req.url.indexOf("get_used_formats") > -1 ? 
            data[dataResponsePointer].body.formats :
            data[dataResponsePointer].body
    },
    convertMapToQueryString: function(map) {
        var queryString = "?"
        for (item in map) {
            queryString += item + "=" + map[item] + "&"
        }
        return queryString
    }

}
