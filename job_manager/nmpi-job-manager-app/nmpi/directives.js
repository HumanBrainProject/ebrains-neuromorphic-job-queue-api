
angular.module('nmpi.directives', [ ])

// select allowing written values
.directive( 'openSelect',
    function(){
        return {
            scope: {
                class:'@',
                name:'@',           // by value (string, one-way)
                options:'=',        // by reference (two-way)
                model:'=',
                clickCallback:'&',   // event trigger
            },
            restrict: 'E',
            link: function( scope, element, attr ){},
            replace: true,
            template:
                "<div class='dropdown'>"+
                "   <input class='dropdown-toggle' data-toggle='dropdown' type='text' ng-model='model'/>"+
                "   <ul class='dropdown-menu'>"+
                "       <li class='class' ng-repeat='choice in options'>"+
                "       <a ng-click=\"clickCallback({value: choice.value})\">{{choice.value}}</a>"+
                "       </li>"+
                "   </ul>"+
                "</div>"
        };
    }
);
