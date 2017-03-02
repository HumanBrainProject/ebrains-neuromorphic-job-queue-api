'use strict';

/* Controllers */
angular.module('nmpi')

.controller('ListQueue', 
            ['$scope', '$rootScope', '$http', '$location', 'Queue', 'Results', 'Context', 'Collab', 'User', 'hbpCollabStore', 'hbpIdentityUserDirectory',
    function( $scope,   $rootScope,   $http,   $location,   Queue,   Results,   Context,   Collab,   User,   hbpCollabStore,   hbpIdentityUserDirectory)
    {

        // pagination server-side
        // http://stackoverflow.com/questions/17309955/angularjs-and-complex-json-returned-by-django-tastypie
        // pagination client-side
        // alternative: http://stackoverflow.com/questions/10816073/how-to-do-paging-in-angularjs ( http://plnkr.co/edit/6PFCPuFrN6lfGHjHVwGf?p=preview )
        $scope.curPage = 0;
        $scope.pageSize = 20;
        $rootScope.with_ctx = true;

        $scope.changePage = function( page )
        {
            $scope.msg = {text:"", css:"", show:false};
            $scope.curPage = page;
        };

        var get_queue = function( cid ){
            // collab_id:cid will be passed as a GET variable and used by tastypie to retrieve only jobs from cid collab
            $scope.queue = Queue.get({collab_id:cid}, function(data){
                $scope.queue.objects.forEach( function( job, key ){
                    $scope.queue.objects[key].user = User.get({id:job.user_id}, function(data){});
                    if( !cid ){ // standalone condition
                        $scope.queue.objects[key].collab = Collab.get({cid:job.collab_id}, function(data){});
                    }
                });
            });
            $scope.queue.objects = new Array(); // init before the resource is answered by the server
        };

        var get_results = function( cid ){
            // collab_id:cid will be passed as a GET variable and used by tastypie to retrieve only jobs from cid collab
            $scope.results = Results.get({collab_id:cid}, function(data){
                $scope.results.objects.forEach( function( job, key ){
                    $scope.results.objects[key].user = User.get({id:job.user_id}, function(data){});
                    if( !cid ){ // standalone condition
                        $scope.results.objects[key].collab = Collab.get({cid:job.collab_id}, function(data){});
                    }
                });

                // on the assumption there will be few queued jobs and many results, we
                // paginate only on the basis of results, which means the first page
                // will be slightly longer, as it also contains queued jobs
                $scope.numberOfPages = function()
                {
                    var numPages = Math.ceil($scope.results.objects.length / $scope.pageSize);
                    $scope.pages = Array.apply(null, {length: numPages}).map(Number.call, Number);
                    return numPages
                };
            });
            $scope.results.objects = new Array(); // init before the resource is answered by the server
        };


        // depending on whether there is a context...
        if( $location.search().ctx ){
            // Inside-collab
            $rootScope.ctx = $location.search().ctx;
            console.log('context:'+$rootScope.ctx);
            $rootScope.with_ctx = true;
            // User
            $rootScope.user = User.get({id:'me'}, function(data){
                console.log("user id:"+$rootScope.user.id);
            });
            // todo: check that user has permission to use the platform
            // todo: check that there is at least one quota associated with the collab
            $scope.inTeam = false;
            $scope.canAccessPlatform = false;
            hbpCollabStore.context.get($rootScope.ctx).then(function (context) {
                $rootScope.collab_id = context.collab.id;

                hbpCollabStore.team.userInTeam(context.collab.id).then(function(response) {
                    $scope.inTeam = response;
                    console.log("User in team: " + response);
                });

                hbpIdentityUserDirectory.isGroupMember(['hbp-sp09-member', 'hbp-neuromorphic-platform-users']).then(function(response) {
                    $scope.canAccessPlatform = response;
                    console.log("User has access to the platform: " + response);
                });

                get_queue(context.collab.id);
                get_results(context.collab.id);
            });
        } else {
            // Stand-alone
            $rootScope.with_ctx = false;
            $rootScope.ctx = null;
            $rootScope.collab_id = null;
            get_queue(null);
            get_results(null);
        }

        if( !$scope.msg ){ $scope.msg = {text:"", css:"", show:false} };
    }
])

.filter( 'pagination', function(){
    return function( input, start )
    {
        if (typeof input === "undefined") {
            return [];
        } else {
            start = +start;
            return input.slice( start );
        }
    };
})



