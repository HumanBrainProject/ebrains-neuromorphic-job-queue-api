
To generate the code in the swagger directory, one must:

1) install the swagger code generator:
   https://github.com/wordnik/swagger-codegen

   Note: May need to edit the runscala.sh such that the SCALA_RUNNER_VERSION 
         to what scala version you are running; it isn't always detected correctly
2) Run 
   ./bin/runscala.sh com.wordnik.swagger.codegen.BasicPythonGenerator http://localhost:8888/ui/spec/ special-key

3) Copy the files from the python directory to the swagger directory
