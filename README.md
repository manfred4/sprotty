# Sprotty

[![Gitpod - Code Now](https://img.shields.io/badge/Gitpod-code%20now-blue.svg?longCache=true)](https://gitpod.io#https://github.com/eclipse/sprotty)
[![Join the chat at https://gitter.im/eclipse/sprotty](https://badges.gitter.im/eclipse/sprotty.svg)](https://gitter.im/eclipse/sprotty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

This is the client part of _Sprotty_, a next-generation, open-source diagramming framework built with web technologies. 

<img src="images/screenshot0.png" width="23%" align="left">
<img src="images/screenshot1.png" width="23%" align="left">
<img src="images/screenshot2.png" width="23%" align="left">
<img src="images/screenshot3.png" width="23%"> 

  
Some selected features:

* fast, scalable SVG rendering that is compatible with many browsers and stylable with CSS,
* animations built into the core,
* support for a distributed runtime with a diagram client and a model server,
* a fast, reactive client architecure implemented in TypeScript,
* a Java-based server architecture,
* configuration via dependency injection,
* integration with Xtext, the Language Server Protocol and Theia that can be run as rich-client as well as in the browser.

## Repositories

The Sprotty project spans across four GitHub repositories
* sprotty (this repository) contains client code (TypeScript) and the examples.
* [sprotty-server](https://github.com/eclipse/sprotty-server) contains server code (Java/Xtend) including server-side diagram layout, the extension of the Language Server Protocol, and the integration with the Xtext framework.
* [sprotty-theia](https://github.com/eclipse/sprotty-theia) contains the glue code (TypeScript) to integrate sprotty views in the Theia IDE.
* [sprotty-layout](https://github.com/eclipse/sprotty-layout) contains the API for client-side diagram layout and an implementation based on the Eclipse Layout Kernel.

## Docs

For further information please consult the [wiki](https://github.com/eclipse/sprotty/wiki) or this [blog post](http://typefox.io/sprotty-a-web-based-diagramming-framework).

## References

- [DSL in the Cloud example](http://github.com/TypeFox/theia-xtext-sprotty-example) an example using Xtext, Theia and Sprotty to create a DSL workbench in the cloud.
- [npm dependencies](http://npm-dependencies.com/) to discover dependencies of npm packages
- [Examples](http://sprotty-demo.typefox.io) a hosted version of some Sprotty examples
- [yangster](http://github.com/theia-ide/yangster) a Theia extension for the YANG language.

