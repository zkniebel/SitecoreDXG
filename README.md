# Sitecore Documentation Experience Generator (DXG)

The Sitecore Documentation Experience Generator is a proprietary, REST-based version of SitecoreUML that can be used without any GUI and can be called directly from the CI/CD pipeline. Leveraging the open-source APIs associated with StarUML, on which SitecoreUML is based, SitecoreDXG provides support for generating template data model architecture diagrams and HTML documentation from any existing Sitecore instance that has SitecoreUML installed (SitecoreUML 1.3.5+). 

## Comparison with SitecoreUML

SitecoreDXG comes from the SitecoreUML family, and leverages many of the same backing libraries but none of the same code. In contrast with SitecoreUML, SitecoreDXG was built specifically to be used without any GUI tools, whereas SitecoreUML is heavily dependent on the GUI provided by the StarUML IDE. Because of this, SitecoreDXG improves upon three of SitecoreUML's greatest areas of opportunity:

* SitecoreDXG can be called directly from CI/CD pipelines
* SitecoreDXG does not require users to install and learn a new IDE/program in order to use it
* SitecoreDXG does not suffer from run-time rendering performance penalties during template import and diagram generation, and is thus **significantly** faster

There are currently plans for SitecoreUML's import engine to be rewritten to directly call SitecoreDXG on import, and to use a "deferred rendering" strategy to avoid the exponential performance penalty during import. 

While SitecoreUML does have some features that SitecoreDXG does not currently have, it it important to note that when SitecoreDXG generates documentation it also generates a MDJ project file that can be opened and edited in StarUML. StarUML is, of course, also capable of regenerating the documentation. Specifically, these features include the following:

* SitecoreUML's new Helix features (intended for initial release, post-beta)
* Ability to customize markup after import
* Ability to create a new or update an existing architecture and deploy it to Sitecore

Lastly, SitecoreDXG works differently from how SitecoreUML works, as will be discussed further in the *Architecture* section.

## Architecture

A fully-functional SitecoreDXG ecosystem typically consists of three main components:

1. SitecoreUML Service for Sitecore
2. SitecoreDXG Generation Service
3. SitecoreDXG Middleman 

### SitecoreUML Service for Sitecore

Originally introduced as part of SitecoreUML, the SitecoreUML Service for Sitecore is a Helix-compliant Sitecore package that adds a .NET service to the Sitecore instance on which it is installed. This service, is used for all communication with the Sitecore solution, including retrieving templates, retrieving the template architecture (including folder structure), deploying an architecture to Sitecore (SitecoreUML only), and more. In the SitecoreDXG ecosystem, this service is used for retrieving the template architecture for which documentation is to be generated.

Note that SitecoreDXG supports the SitecoreUML Service for Sitecore from **SitecoreUML 1.3.5+**.

### SitecoreDXG Generation Service

The heart of SitecoreDXG, the SitecoreDXG Generation Service is the REST-based Node.js application that actually performs the generation of the HTML documentation and the diagrams. As the generation of the documentation and diagrams is very CPU-intensive, and since Node.js is unfortunately single-threaded the generation code is blocking code. As such, like a TeamCity or Jenkins build agent only one generation action may be executed at a time (it is planned to change this to 1 generation action per CPU after the initial release). 

**Developer note:** Because the underlying libraries that SitecoreDXG leverages, including those that generate the actual diagram images, are Node.js-based, it wasn't tenable to write the SitecoreDXG Generation Service in another language without any Node.js dependencies for the CPU-intensive work. My hope is to update the SitecoreDXG Generation Service to use one of the new multithreaded Node.js libraries at some point in the coming year, as they do not currently seem to be mature enough for what SitecoreDXG needs. If anyone has suggestions regarding this, please don't hesitate to reach out to me over Sitecore Community Slack (@zachary_kniebel).

### SitecoreDXG Middleman

The SitecoreDXG Middleman is a (technically optional) role in the SitecoreDXG ecosystem that can be satisfied in a number of ways, including PowerShell scripts, batch scripts, scheduled services, other code or manual action. The SitecoreDXG Middleman role is responsible for retrieving the template architecture from the SitecoreUML Service for Sitecore, passing the architecture along to the SitecoreDXG Generation Service for processing, and retrieving the resulting generated HTML documentation. A user, automated build process, scheduled task, etc. would trigger the SitecoreDXG Middleman to run or would otherwise execute its responsibilities and would then be able to handle the result in whatever way is needed. It is important to note that the intent behind SitecoreDXG is to be as flexible and customizeable as possible so that the program can be incorporated into any development team's processes and systems in whatever way they deem best. As such, the SitecoreDXG Middleman role should not in any way be black box, but it is also more difficult to concretly describe, since it is intented for developers to easily create custom SitecoreDXG Middlemen scripts and tools with minimal effort.

