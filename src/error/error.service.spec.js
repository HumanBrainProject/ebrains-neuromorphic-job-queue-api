describe('clbError', function() {
  var service;

  beforeEach(module('clb-error'));

  beforeEach(inject(function(clbError) {
    service = clbError;
  }));

  describe('Function: error', function() {
    it('shoudl retrieve an hbpError instance', function() {
      var err = service.error();
      expect(err.type).toBeDefined();
      expect(err.message).toBeDefined();
      expect(err.code).toBeDefined();
    });

    it('should accept type option', function() {
      expect(service.error({type: 'MyType'}).type).toBe('MyType');
    });

    it('should accept message option', function() {
      expect(service.error({message: 'My Message'}).message).toBe('My Message');
    });

    it('should return options if it is an instance of HbpError', function() {
      var expected = service.error();
      expect(service.error(expected)).toBe(expected);
    });
  });

  describe('Function: httpError', function() {
    it('should return argument if it is an instance of HbpError', function() {
      var expected = service.error();
      expect(service.httpError(expected)).toBe(expected);
    });

    angular.forEach({
      403: 'Forbidden',
      0: 'ClientError',
      404: 'NotFound',
      666: 'UnknownError'
    }, function(type, code) {
      code = parseInt(code, 10);
      var response = {status: code};
      it('should return HTTP Status ' + code + ' as error code',
        function() {
          expect(service.httpError(response).code).toBe(code);
        });
      it('should return error type ' + type + ' for ' + code + ' HTTP Status',
        function() {
          expect(service.httpError(response).type).toBe(type);
        });
    });

    describe('error 502', function() {
      var contentType;
      var headers;
      var response;
      beforeEach(function() {
        contentType = 'text/html';
        headers = function(header) {
          if (header === 'content-type') {
            return contentType;
          }
        };
        response = {status: 502, headers: headers};
      });

      it('should return a 502 error code for a 502 HTTP Status', function() {
        expect(service.httpError(response).code).toBe(502);
      });
      it('should return a BadGateway error type for a 502 HTTP Status',
        function() {
          expect(service.httpError(response).type).toBe('BadGateway');
        });

      it('should return an insightful message for a 502 Bad Gateway error',
        function() {
          var errorMessage = '502 Bad Gateway Original Error Message';
          var expected = service.error({
            message: errorMessage,
            code: 502,
            type: 'BadGateway'
          });
          var response = {
            headers: headers,
            data: '<head><title>' + errorMessage +
              '</title></head><body></body></html>',
            status: 502
          };

          var actual = service.httpError(response);
          expect(actual.type).toBe(expected.type);
          expect(actual.message).toBe(expected.message);
          expect(actual.code).toBe(expected.code);
          contentType = ''; // no html response header, thus the default message is expected
          expected.message = '502 Bad Gateway Error';
          actual = service.httpError(response);
          expect(actual.type).toBe(expected.type);
          expect(actual.message).toBe(expected.message);
          expect(actual.code).toBe(expected.code);
        });
    });

    describe('error format', function() {
      var response;
      beforeEach(function() {
        response = {
          status: 666
        };
      });
      it('should support raw error format', function() {
        response.data = {
          type: 'MyError'
        };
        expect(service.httpError(response).type).toBe('MyError');
      });
      it('should support wrapped error format', function() {
        response.data = {
          error: {
            type: 'MyError'
          }
        };
        expect(service.httpError(response).type).toBe('MyError');
      });
      it('should support reason error format', function() {
        response.data = {
          reason: 'My error reason'
        };
        var err = service.httpError(response);
        expect(err.message).toBe('My error reason');
        expect(err.type).toBe('Error');
      });
    });
  });
});
