'use strict';

/* Controllers */
angular.module('nmpi')


.controller('ListQueue',
            ['$scope', '$rootScope', '$http', '$location', 'Queue', 'Results', 'Context', 'Collab', 'User', 'Tags', 'hbpCollabStore', 'hbpIdentityUserDirectory',
    function( $scope,  $rootScope,   $http,   $location,   Queue,   Results,   Context,   Collab,   User,  Tags,  hbpCollabStore,   hbpIdentityUserDirectory)
    {
        // pagination server-side
        // http://stackoverflow.com/questions/17309955/angularjs-and-complex-json-returned-by-django-tastypie
        // pagination client-side
        // alternative: http://stackoverflow.com/questions/10816073/how-to-do-paging-in-angularjs ( http://plnkr.co/edit/6PFCPuFrN6lfGHjHVwGf?p=preview )
        $scope.curPage = 0;
        $scope.pageSize = 20;
        $rootScope.with_ctx = true;

        $scope.tags_list = {};
        $scope.status_list = {};
        $scope.hardware_list = {};
        $scope.tags = Tags.get();
        $scope.hardware_choices = ["BrainScaleS", "SpiNNaker", "BrainScaleS-ESS", "Spikey"];
        $scope.status_choices = ["submitted", "running", "finished", "error"];

        var sendState = function(state, page) {
            var displayPage = page + 1; // in the UI, pages are numbered from 1
            window.parent.postMessage({
                eventName: 'workspace.context',
                data: {
                    state: 'page.' + displayPage
                }
            }, 'https://collab.humanbrainproject.eu/');
        };


        $scope.changePage = function( page )
        {
            $scope.msg = {text:"", css:"", show:false};
            sendState("list", page);
            $scope.curPage = page;
        };

        $scope.get_queue = function( cid ){
            // collab_id:cid will be passed as a GET variable and used by tastypie to retrieve only jobs from cid collab
            console.log("cid : " + cid);
            $scope.queue = Queue.get({collab_id:cid}, function(data){
                console.log("data : " + JSON.stringify(data));
                $scope.queue.objects.forEach( function( job, key ){
                    $scope.queue.objects[key].user = User.get({id:job.user_id}, function(data){});
                    if( !cid ){ // standalone condition
                        $scope.queue.objects[key].collab = Collab.get({cid:job.collab_id}, function(data){});
                    }
                });
            });
            $scope.queue.objects = new Array(); // init before the resource is answered by the server
        };

        $scope.get_results = function( cid ){
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
                    var numPages = Math.ceil($scope.filtered_jobs.length / $scope.pageSize);
                    $scope.pages = Array.apply(null, {length: numPages}).map(Number.call, Number);
                    return numPages;
                };
            });
            $scope.results.objects = new Array(); // init before the resource is answered by the server
        };

        var contextState = $location.search().ctxstate;
        if (contextState && contextState.startsWith('page')) {
            var displayPage = contextState.slice(5);
            $scope.curPage = displayPage - 1;
        }

        sendState("list", $scope.curPage);

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
            // todo: check that there is at least one quota associated with the collab
            $scope.inTeam = false;
            $scope.canAccessPlatform = false;
            hbpCollabStore.context.get($rootScope.ctx).then(function (context) {
                $rootScope.collab_id = context.collab.id;

                hbpCollabStore.team.userInTeam(context.collab.id).then(function(response) {
                    $scope.inTeam = response;
                    console.log("User in team: " + response);
                });

                hbpIdentityUserDirectory.isGroupMember(['hbp-sp09-member',
                                                        'hbp-sga1-sp09-member',
                                                        'hbp-neuromorphic-platform-users']).then(function(response) {
                    $scope.canAccessPlatform = response;
                    console.log("User has access to the platform: " + response);
                });

                $scope.get_queue(context.collab.id);
                console.log("$scope.queue : " + JSON.stringify($scope.queue));
                $scope.get_results(context.collab.id);
            });
        } else {
            // Stand-alone
            $rootScope.with_ctx = false;
            $rootScope.ctx = null;
            $rootScope.collab_id = null;
            $scope.get_queue(null);
            $scope.get_results(null);
        }

        if( !$scope.msg ){ $scope.msg = {text:"", css:"", show:false} };
        $scope.build_info = window.bbpConfig.build;
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