The beta version of SitecoreDXG will include a single PowerShell script that can be used as an example SitecoreDXG Middleman and a quick-start resource for getting started with minimal effort. The script will accept the necessary parameters for connecting to the SitecoreUML Service for Sitecore and will output the generated HTML documentation. 

Following the beta, the intial release is currently planned to include both the previously mentioned PowerShell script and a custom TeamCity build runner as two optional SitecoreDXG Middlemen that can be used for rapid incorporation into a variety of sitations.

Lastly, it is important to note that each SitecoreDXG Middleman, even a "manual middleman" (i.e. manually sending the requests without a reusable script), is considered the entry point of the SitecoreDXG workflow. The program should both start and end at the SitecoreDXG Middleman, and while you may have any number of Middlemen in your ecosystem for a multitude of use-cases, only one should ever be executing as part of the ecosystem at a time. 

-----

## Installation

The below instructions can be used for installing the various components of SitecoreDXG.

-----

## Installing the SitecoreDXG Generation Service

SitecoreDXG is dependent on [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows). To install SitecoreDXG, you must first have the dependencies for *node-canvas* installed, which cannot be installed through a simple `npm install`. In the below, I have outlined the steps that you must take to install first the dependencies and then SitecoreDXG itself.

### Step 1: Install the [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows) dependencies

The easiest way to install the node-canvas dependencies is as follows:

1. Install node.js (verified with 6.11.4+)
2. Install chocolatey (verified with 0.10.8+)
3. Use chocolatey to install the rest of the dependencies
   * See below for important notes about installing the dependencies with Chocolatey
   * Be sure to adhere to the notes in the below and the installation instructions for node-canvas exactly
   * If you run into installation issues, please see the "Common installation issues and solutions" section, below, and the installation instructions for [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows) before reaching out to me directly. If you are still unable to find the solution, reach out to me via Sitecore Community Slack (@zachary_kniebel) and I will be happy to help. 

