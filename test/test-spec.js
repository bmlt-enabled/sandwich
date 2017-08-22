var chai = require('chai');
var supertest = require('supertest')
var expect = chai.expect;
var rootServer = supertest("http://localhost:8888/_/sandwich")

describe('sandwich', () => {
  it('GetServerInfo', (done) => {
    rootServer
      .get('/client_interface/json/?switcher=GetServerInfo')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        expect(res.body.version).to.equal("4.0.0")
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

  it('GetSearchResults 20 items', (done) => {
    rootServer
      .get('/client_interface/json/?switcher=GetSearchResults&weekdays[]=1&weekdays[]=2&lat_val=35.542279819197&long_val=-78.64231134299&geo_width=-20')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        expect(res.body.length).equals(20)
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
});
