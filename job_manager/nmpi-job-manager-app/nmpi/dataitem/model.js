'use strict';

angular.module( 'nmpi' )

.factory( 
    'DataItem', // Object model
    function( $resource ){ // , $filter can be added if ngFilter is injected above
        return $resource( window.base_url + window.ver_api + 'dataitem/:id/', { id:'@eId' },
            {
                get: { method: 'GET', params:{ format:'json' }, isArray: false },
            	save: { method: 'POST', params:{ format:'json' }, headers:{ 'Content-Type':'application/json' } },
            }
        );
    }
)

;
