# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.5)

# If CMAKE_DISABLE_SOURCE_CHANGES is set to true and the source directory is an
# existing directory in our source tree, calling file(MAKE_DIRECTORY) on it
# would cause a fatal error, even though it would be a no-op.
if(NOT EXISTS "E:/IOT/Proyecto_v3/build/_deps/espidflib-src")
  file(MAKE_DIRECTORY "E:/IOT/Proyecto_v3/build/_deps/espidflib-src")
endif()
file(MAKE_DIRECTORY
  "E:/IOT/Proyecto_v3/build/_deps/espidflib-build"
  "E:/IOT/Proyecto_v3/build/_deps/espidflib-subbuild/espidflib-populate-prefix"
  "E:/IOT/Proyecto_v3/build/_deps/espidflib-subbuild/espidflib-populate-prefix/tmp"
  "E:/IOT/Proyecto_v3/build/_deps/espidflib-subbuild/espidflib-populate-prefix/src/espidflib-populate-stamp"
  "E:/IOT/Proyecto_v3/build/_deps/espidflib-subbuild/espidflib-populate-prefix/src"
  "E:/IOT/Proyecto_v3/build/_deps/espidflib-subbuild/espidflib-populate-prefix/src/espidflib-populate-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "E:/IOT/Proyecto_v3/build/_deps/espidflib-subbuild/espidflib-populate-prefix/src/espidflib-populate-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "E:/IOT/Proyecto_v3/build/_deps/espidflib-subbuild/espidflib-populate-prefix/src/espidflib-populate-stamp${cfgdir}") # cfgdir has leading slash
endif()
