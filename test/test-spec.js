var chai = require('chai');
var supertest = require('supertest')
var expect = chai.expect;
var rootServer = supertest("http://localhost:8888/_/sandwich")

function checkForAtLeastOneOfEachDay(resultSet) {
  var daysFound = [false, false, false, false, false, false, false]
  var notMissingAnyDays = true
  for (item of resultSet) {
      daysFound[resultSet["weekday_tinyint"]] = true
  }

  for (day in daysFound) {
    if (!day) {
      notMissingAnyDays = false
      break;
    }
  }

  return notMissingAnyDays;
}

describe('sandwich', () => {
    it('Get the list of servers', (done) => {
        rootServer
            .get('/')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.length).to.greaterThan(0)
                done()
            });
    });

    it('Caching is enabled', (done) => {
        rootServer
            .get('/cache')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.length).to.greaterThan(0)
                done()
            });
    });

    it('GetServerInfo', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetServerInfo')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body[0].version).to.equal("4.0.0")
                done()
            });
    });

    it('serverinfo.xml', (done) => {
        rootServer
            .get('/client_interface/serverInfo.xml')
            .expect(200)
            .expect('Content-Type', /xml/)
            .end((err, res) => {
                expect(res.text).to.equal("<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<bmltInfo>\r\n<serverVersion>\r\n<readableString>4.0.0</readableString>\r\n</serverVersion>\r\n</bmltInfo>")
                done()
            });
    });

    it('GetFormats', (done) => {
        rootServer
            .get('/client_interface/xml/index.php?switcher=GetFormats')
            .expect(200)
            .expect('Content-Type', /xml/)
            .end((err, res) => {
                expect(res.text.length).greaterThan(0)
                done()
            });
    });

    it('GetLangs', (done) => {
        rootServer
            .get('/client_interface/xml/GetLangs.php')
            .expect(200)
            .expect('Content-Type', /xml/)
            .end((err, res) => {
                done()
            });
    });

    it('GetServiceBodies', (done) => {
        rootServer
            .get('/client_interface/xml/GetServiceBodies.php')
            .expect(200)
            .expect('Content-Type', /xml/)
            .end((err, res) => {
                expect(res.text.length).greaterThan(0)
                done()
            });
    });

    it('GetSearchResults XSD', (done) => {
        rootServer
            .get('/client_interface/xsd/GetSearchResults.php')
            .expect(200)
            .expect('Content-Type', /xml/)
            .end((err, res) => {
                expect(res.text.length).greaterThan(0)
                done()
            });
    });

    it('Auto-Radius at least one day a week (10 items)', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetSearchResults&lat_val=35.542279819197&long_val=-78.64231134299&geo_width=-10&sort_keys=weekday_tinyint')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(checkForAtLeastOneOfEachDay(res.body)).equals(true)
                done()
            });
    });

    it('Auto-Radius at least one day a week (50 items)', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetSearchResults&lat_val=35.542279819197&long_val=-78.64231134299&geo_width=-50&sort_keys=weekday_tinyint')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(checkForAtLeastOneOfEachDay(res.body)).equals(true)
                done()
            });
    });

    it('Auto-Radius with specific day still returns 20 items', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetSearchResults&weekdays[]=1&lat_val=35.541741900696&long_val=-78.642678483024&geo_width=-20')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.length).greaterThan(19)
                done()
            });
    });

    it('Auto-Radius with specific days still returns 20 items', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetSearchResults&weekdays[]=5&weekdays[]=4&lat_val=35.541741900696&long_val=-78.642678483024&geo_width=-20')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.length).greaterThan(19)
                done()
            });
    });

    it('Root without slash', (done) => {
        rootServer
            .get('')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.length).greaterThan(0)
                done()
            });
    });

    it('Root with slash', (done) => {
        rootServer
            .get('/')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.length).greaterThan(0)
                done()
            });
    });

    it('Filter search', (done) => {
        rootServer
            .get('/filter?lat_val=35.5459732&long_val=-78.6398736')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.length).greaterThan(0)
                done()
            });
    });

    it('GetSearchResults with specific fields', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetSearchResults&data_field_key=weekday_tinyint,start_time,service_body_bigint,id_bigint,meeting_name,location_text&sort_keys=meeting_name,service_body_bigint,weekday_tinyint,start_time')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.length).greaterThan(0)
                done()
            });
    });

    it('Services search without formats', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetSearchResults&recursive=1&get_used_formats=1&services=1000001019')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(JSON.stringify(res.body).length).greaterThan(0)
                done()
            });
    });

    it('Services search with formats', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetSearchResults&recursive=1&services=1000001019')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.length).greaterThan(0)
                done()
            });
    });

    it('GetSearchResults with specific fields without service_body_bigint', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetSearchResults&geo_width=-10&data_field_key=weekday_tinyint,start_time,id_bigint,meeting_name,location_text&sort_keys=meeting_name,weekday_tinyint,start_time')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(JSON.stringify(res.body).indexOf("undefined") < 0).equals(true)
                done()
            });
    });

    it('GetSearchResults with specific fields with service_body_bigint', (done) => {
        rootServer
            .get('/client_interface/json/?switcher=GetSearchResults&geo_width=-10&data_field_key=service_body_bigint,weekday_tinyint,start_time,id_bigint,meeting_name,location_text&sort_keys=meeting_name,weekday_tinyint,start_time')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(JSON.stringify(res.body).indexOf("undefined") < 0).equals(true)
                done()
            });
    });
});