.controller( 'DetailQueue', 
            ['$scope', '$location', '$http', '$rootScope', '$stateParams', 'Queue', 'Results', 'Collab', 'Log',
    function( $scope,   $location,   $http,   $rootScope,   $stateParams,   Queue,   Results,   Collab,   Log)
    {
        $scope.msg = {text: "", css: "", show: false};
        $scope.hpcSite = null;
        $scope.showHPCsites = false;
        
        $scope.del_job = function(id){
            $scope.job.$del({id:id.eId}, function(data){
                // on success, return to job list
                if($rootScope.with_ctx){
                    window.location.href = "app/#/queue?ctx="+$rootScope.ctx;
                } else {
                    window.location.href = "app/#/queue";
                }
            });
        };

        Results.get(
            {id: $stateParams.eId},
            // first we try to get the job from the Results endpoint
            function(job) {
                $scope.job = job;
                $scope.job.collab = Collab.get({cid:$scope.job.collab_id}, function(data){});
            },
            // if it's not there we try the Queue endpoint
            function(error) {
                Queue.get(
                    {id: $stateParams.eId},
                    function(job){
                        $scope.job = job;
                        $scope.job.collab = Collab.get({cid:$scope.job.collab_id}, function(data){});
                    }
                );
            }
        );

        $scope.getLog = function() {
            $scope.log = Log.get({id: $stateParams.eId});
        };

        $scope.copyData = function(target) {
            console.log("Trying to copy data to " + target);
            var response = $http.get('/copydata/' + target + '/' + $stateParams.eId);
            response.success(function (data, status, headers, config) {
                $scope.msg = {text: "Copied " + data.length + ' files', css: "success", show: true};
            });
            response.error(function (data, status, headers, config) {
                $scope.msg = {text: "Data could not be copied.", css: "danger", show: true};
            });
        }
    }
])