#### Important notes about the chocolatey installation
As part of the chocolatey dependency installation, it will try to install the Standalone VS2015 Build Tools: [Microsoft Build Tools 2015 Update 3](https://www.visualstudio.com/vs/older-downloads/) (note that this is not the same as the "Microsoft Visual C++ 2015 Redistributable Update 3"). However, if you have VS2015 already installed then this will not work. If that is the case, you will need to modify your installation and enable the C++ build tools. Note also that it MUST be VS2015 due to the expected folder path - VS2017 will not work, but you can have VS2017 installed side-by-side with VS2015 and/or the VS2015 build tools. 

Once the build tools have been installed, you can easily install the rest with chocolatey, or you can do it manually. Instructions for installing the rest of the dependencies with chocolatey or manually can be found on the [Installation page of the *node-canvas* wiki](https://github.com/Automattic/node-canvas/wiki/Installation---Windows). When installing the rest of the dependencies, if you have any issues with the Visual C++ part (CL.exe errors) see [this issue](https://github.com/Automattic/node-canvas/issues/1015). Lastly, don't forget about the Cairo installation. Even though Cairo is bundled with GTK, which will be installed by chocolatey, you still need to *manually* download and unzip it to *C:\GTK*.

#### Common installation issues and solutions
If you installed your dependencies with chocolatey and/or used the standalone VS 2015 build tools installer then you may need to do one or both of the following:

* Run `npm config set msvs_version 2015 --global` before trying to install node-canvas to avoid "The tools version "2.0" is unrecognized. Available tools versions are..." errors
* Install the VS 2015 Build Tools from the 8.1 SDK (do this only if you have issues with missing paths, as the SDK is very big)

### Step 2: Install the SitecoreDXG Generation Service

Once you have installed all of the [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows) dependencies, follow the instructions below to install SitecoreDXG on your machine:

1. Download the SitecoreDXG installation zip to your machine and extract in a location of your choosing. Note that it does not matter where you unzip and store the SitecoreDXG folder.
2. Run `npm install` in the extracted installation folder. 
   * If you see any Node-Canvas, Cairo, GTK, C++, MSBuild, or file path issues then refer back to the instructions for installing the dependencies. 
   * If the issue persists, attempt to run `npm install node-canvas --global`. If the command is successful, attempt to run `npm install` in the folder again. Otherwise, or if the `npm install` fails with a new error then refer back to the Step 1 (dependency installation).
   * If the issue continues, reach out to me over Sitecore Community Slack (@zachary_kniebel) for further assistance.
3. (Optional) Open the *settings.js* file and confirm or update the following settings:
   * Set the Port to a port number not currently in use (default is 8023, which shouldn't normally be in use)
   * Set the OutputDirectoryPath and LogsDirectoryPath to the desired locations. These folders will be automatically created if they do not exist.
   * Set the LogLevel to the [desired level](https://github.com/winstonjs/winston). 
4. Install the Windows service that will run SitecoreDXG by running the following command as an administrator in the installation folder: `npm run-script install-windows-service`. Note that to uninstall the SitecoreDXG service, you can use the command `npm run-script uninstall-windows-service`
5. Open a browser and navigate to `http://<localhost_domain_or_IP>:<Port>/sitecoredxg/status` and ensure that you see the "Online" message to ensure that the SitecoreDXG Generation Service is fully up and running. Be sure to read the section on how requests are routed to the service in Step 3.

### Step 3 (Optional): Customizing the routing configuration and enabling HTTPS/SSL for the SitecoreDXG Generation Service

Because SitecoreDXG runs off of an [express.js](https://expressjs.com/) service and is not registered with IIS, there is technically no way to bind an IP address or domain *exclusively* to the service on the server alone, or to limit the service to a specific domain or IP. However, this can be achieved through some minimal upstream configurations (alternatively, it could have been supported by using clunky logic that checks the domain from every request, but it was an implementation decision not to do so). By default, the SitecoreDXG Generation Service will listen for any requests that come into the machine on the specified port, regardless of the specific domain or IP address that was requested. 

See Step 3a and 3b, below, for some techniques that can be used to set up custom domains, dedicated IP addresses and remove the need to include a port number. For instructions on setting up HTTPS/SSL, see Step 3c.

#### Step 3a: Configuring a custom domain or static IP address for use with the SitecoreDXG Generation service

If you would like to use a custom domain or static IP address for the service (with or without a port number) then do the following (see Step 3c for an example of this in AWS):

1. Ensure that no other services, programs or applications are using the port that you specified for the SitecoreDXG Generation Service to use.
2. In your host file add an entry for the desired domain, or in your DNS management system/etc. assign the desired domain and/or IP to the server that the SitecoreDXG Generation Service is running on.

At this point, you should be able to request the service via `http://<domain_or_IP>:<Port>/sitecoredxg/status` using your custom domain and/or IP **and** the port number. Note that the domain and/or static IP that you configured is/are technically **not exclusively dedicated** to the SitecoreDXG Generation Service. For that and instructions on removing the need for the port number, see the next section.

#### Step 3b: Removing the need to include the port number in requests

If you would like to be able to call the SitecoreDXG Generation Service without the port number then there are a number of ways to make this work. Below, I will highlight a generic way that you can do this using a technique that is supported by most systems (see Step 3c for an example of this in AWS):

1. Ensure that you have completed all of the intructions in Step 3a before continuing.
2. In your DNS management system or other routing configuration and management system, create a rule that applies to all incoming requests to your custom domain and/or static IP address.
3. In the newly created rule, specify that all of the matched requests should be forwarded to the server hosting the SitecoreDXG Generation Service, at the port that you specified.

At this point, you should be able to request the service via `http://<domain_or_IP>/sitecoredxg/status` using your custom domain and/or IP without needing the port number. 

#### Step 3c: Enable HTTPS/SSL for the SitecoreDXG Generation Service

Currently, the SitecoreDXG Generation Service does not internally support HTTPS/SSL (planned for a post-beta release), but you can still configure the service to use HTTPS/SSL through some basic upstream infrastructure configuration. If you choose to do so, note that because this configuration will be upstream from the service, it shoud remain compatible after internal HTTPS/SSL support is added to the code. 

Because infrastructure varies by provider (or available software/resources if on-prem), I am going to provide instruction by example, detailing the configuration that I created for my test environment in AWS. I like AWS for things like this because it's very user friendly and when writing out the steps it's generally straightforward to translate them to other providers. For thoroughness, I am also going to include the all of the steps described up to this point and will identify each in the corresponding instructions below:

1. Create a new EC2 instance (I use a t2.large so that I can beat it up during development and testing, but you should be good with a T2 small for lighter use). 
2. In the Security Group configuration, add two rules to set the server to allow RDP connections and to only allow TCP connections on the port that you specified in your installation. For both rules, set your IP address(es) as the only ones permitted. This way, only you (or those on your network) will be able to communicate with your server. Name the rules "RDP <your name or network name>" and "HTTP <your name or network name>" respectively.  
3. Remote into the new instance and install the SitecoreDXG Generation Service following the instructions in Step 1 and Step 2. From your local machine, browse to `http://<instance_public_dns>:<port>/sitecoredxg/status` and ensure that you are able to see the "Online" message. If you do not see it, check your security configuration and ensure that you're using your *public* IP address. Also, verify that you have enabled any desired addresses in your IP range, if you are on a work or home network. 
4. Purchase a new domain in AWS Route 53, transfer an existing domain or configure an existing domain to point at AWS and create a Hosted Zone for it (topic out of scope for this tutorial, but well documented and shouldn't take long).
5. Go to the Certificate Manager in the AWS console and request a new certificate (topic OOS for this tutorial, but is well-documented and should only take a few minutes) for your domain. One of the nice things about AWS is that you get unlimited free SSL certificates. Be sure to follow the instructions to verify the domain by adding the CNAME record to its configuration. **IMPORTANT:** You will not be able to complete the load-balancer configuration in the next step until AWS has issued the certificate (they say it takes up to 30 minutes to do so, but I would say it takes about 5 minutes on average).
6. Create a new Elastic Load Balancer (ELB) and configure it to use your new instance as a target.  
   1. For the Security Group configuration, create a new security group and add two allow rules that allow all incoming TCP traffic from any IP address (IP address should be all zeroes) on port 80 and port 443. Name the rules "HTTP Public" and "HTTPS Public" respectively. 
   2. For the health check, set the interval to 5 minutes, the timeout to 30 seconds (remember, node.js is single-threaded and generation is CPU-intensive and thus blocking so if you are generating at the same time as a health check is made then the health check will fail), the number of unsuccessful requests to fail the health check to 5 and the number of successful requests to restore a health check to 2 (these numbers are for testing purposes - this will not be used post-beta)
   3. For the listener and to complete the instructions from Step 3b (which are performed a little out of order due to the way you set up a load-balancer in AWS), add two rules for the ELB to listen for any incoming HTTP traffic on port 80 and on port 443. For both rules, set the ELB to send the requests to the instance over HTTP on the port that you specified during the installation of the SitecoreDXG Generation Service (the default is 8023). In other words, both the rules for the incoming HTTP and HTTPS traffic should be routed to the instance from the load balancer over HTTP at the port that the SitecoreDXG Generation Service listens to. This way, it doesn't matter whether the incoming traffic to the load balancer is HTTP or HTTPS and the default ports can be used. All traffic on the default HTTP and HTTPS ports will be sent to the instance as HTTP traffic on the port you specified for the SitecoreDXG Generation Service to listen to, and the only time the data is transferred without SSL is when it's already behind the firewall. 
   4. For the HTTPS/SSL settings and to complete the instructions from Step 3c, select the new SSL certificate that you were issued from the drop-down list.
   5. Once you have finished creating the load balancer, navigate to your *instance's* security group configuration and add a new incoming rule for "All Traffic" and in the source text box start typing "sg" and select the new security group that you created for your load balancer from the auto-complete options. This will enable your instance to accept any traffic coming from your load balancer (or anything else that uses its security group, so it is recommended that you don't share the security group with other infrastructure).
7. To complete the instructions from Step 3a, navigate to Route 53 and into the Hosted Zone for your domain and add a new/update its existing A record (ALIAS) to point at your load balancer (details on this are OOS for this tutorial, but this is also well-documented, and as straightforward as selecting the value from the drop-down). In doing so, you will have effectively configured your domain so that all requests that are made to it will be directed to your new load balancer, which will in turn (assuming that the request was HTTP or HTTPS on the default ports) forward the traffic along, behind the firewall, to your instance as an HTTP request at the port that you specified when installing the SitecoreDXG Generation Service.

At this point, you should have a fully functional configuration in AWS to support HTTPS, a custom domain and to exclude the port number from requests to you SitecoreDXG Generation Service.

-----

## Installing the included SitecoreDXG Middleman script (PowerShell)

-----

### Step 1:

...

-----

## Installing the SitecoreUML Service for Sitecore (Sitecore package)

-----

### Step 1: 

...   
 







