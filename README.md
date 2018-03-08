# Sitecore Documentation Experience Generator (DXG)

The Sitecore Documentation Experience Generator is the proprietary, paid command-line version of SitecoreUML. Leveraging the open-source APIs associated with StarUML, on which SitecoreUML is based, Sitecore DXG provides support for generating template data model architecture diagrams and HTML documentation from any existing Sitecore instance that has SitecoreUML installed. 

## Installation

Node-canvas and its dependecnies are required: https://github.com/Automattic/node-canvas/wiki/Installation---Windows

The easiest way to install the node-canvas dependencies is to install node.js, then chocolatey, and then use chocolatey to install the ddependencies. As part of the chocolatey dependency installation, it will try to install the Standalone VS2015 Build Tools (Microsoft Build Tools 2015 Update 3: https://www.visualstudio.com/vs/older-downloads/). Note that if you have VS2015 installed then this will not work. If that is the case, you will need to Modify your installation and enable the C++ build tools. Note also that it MUST be VS2015 due to the expected folder path. VS2017 will not work. Once that has been installed, you can easily install the rest with chocolatey, or you can do it manually - instructions for both are on the Installation page of the node-canvas wiki. If you have issues with the Visual C++ part (CL.exe errors) see this page: https://github.com/Automattic/node-canvas/issues/1015. Lastly, don't forget about the Cairo installation. Even though that's bundled with GTK, which was installed by chocolatey, you still need to manually download and unzip it to C:\GTK.

**IMPORTANT:** If you installed your dependencies with chocolatey and/or used the standalone VS 2015 build tools installer then you may need to do the following:

* Run `npm config set msvs_version 2012 --global` before trying to install node-canvas to avoid "The tools version "2.0" is unrecognized. Available tools versions are..." errors
* Install from the standalone VS 2015 Build Tools installer the 8.1 SDK (it's big but required)



