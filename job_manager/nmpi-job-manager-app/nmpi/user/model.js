'use strict';

/* HBP User Module */

angular.module( 'nmpi' )

.factory( 
    'User', // User model
    function( $resource ){
        return $resource( 'https://services.humanbrainproject.eu/idm/v1/api/user/:id', { id:'@id' },
        {
            get: { method: 'GET', isArray: false },
        });
    }
)

;