// filter job list with selected tags
.filter( 'tagsFilter', function(){
        return function(jobs, tags) {
            if (typeof tags === "undefined" || tags.length === 0)  {
                return jobs;
            } else {
                return jobs.filter(function (job) {
                    for (var i in job.tags) {
                        if (tags.indexOf(job.tags[i]) !== -1) {
                            return true;
                        }
                    }
                    return false;
                });
            }
        };
    })


.controller( 'DetailQueue', 
            ['$scope', '$location', '$http', '$rootScope', '$stateParams', 'Queue', 'Results', 'Comment', 'Collab', 'Log', 'hbpCollabStore', 'User',
    function( $scope,   $location,   $http,   $rootScope,   $stateParams,   Queue,   Results, Comment, Collab,   Log, hbpCollabStore,  User)
    {
        $scope.msg = {text: "", css: "", show: false};
        $scope.hpcSite = null;
        $scope.showHPCsites = false;
        $scope.is_test = false;

        //console.log('context detail :'+$rootScope.ctx);

        $scope.comment = new Comment();
        $scope.comment.content = "";
        // add user to comment
        User.get({id:'me'}, function(user){
            $scope.currentUser = user;
        });

        // only members of the collab should see the tags edit button
        $scope.inTeam = false;
        hbpCollabStore.context.get($rootScope.ctx).then(function (context) {
            $rootScope.collab_id = context.collab.id;
            hbpCollabStore.team.userInTeam(context.collab.id).then(function(response) {
                    $scope.inTeam = response;
                });
            });

        $scope.del_job = function(id){
            $scope.job.$del({id:id.eId}, function(data){
                // on success, return to job list
                console.log("data : " + JSON.stringify(data));
                if($rootScope.with_ctx){
                    if($scope.is_test == false){
                        window.location.href = "app/#/queue?ctx="+$rootScope.ctx;
                    } else {
                        $scope.win_href = "app/#/queue?ctx="+$rootScope.ctx;
                    }
                } else {
                    if($scope.is_test == false){
                        window.location.href = "app/#/queue";
                    } else {
                        $scope.win_href = "app/#/queue";
                    }
                }
            });
        };

        $scope.removeTag = function(job, tag, id){
            var index = job.tags.indexOf(tag.name);
            if (index > -1) {
                job.tags.splice(index, 1);
            }
            job.$update({id:id.eId});
        };

        $scope.addTag = function(job, tag, id){
            job.tags.push(tag.name);
            job.$update({id:id.eId});
        };

        // create a new comment
        $scope.submit_comment = function(comment, job){
            // add related job
            $scope.comment.user = $scope.currentUser.id;
            $scope.comment.job = job.resource_uri;
            $scope.comment.$save({},
                function(data){  // success
                    console.log("data : " + data);
                    $scope.$parent.msg = {
                        text: "Your comment has been submitted.",
                        css: "success",
                        show: true
                    };
                    $scope.comment.user_obj = $scope.currentUser;
                    if (typeof $scope.job.comments !== 'undefined') { //for test
                        $scope.job.comments.push($scope.comment);
                    } else {
                        $scope.job.comments = new Array();
                        $scope.job.comments.push($scope.comment);
                    }
                    $scope.comment = new Comment();
                    $scope.comment.content = "";
                    //console.log("data : " + JSON.stringify(data));
                },
                function(err) { // error
                    console.log(err.status + ": " + err.data);
                    $scope.$parent.msg = {
                        text: "Your comment has not been submitted. " + err.data,
                        css: "danger",
                        show: true
                    };
                }
            );
        };

        var sendState = function(state, job_id){
            window.parent.postMessage({
                eventName: 'workspace.context',
                data: {
                    state: 'job.' + job_id
                }
            }, 'https://collab.humanbrainproject.eu/');
        };
        Results.get(
            {id: $stateParams.eId},
            // first we try to get the job from the Results endpoint
            function(job) {
                $scope.job = job;
                $scope.job.collab = Collab.get({cid:$scope.job.collab_id}, function(data){});
                $scope.job.user = User.get({id:job.user_id}, function(data){});
                if (typeof $scope.job.comments !== 'undefined') { //for test
                    $scope.job.comments.forEach( function( comment, key ){
                        $scope.job.comments[key].user_obj = User.get({id:comment.user}, function(data){});
                    });
                }
            },
            // if it's not there we try the Queue endpoint
            function(error) {
                Queue.get(
                    {id: $stateParams.eId},
                    function(job){
                        $scope.job = job;
                        $scope.job.collab = Collab.get({cid:$scope.job.collab_id}, function(data){});
                        $scope.job.user = User.get({id:job.user_id}, function(data){});
                    }
                );
            }
        );
        
        $scope.getLog = function() {
            console.log("$stateParams.eId : " + $stateParams.eId);
            $scope.log = Log.get({id: $stateParams.eId});
            return $scope.log;
        };

        $scope.copyData = function(target) {
            console.log("Trying to copy data to " + target);
            var response = $http.get('/copydata/' + target + '/' + $stateParams.eId);
            response.success(function (data, status, headers, config) {
                //console.log("*** SUCCESS ***" + data + "/" + status + "/" + JSON.stringify(config));
                $scope.status = status;
                $scope.config = config;
                if(data == undefined){
                    var data = {};
                    data.length = 0;
                }
                $scope.msg = {text: "Copied " + data.length + ' files', css: "success", show: true};
            });
            response.error(function (data, status, headers, config) {
                console.log("*** ERROR ***");
                $scope.msg = {text: "Data could not be copied.", css: "danger", show: true};
            });
        };

        $scope.isImage = function(url) {
            var filename = url.split('/').pop();
            var extension = filename.split('.').pop().toLowerCase();
            return ['jpg', 'jpeg', 'gif', 'png', 'svg'].includes(extension);
        };

        $scope.editorOptions = {
            lineWrapping : false,
            lineNumbers: false,
            readOnly: true,
            mode: {name: "python", version: 2},
            theme: "elegant",
            viewportMargin: Infinity
        };

        sendState("detail", $stateParams.eId);
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
        $scope.job.hardware_config = {};
        $scope.job.hardware_platform = "";
        $scope.job.selected_tab = "code_editor";
        $scope.job.tags = [];
        $scope.job.input_data = [];
        $scope.job.output_data = []; 
        $scope.job.resource_uri = ""; 
        $scope.inputs = [];

        $scope.msg_panel = "Code";
        $scope.msg_required = "Please enter your code in the textarea.";

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
            $scope.job.provenance = {'collaboratory': {'nav_item': context.id}}
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

        $scope.savejob = function(){
            console.log("$scope.job : " + JSON.stringify($scope.job));
            var result = $scope.job.$save({},
                function(data){  // success
                    $rootScope.msg = {
                        text: "Your job has been submitted. You will receive further updates by email.",
                        css: "success",
                        show: true
                    };
                    $location.path('/queue').search({ctx:$rootScope.ctx});
                },
                function(err) { // error
                    $scope.$parent.msg = {
                        text: "Your job has not been submitted. " + err.data,
                        css: "danger",
                        show: true
                    };
                }
            );
        }

        // reset
        $scope.reset = function(){
            $scope.msg.show = false;
            $location.path( '/queue').search({ctx:$rootScope.ctx});
        };

        //toggle code tabs
        $scope.toggleTabs = function(id_tab){
            console.log("tab " + id_tab);
            $scope.job.selected_tab = id_tab;

            $scope.number_rows = 5;
            if(id_tab == "upload_link" | id_tab == "upload_script"){
              $scope.number_rows = 1;
            }

            if(id_tab == "code_editor"){
                $scope.msg_required = "Please enter your code in the text area.";
            }
            if(id_tab == "upload_link"){
                $scope.msg_required = "Please enter a Git repository URL or the URL of a zip archive containing your code.";
            }
            if(id_tab == "upload_script"){
                $scope.msg_required = "Please select a file or folder to submit an existing script.";
            }

            var a = document.getElementById("li_code_editor");
            var b = document.getElementById("li_upload_link");
            var c = document.getElementById("li_upload_script");
            a.className = b.className = c.className = "nav-link";
            var d = document.getElementById("li_"+id_tab);
            d.className += " active";
        };

        $scope.editorOptions = {
            lineWrapping : false,
            lineNumbers: false,
            readOnly: false,
            mode: {name: "python", version: 2},
            theme: "elegant",
            viewportMargin: Infinity
        };
    }
])

