describe('nmpi.ListQueue', function() {
    console.log("begining nmpi.ListQueue");
    var $controller, ListQueue;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    console.log("before inject controller");
    beforeEach(inject(function( _$controller_) {
        // nmpi = _nmpi_;
        // ListQueue = _ListQueue_;
        $controller = _$controller_;
        ListQueue = $controller('ListQueue', {});
        console.log("injected controller");
    }));
    // Verify our controller exists
    it('ListQueue should be defined', function() {
        expect(ListQueue).toBeDefined();
    });

    it('change page', function() {
        ListQueue.changePage();
    });
});

// describe('nmpi.DetailQueue', function() {
//     beforeEach(angular.mock.module('nmpi'));
//     beforeEach(inject(function( _DetailQueue_) {
//         nmpi = _nmpi_;
//         DetailQueue = _DetailQueue_;
//     }));
//     it('test getLog',  function() {
//         DetailQueue.getLog();
//     });
// });

describe('AddJob', function() {
    
});

describe('ReSubmitJob', function() {
    
});

describe('UiStorageController', function() {
    
});
