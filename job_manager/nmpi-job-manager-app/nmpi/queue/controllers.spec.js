describe('ListQueue', function() {
    console.log("begining nmpi.ListQueue");
    //var $controller, ListQueue;
    var $controller, $rootScope, controller;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    
    console.log("before inject controller");
    //beforeEach(inject(angular.mock.inject(function( _$controller_, _ListQueue_) {
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_ ) {
        // nmpi = _nmpi_;
        // ListQueue = _ListQueue_;
        // $controller = _$controller_;
        // ListQueue = $controller('ListQueue', {
        //     '$scope': scope,
        //     //'$rootScope': rootScope,
        // });
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;

        controller = $controller('ListQueue', { $scope: $scope });
        // var ListQueue = function() {
        //     return $controller('ListQueue', {
        //         $scope: $scope,
        //     })
        // };

        //ListQueue = $controller('ListQueue');
        console.log("injected controller : " + controller );
    })));
    
    // Verify our controller exists
    it('ListQueue should be defined', function() {
        console.log("controller ListQueue : " + controller );
        console.log("begining ListQueue should be defined");
        expect(controller).toBeDefined();
    });

    it('change page', function() {
        console.log("controller ListQueue : " + controller );
        console.log("begining change page");
        controller.changePage();
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