.controller('ReSubmitJob', 
            ['$scope', '$rootScope', '$location', 'Queue', 'Results', 'DataItem', 'User', 'Context',
    function( $scope,   $rootScope,   $location,   Queue, Results,   DataItem,   User,   Context ) 
    {
        $scope.msg = {text: "", css: "", show: false}; // debug

        //get id
        var location_array = new Array();
        var job_id = "";
        location_array = $location.$$url.split('/');
        job_id = location_array[3];

        // Context
        //$rootScope.ctx = $location.search().ctx;
        $rootScope.with_ctx = true;

        //console.log("job id : " + job_id);
        //console.log('context:'+$rootScope.ctx);

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
        $scope.job.collab_id = $scope.collab_id;
        $scope.job.tags = [];
        $scope.job.input_data = [];
        $scope.job.output_data = []; 
        $scope.job.resource_uri = "";
        $scope.inputs = [];

        Results.get({id:job_id}, function(former_job){
            $scope.job.code = former_job.code;
            $scope.job.command = former_job.command;
            $scope.job.hardware_config = former_job.hardware_config;
            delete $scope.job.hardware_config["resource_allocation_id"];
            $scope.job.hardware_platform = former_job.hardware_platform;
            $scope.job.tags = former_job.tags;

            $scope.inputs = [];

            // User
            User.get({id:'me'}, function(user){
                //console.log("create user id:"+user.id);
                $scope.job.user_id = user.id;
            });
            // Collab from Context
            Context.get({ctx: $rootScope.ctx}, function(context){
                //console.log("create collab id: "+context.collab.id);
                $scope.job.collab_id = context.collab.id;
                $scope.job.provenance = {'collaboratory': {'nav_item': context.id}}
            });
        });

        $scope.addInput = function() {
            $scope.inputs.push( {id:null, url:'', resource_uri:''} );
        }

        $scope.removeInput = function() {
            $scope.inputs.pop(); 
        }

        // post
        $scope.submit = function( job ){
            $scope.master_job = angular.copy( job );
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

        $scope.savejob = function(){
            console.log("$scope.job : " + JSON.stringify($scope.job));
            var result = $scope.job.$save({},
                function(data){  // success
                    console.log(JSON.stringify(data));
                    $rootScope.msg = {
                        text: "Your job has been submitted. You will receive further updates by email.",
                        css: "success",
                        show: true
                    };
                    $location.path('/queue').search({ctx:$rootScope.ctx});
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
        }

        // reset
        $scope.reset = function(){
            $scope.msg.show = false;
            $location.path( '/queue').search({ctx:$rootScope.ctx});
        };

        $scope.editorOptions = {
            lineWrapping : false,
            lineNumbers: false,
            readOnly: false,
            mode: {name: "python", version: 2},
            theme: "elegant",
            viewportMargin: Infinity
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
    $scope.$on('clbFileBrowser:focusChanged', function(event, value) {
      console.log('focus changed. Value is:');
      console.log(value);
      $scope.UiStorageGetData.selectedFile = value.name;
      $scope.UiStorageGetData.job.code = value.uuid;
    });
  });
})

.service('UiStorageGetData', function(){
    this.selectedFile = "";
    this.job = "";
});