.controller('AddJob', 
            ['$scope', '$rootScope', '$location', 'Queue', 'DataItem', 'User', 'Context', 'UiStorageGetData',
    function( $scope,   $rootScope,   $location,   Queue,   DataItem,   User,   Context, UiStorageGetData ) 
    {
        $scope.msg = {text: "", css: "", show: false}; // debug

        // Context
        $rootScope.ctx = $location.search().ctx;
        $rootScope.with_ctx = true;

        // presets
        $scope.hardwares = [
            {value:'BrainScaleS', text:'BrainScaleS'},
            {value:'SpiNNaker', text:'SpiNNaker'},
            {value:'BrainScaleS-ESS', text:'BrainScaleS-ESS'},
            {value:'Spikey', text:'Spikey'},
        ];
        $scope.job = new Queue();
        var curdate = new Date();
        $scope.job.id = null;
        $scope.job.log = " ";
        $scope.job.status = "submitted";
        $scope.job.timestamp_submission = curdate.toUTCString();
        $scope.job.timestamp_completion = curdate.toUTCString(); 
        $scope.job.code = "";
        $scope.job.command = "";
        $scope.job.hardware_config = null;
        $scope.job.hardware_platform = "code_editor";
        $scope.job.selected_tab = "";
        $scope.job.input_data = [];
        $scope.job.output_data = []; 
        $scope.job.resource_uri = ""; 
        $scope.inputs = [];
        $scope.dataitem = DataItem.get({id:'last'});

        $scope.msg_panel = "Code";
        $scope.msg_required = "Please enter your code in the textarea.";
        $scope.number_rows = 5;

        $scope.UiStorageGetData = UiStorageGetData;

        // User
        User.get({id:'me'}, function(user){
            //console.log("create user id:"+user.id);
            $scope.job.user_id = user.id;
        });
        // Collab from Context
        Context.get({ctx: $rootScope.ctx}, function(context){
            //console.log("create collab id: "+context.collab.id);
            $scope.job.collab_id = context.collab.id;
        });
        UiStorageGetData.job = $scope.job;

        $scope.addInput = function() {
            $scope.inputs.push( {id:null, url:'', resource_uri:''} );
        }

        $scope.removeInput = function() {
            $scope.inputs.pop(); 
        }

        // post
        $scope.submit = function( job ){
            $scope.master_job = angular.copy( job );
            if( $scope.job.hardware_config != null ){
                $scope.job.hardware_config = JSON.parse( $scope.job.hardware_config );
            }
            // if dataitem have been added, save them and at the end save the job
            if( $scope.inputs.length ){
                $scope.inputs.forEach( function(input){
                    if( input.url.length ){ // if there is a value
                        var dataitem = new DataItem();
                        dataitem.id = null;
                        dataitem.url = input.url;
                        dataitem.resource_uri = '';
                        dataitem.$save(
                            function(response){
                                $scope.job.input_data.push(response);
                                //console.log(JSON.stringify($scope.inputs));
                                // save the job only when the input_data is full
                                // wait until $scope.job.input_data has the same number as $scope.inputs.length
                                if( $scope.inputs.length == $scope.job.input_data.length ){
                                    // save to server
                                    $scope.savejob();
                                }
                            }
                        );
                    }
                });
            } else {
                // save directly to server if there are no inputs
                $scope.savejob();
            }
        };

        $scope.checkCodeField = function(){
            if(angular.element('#code').val().length == 0){
                return true;
            } else {
                return false;
            }
        };

        $scope.checkJSON = function(){
            //console.log( $scope.job.hardware_config );
            // this is called any time any field is edited. Is there a way to ensure it is
            // only called when the hardware config field is edited?
            try{
                JSON.parse($scope.job.hardware_config);
            }catch(e){

                return true;
            }
            return false;
        };

        $scope.savejob = function(){
            $scope.job.$save({},
                function(data){  // success
                    console.log(JSON.stringify(data));
                    $rootScope.msg = {
                        text: "Your job has been submitted. You will receive further updates by email.",
                        css: "success",
                        show: true
                    };
                    $location.path( '/queue').search({ctx:$rootScope.ctx});
                },
                function(err) { // error
                    console.log(err.status + ": " + err.data);
                    $scope.$parent.msg = {
                        text: "Your job has not been submitted. " + err.data,
                        css: "danger",
                        show: true
                    };
                }
            );
            UiStorageGetData.job = $scope.job;
        }

        // reset
        $scope.reset = function(){
            $scope.msg.show = false;
            $location.path( '/queue').search({ctx:$rootScope.ctx});
        };

        //toogle code tabs
        $scope.toogleTabs = function(id_tab){
            $scope.job.selected_tab = id_tab;

            $scope.number_rows = 5;
            if(id_tab == "upload_link" | id_tab == "upload_script"){
              $scope.number_rows = 1;
            }

            document.getElementById("code_editor_upload_link").style.display="none";
            document.getElementById("upload_script").style.display="none";

            document.getElementById("code_editor_upload_link").style.display="block";
            // document.getElementById("code").readOnly = false;
            if(id_tab == "code_editor"){
                $scope.msg_panel = "Code";
                $scope.msg_required = "Please enter your code in the textarea.";
            }
            if(id_tab == "upload_link"){
                $scope.msg_panel = "URL of zip file or Git repository";
                $scope.msg_required = "Please enter a Git repository URL or the URL of a zip archive containing your code.";
            }
            if(id_tab == "upload_script"){
                $scope.msg_panel = "ID of selected file";
                $scope.msg_required = "Please select a file below to load and upload an existing script.";
                document.getElementById(id_tab).style.display="block";
                // document.getElementById("code").readOnly = true;
                // $scope.create_job.$setValidity("code", true);
            }

            var a = document.getElementById("li_code_editor");
            var b = document.getElementById("li_upload_link");
            var c = document.getElementById("li_upload_script");
            a.className = b.className = c.className = "nav-link";
            var d = document.getElementById("li_"+id_tab);
            d.className += " active";
        };
    }
])

.controller('UiStorageController', function($scope, $rootScope, $http, $location, clbUser, clbCollab, clbStorage, Context, UiStorageGetData) {
  var vm = this;
  vm.authInfo = true;

  $rootScope.ctx = $location.search().ctx;
  $rootScope.with_ctx = true;

  $scope.UiStorageGetData = UiStorageGetData;

  // Collab from Context
  Context.get({ctx: $rootScope.ctx}, function(context){
    vm.selectedCollabId = context.collab.id;
  
    clbCollab.list().then(function(collabs) {
      vm.collabs = collabs.results;
    });

    $scope.$watch('vm.selectedCollabId', function(id) {
      vm.loading = true;
      clbStorage.getEntity({collab: id}).then(function(collabStorage) {
        vm.collabStorage = collabStorage;
      }, function() {
        vm.collabStorage = null;
      })
      .finally(function() {
        vm.loading = false;
      });
    });
    $scope.$on('clbAuth.changed', function(event, authInfo) {
      vm.authInfo = authInfo;
    });
  });
})

.service('UiStorageGetData', function(){
    this.selectedFile = "";
    this.job = "";
});
