'use strict';

/* Context Module */
angular.module( 'nmpi' ).factory( 
    'Context',
    function( $resource ){
        return $resource( 'https://services.humanbrainproject.eu/collab/v0/collab/context/:ctx/', { ctx:'@ctx' },
        {
            get: { method: 'GET', isArray: false },
        });
    }
);

/* Collab Module */
angular.module( 'nmpi' ).factory( 
    'Collab',
    function( $resource ){
        return $resource( 'https://services.humanbrainproject.eu/collab/v0/collab/:cid/', { cid:'@cid' },
        {
            get: { method: 'GET', isArray: false },
        });
    }
);
