'use strict';

/* Queue Module */

angular.module( 'nmpi' )

.factory(
    'Queue',
    function( $resource ){ // , $filter can be added if ngFilter is injected above
        return $resource( window.base_url + window.ver_api + 'queue/:id/', { id:'@eId' },
        {
            get: { method: 'GET', params:{ format:'json' }, isArray: false },
            save: { method: 'POST', params:{ format:'json' }, headers:{ 'Content-Type':'application/json' } },
            del: { method: 'DELETE', params:{ format:'json' }, headers:{ 'Content-Type':'application/json' } },
            update: { method: 'PUT', params:{ format:'json' }, headers:{ 'Content-Type':'application/json' } },
        });
    }
)
.factory(
    'Results',
    function( $resource ){ // , $filter can be added if ngFilter is injected above
        return $resource( window.base_url + window.ver_api + 'results/:id/', { id:'@eId' },
        {
            get: { method: 'GET', params:{ format:'json' }, isArray: false },
            del: { method: 'DELETE', params:{ format:'json' }, headers:{ 'Content-Type':'application/json' } },
            update: { method: 'PUT', params:{ format:'json' }, headers:{ 'Content-Type':'application/json' } },
        });
    }
)
.factory(
    'Comment',
    function( $resource ){ // , $filter can be added if ngFilter is injected above
        return $resource( window.base_url + window.ver_api + 'comment/:id/', { id:'@eId' },
        {
            get: { method: 'GET', params:{ format:'json' }, isArray: false },
            save: { method: 'POST', params:{ format:'json' }, headers:{ 'Content-Type':'application/json' } },
            del: { method: 'DELETE', params:{ format:'json' }, headers:{ 'Content-Type':'application/json' } },
            update: { method: 'PUT', params:{ format:'json' }, headers:{ 'Content-Type':'application/json' } },
        });
    }
)
.factory(
    'Log',
    function( $resource ){
        return $resource( window.base_url + window.ver_api + 'log/:id/', { id:'@eId' },
            {
                get: { method: 'GET', params:{ format:'json' }, isArray: false },
            }
        );
    }
)
.factory(
    'Tags',
    function( $resource ){
        return $resource( window.base_url + window.ver_api + 'tags/:id/', { id:'@eId' },
            {
                get: { method: 'GET', params:{ format:'json' }, isArray: false }
            }
        );
    }
)

;
