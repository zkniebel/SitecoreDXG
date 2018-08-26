<p align="center">
	<a href="https://github.com/zkniebel/SitecoreDXG/">
		<img src="https://github.com/zkniebel/SitecoreDXG/blob/master/Documentation/assets/SitecoreDXG-logo-50x50.png?raw=true" alt="SitecoreDXG" />
	</a>
</p>

<h1 align="center">SitecoreDXG: The Documentation Experience Generator</h1>

The Sitecore Documentation Experience Generator is a Sitecore template architecture visualization and documentation tool from the SitecoreUML family. Leveraging the open-source APIs associated with StarUML (on which SitecoreUML is also based), SitecoreDXG provides support for generating template data model architecture diagrams and HTML documentation from any existing Sitecore instance (PaaS and non-PaaS are both supported) that has the SitecoreUML Service for Sitecore (1.3.6+) installed. It should be noted that SitecoreDXG is a (currently) closed-source, GUI-less and easily-extensible version of SitecoreUML that was specifically designed for ease of integration into CI/CD pipelines. 

## Comparison with SitecoreUML

SitecoreDXG comes from the SitecoreUML family, leverages many of the same backing libraries and includes many of the same features and functionality, but the two do not share any of the same code. In contrast to SitecoreUML, SitecoreDXG was built specifically to be used without any GUI tools, whereas SitecoreUML is heavily dependent on the GUI provided by the StarUML IDE. Because of this, SitecoreDXG improves upon three of SitecoreUML's greatest areas of opportunity:

* SitecoreDXG can be called directly from CI/CD pipelines
* SitecoreDXG does not require users to install and learn a new IDE/program in order to use it
* SitecoreDXG does not suffer from run-time rendering performance penalties during template import and diagram generation, and is thus **significantly** faster (similar to the benefits of using the VirtualDOM provided by React.js)

It should be noted that while SitecoreUML supports the ability to create a new architecture from scratch and deploy it to Sitecore, SitecoreDXG does not currently support this functionality. Some of the other features of SitecoreUML that SitecoreDXG does not have direct support for include the ability to customize/update the documentation manually after import and a select few others. However, it is important to note that when SitecoreDXG generates documentation it also generates a MDJ project file that can be opened and edited in StarUML with the SitecoreUML tools. SitecoreUML is also capable of regenerating the documentation after these updates have been made. Additionally, SitecoreDXG can also be requested to just generate the MDJ project file and not to generate the documentation, which significantly reduces generation time in situations where customizations to the documentation are expected.

It is also worth noting that the fact that SitecoreUML and SitecoreDXG do not share any code is intended to change after SitecoreDXG's initial release. The plan is for SitecoreUML's import engine to be rewritten to directly call SitecoreDXG on import, and to use a "deferred rendering" strategy (again, like the VirtualDOM provided by React.js) to avoid the exponential performance penalty during import. This means that the remaining code and logic in SitecoreUML will effectively be a presentation and integration-layer wrapper that adds StarUML-based GUI support to SitecoreDXG. 

Finally, the way that SitecoreDXG works is also very different from how SitecoreUML works. While the architecture of SitecoreUML will not be discussed in this documentation, the next section, *Architecture*, will cover in detail how SitecoreDXG functions..

## Architecture

The SitecoreDXG ecosystem can be described as a combination of *roles*, *components* and *sub-components* that work together to facilitate a functional SitecoreDXG workflow. 

### SitecoreDXG Roles

A *role* is a program or sub-routine that satisfies a particular piece of logic and/or the communication flow required for SitecoreDXG. A fully-functional SitecoreDXG ecosystem consists of the following roles:

 - **Serializer:** responsible for serializing the Sitecore template architecture and making it available to the *middleman* for retrieval. 
 - **Middleman:** responsible for retrieving the serialized architecture from the *serializer* and passing it along to the *trigger*
 - **Trigger:** responsible for executing the generation process on the *generator* with the serialized architecture received from the *middleman* 
 - **Generator:** responsible for performing the generation process on the serialized architecture when called by the *trigger*
 - **Completion Handler:** an optional role responsible for performing post-generation logic on the generated output when called by the *generator* after it finishes generating
 
The following diagram shows the general communication workflow between these roles. Note that this workflow may change slightly depending on how you choose to use SitecoreDXG and implement your Middleman and Trigger.
 
![General role communication workflow diagram](/Documentation/assets/SitecoreDXG_Architecture__Direct_Communication_Workflow__Roles.png)
 
#### Role Combinations

Some roles can also be combined to simplify the architecture in a variety of circumstances. By default, SitecoreDXG allows for the following role combination that can be created without customizing native code:
 
 - **Middleman-Trigger:** implemented as a trigger component, this role is responsible for reaching out to the *serializer* directly and calling the *generator* with the retrieved data
 
In addition to the above, because - as will be discussed further in subsequent sections - the default component that satisfies the *serializer* role is the the SitecoreUML Service for Sitecore which is open-source, although it is not recommended that you customize or replace the SitecoreUML Service for Sitecore, doing so will enable you to make the following additional role combinations:

 - **Serializer-Middleman:** implemented as a serializer component, this role is responsible for serializing the template architecture and passing it along to the *trigger* 
 - **Serializer-Middleman-Trigger:** implemented as a serializer component, this role is responsible for serializing the template architecture and directly calling the *generator* with the retrieved data 

### SitecoreDXG Components Overview

A *component* is a modular program or service that is (primarily) independent of other programs or systems in/on which they are hosted, and satisfies the responsibilities of a SitecoreDXG *role*. By default, a fully-functional SitecoreDXG ecosystem includes the following components:

1. **SitecoreUML Service for Sitecore:** a service endpoint installed on a Sitecore application (PaaS or non-PaaS) as a Sitecore package that satisfies the *serializer* role
2. **SitecoreDXG Middleman:** a program that satisfies the *serializer* role - can be replaced with a own custom middleman implementation, though the **SitecoreDXG RabbitMQ Middleman** is included with SitecoreDXG for rapid setup and use
3. **SitecoreDXG Generation Service:** a node-based service (installable as a Windows service) that initializes and loads the *trigger* and *completion handlers* defined in the configuration, and satisfies the *generator* role by performing the generation when called

The following diagram depicts how these components communicate at a high-level:

![Component Communication Diagram](/Documentation/assets/SitecoreDXG_Architecture__Components_Overview.png)

### SitecoreDXG Generation Service's Sub-Components Overview

In order to provide additional flexibility and to support custom requirements of end-user's CI/CD architectures, SitecoreDXG is designed to support the implementation of *Triggers* and *Completion Handlers* as modular *sub-components* of the Generation Service. While triggers and completion handlers are loaded by and installed onto the SitecoreDXG Generation Service, they are actually designed to be "injected", modular implementations of a predefined structure that the Generation Service knows how to communicate with.

By default, SitecoreDXG ships with and enables the **SitecoreDXG RabbitMQ Trigger** in the Generation Service to satisfy the *trigger* role by listening to the RabbitMQ message queues and executing generation with serialized template architecture data in queued messages when found. It should be noted that the SitecoreDXG RabbitMQ Trigger included by default is designed to work with the SitecoreDXG RabbitMQ Middleman that is also included. It should also be noted that SitecoreDXG includes an alternative trigger, the Expressjs Service Trigger, that can be optionally used as a replacement for the RabbitMQ Trigger. This trigger is meant more as a high-level example than anything else. 

The following diagram shows the involvement of a trigger sub-component and the SitecoreUML Service for Sitecore in the high-level communication between the main components of fully-functional SitecoreDXG ecosystem:

![Trigger Sub-Component and SitecoreUML Service for Sitecore Involvement in Component Communication Diagram](/Documentation/assets/SitecoreDXG_Architecture__Component_Communication.png)

SitecoreDXG also ships with an example *completion handler*, helloWorld.js, to help those looking to create handlers for themselves. Because completion handler logic is generally specific to the requirements of the end-user's CD/CD architecture, no handlers are configured to be called by default for SitecoreDXG though a default handler can be set in the configuration.

### SitecoreUML Service for Sitecore

Originally introduced as part of SitecoreUML, the SitecoreUML Service for Sitecore is a Helix-compliant Sitecore package that adds a .NET service to the Sitecore instance on which it is installed. This service, is used for all communication with the Sitecore solution, including retrieving templates, retrieving the template architecture (including folder structure), deploying an architecture to Sitecore (SitecoreUML only), and more. In the SitecoreDXG ecosystem, this service is used for retrieving the template architecture for which documentation is to be generated.

Note that SitecoreDXG supports the SitecoreUML Service for Sitecore from **SitecoreUML 1.3.6+**.

### SitecoreDXG Generation Service

The heart of SitecoreDXG, the SitecoreDXG Generation Service is the Node.js-based Windows Service that actually performs the generation of the MDJ files, HTML documentation and the diagrams. The SitecoreDXG service is designed to be called by an injectable trigger loaded as a Node.js module. On completion of generation, the Generation Service is designed to optionally call one or more injectable completion handlers that are also loaded as Node.js modules.

It is important to note that because the generation of the documentation and diagrams is very CPU-intensive and Node.js is unfortunately single-threaded, the generation code is blocking code. As such, like a TeamCity or Jenkins build agent only one generation action may be executed at a time at present. It is planned to change this to one generation action per CPU for the initial release (post-beta). 

### SitecoreDXG Middleman

The SitecoreDXG Middleman is a role in the SitecoreDXG ecosystem that can be satisfied in a number of ways, including PowerShell scripts, batch scripts, scheduled services, and beyond. The SitecoreDXG Middleman role is responsible for retrieving the template architecture from the SitecoreUML Service for Sitecore and passing the architecture to the SitecoreDXG Generation Service for processing. It is important to note that the SitecoreDXG is intended to be as flexible and customizeable as necessary for ease of integration into any development team's processes and systems. As such, it is intented for developers to easily create custom SitecoreDXG Middlemen scripts and tools with minimal effort.

The beta version of SitecoreDXG includes a middleman that leverages RabbitMQ for communication with the SitecoreDXG Generation Service. This middleman will be convered in greater detail later in this documentation and can optionally be replaced and used as an example for custom middlemen implementations.

### Understanding SitecoreDXG's Default RabbitMQ Middleman and Trigger

SitecoreDXG ships with a minimalist middleman and trigger that use RabbitMQ. The trigger is configured as the default for the SitecoreDXG Generation Service and is compatible with the provided middleman. 

The included middleman and trigger use RabbitMQ to queue architectures for generation. At a high-level, this works as follows:

1. The middleman retrieves the serialized architecture from the SitecoreUML Service for Sitecore and then adds the response to the desired message queue. By default, the `generation_queue__documentation` and `generation_queue__mdj` are supported for generating HTML documentation and a metadata-json file, respectively, but the names of the queues are customizeable via the SitecoreDXG Generation Service's settings.
2. The RabbitMQ trigger, which has a listener for each of the supported queues, detects that a new message was added and calls the appropriate generation logic of the SitecoreDXG Generation Service for the queue on the passed in architecture.

The following diagram shows the full workflow that describes the default SitecoreDXG ecosystem using RabbitMQ for indirect communication between the Middleman and Trigger:

![SitecoreDXG Indirect Communication Workflow](/Documentation/assets/SitecoreDXG_Architecture__Indirect_Communication_Workflow.png)

### Using SitecoreDXG's Default RabbitMQ Middleman and Trigger

The RabbitMQ Middleman can be found in the `.\middlemen\RabbitMQ\\` folder. Feel free to call the middleman directly from that folder or to copy that folder to another path or even another machine. If you do choose to move the file to another path or machine, be sure to run `npm init` to create a `package.json` file for it. 

The RabbitMQ Middleman should be called using the following command-line syntax: 

```
node rabbitmq-amqp-middleman ARCHITECURE_GET_URL GENERATION_QUEUE_NAME [COMPLETION_HANDLER_NAMES]
```

The middleman's parameters are as follows:
 - **`ARCHITECTURE_GET_URL`:** the URL to get the serialized template architecture from
 - **`GENERATION_QUEUE_NAME`:** the name of the generation queue to add the serialized response to 
 - **`COMPLETION_HANDLER_NAMES`:** (optional) a comma-separated string list of the names of the completion handlers that the Generation Server should call after generation completes 

#### Examples

The following examples show how you can call the RabbitMQ middleman on a Habitat instance with the SitecoreUML Service (1.3.6+) installed:

*To retrieve the architecture and add the result to the documentation queue for generation...*
```
node rabbitmq-amqp-middleman http://local.habitat.com/sitecoreuml/sitecoredxg/GetTemplateArchitecture "generation_queue__documentation"
```

*To retrieve the architecture and add the result to the metadata-json queue for generation...*
```
node rabbitmq-amqp-middleman http://local.habitat.com/sitecoreuml/sitecoredxg/GetTemplateArchitecture "generation_queue__mdj"
```

*To retrieve the architecture and add the result to the documentation queue for generation and will tell the Generation Service to call a completion handler named "helloWorld" when finished...*
```
node rabbitmq-amqp-middleman http://local.habitat.com/sitecoreuml/sitecoredxg/GetTemplateArchitecture "generation_queue__documentation" "helloWorld"
```

*To retrieve the architecture and add the result to the documentation queue for generation and will tell the Generation Service to call the "foo" and then the "bar" completion handlers when finished...*
```
node rabbitmq-amqp-middleman http://local.habitat.com/sitecoreuml/sitecoredxg/GetTemplateArchitecture "generation_queue__documentation" "foo,bar"
```

-----

## Installation

The below instructions can be used for installing SitecoreDXG.

-----

## Step 1: Installing the SitecoreDXG Generation Service

The first step in installing SitecoreDXG is installing the Generation Service.

### Step 1a: Install the [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows) dependencies

SitecoreDXG is dependent on [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows). To install SitecoreDXG, you must first have the dependencies for *node-canvas* installed, which cannot be installed through a simple `npm install`. In the below, I have outlined the steps that you must take to install first the dependencies and then SitecoreDXG itself.

The easiest way to install the node-canvas dependencies is as follows:

1. Install node.js (verified with 6.11.4+)
2. Install chocolatey (verified with 0.10.8+)
3. Use chocolatey to install the rest of the dependencies
   * See below for important notes about installing the dependencies with Chocolatey
   * Be sure to adhere to the notes in the below and the installation instructions for [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows) exactly
   * If you run into installation issues, please see the "Common installation issues and solutions" section, below, and the installation instructions for [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows) before reaching out to me directly. If you are still unable to find the solution, reach out to me via Sitecore Community Slack (@zachary_kniebel) and I will be happy to help. 
4. Manually download GTK and unzip it to the path specified in the [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows) documentation

#### Important notes about the chocolatey installation
As part of the chocolatey dependency installation, it will try to install the Standalone VS2015 Build Tools: [Microsoft Build Tools 2015 Update 3](https://www.visualstudio.com/vs/older-downloads/) (note that this is not the same as the "Microsoft Visual C++ 2015 Redistributable Update 3"). However, if you have VS2015 already installed then this may not work. If that is the case, you will need to modify your installation and enable the C++ build tools. Note also that it MUST be VS2015 due to the expected folder path - VS2017 will not work, but you can have VS2017 installed side-by-side with VS2015 and/or the VS2015 build tools. 

Once the build tools have been installed, you can easily install the rest with chocolatey, or you can install them manually. Instructions for installing the rest of the dependencies with chocolatey or manually can be found on the [Installation page of the *node-canvas* wiki](https://github.com/Automattic/node-canvas/wiki/Installation---Windows). When installing the rest of the dependencies, if you have any issues with the Visual C++ part (CL.exe errors) see [this issue](https://github.com/Automattic/node-canvas/issues/1015). 

Lastly, don't forget about the Cairo installation. Even though Cairo is bundled with GTK, which will be installed by chocolatey, you still need to *manually* download and unzip it to *C:\GTK*.

#### Common installation issues and solutions
If you installed your dependencies with chocolatey and/or used the standalone VS 2015 build tools installer then you may need to do one or both of the following:

* Run `npm config set msvs_version 2015 --global` before trying to install node-canvas to avoid "The tools version "2.0" is unrecognized. Available tools versions are..." errors
* Install the VS 2015 Build Tools from the 8.1 SDK (do this only if you have issues with missing paths, as the SDK is very big)

### Step 1b: Install the SitecoreDXG Generation Service

Once you have installed all of the [*node-canvas*](https://github.com/Automattic/node-canvas/wiki/Installation---Windows) dependencies in *Step 1a*, follow the instructions below to install the SitecoreDXG Generation Service on your machine:

1. Download the SitecoreDXG installation zip to your machine and extract in a location of your choosing. Note that it does not matter where you unzip and store the SitecoreDXG folder
2. Run `npm install` in the extracted installation folder. 
   * If you see any Node-Canvas, Cairo, GTK, C++, MSBuild, or file path issues then refer back to the instructions for installing the dependencies in *Step 1a*
   * If the issue persists, attempt to run `npm install node-canvas --global`. If the command is successful, attempt to run `npm install` in the folder again. Otherwise, or if the `npm install` fails with a new error then refer back to the *Step 1a* (dependency installation).
   * If the issue continues, reach out to me over Sitecore Community Slack (@zachary_kniebel) for further assistance.
3. (Optional) Open the *settings.js* file and confirm or update the settings (documented inline) as needed
4. Install the SitecoreDXG Generation Service as a Windows Service by running the following command as an administrator in the installation folder: `npm run-script install-windows-service`. 
   * Note that you can skip this step if you want to start the SitecoreDXG Generation Service manually from the command-line instead
   * Note that to uninstall the SitecoreDXG Generation Service, you can use the command `npm run-script uninstall-windows-service`
5. Go to the Services manager and ensure that the SitecoreDXG Generation Service is started
   * If it is started then feel free to customize startup and account settings for the service as desired
   * If it is not, check your SitecoreDXG logs for errors or try starting the application manually from the command-line for troubleshooting

-----

## Step 2: Install RabbitMQ (verified with 3.7.6+)

Install RabbitMQ by following the [RabbitMQ installation documentation](https://www.rabbitmq.com/download.html). 

Additionally, make sure that if you install RabbitMQ on a server that is reachable by the public domain that you [configure the necessary TLS/SSL settings](https://www.rabbitmq.com/ssl.html) to secure your message queues. 

-----

## Step 3: Install the SitecoreUML Service for Sitecore (1.3.6+)

Install the [SitecoreUML Service for Sitecore](https://github.com/zkniebel/SitecoreUML/releases/latest) by following the [installation and setup instructions](https://zkniebel.gitbooks.io/sitecoreuml/getting-started/setup-and-insta.html) in the SitecoreUML documentation. 

Note that SitecoreDXG supports version 1.3.6+ of SitecoreUML. 

-----

## Step 4: (Optional) Incorporate the SitecoreDXG RabbitMQ Middleman into your CI/CD Pipeline

See the examples provided in the *Using SitecoreDXG's Default RabbitMQ Middleman and Trigger* section, above, for more information.

-----

## Extending SitecoreDXG 

...Writing Custom Middlemen...
...Writing Custom Triggers...
...Writing Custom Completion Handlers...

-----

## LEGACY: Using the Included ExpressJs Trigger and Limitations

While SitecoreDXG includes the ExpressJs trigger as an alternative to the RabbitMQ trigger, it is important to note that the included ExpressJs trigger only supports architectures with approximately 150 templates or fewer (sometimes even fewer depending on the number of fields in such architectures), but can be customized to support larger architectures by increasing the maximum POST data size or adding support for chunking. Although further development of the ExpressJs trigger was descoped in favor of an implementation with RabbitMQ, given the greater amount of flexibility and enhancement options available through the use of message queuing, relatively minimal effort should be required to customize the ExpressJs trigger for your desired needs.

If you wish to use the ExpressJs Trigger, then simply ensure that the Generation Service's settings for the ExpressJs trigger are configured as needed and change the `Trigger` setting to the ExpressJs Trigger's `TriggerID`. If the Generation Service is installed as a Windows Service then also be sure to restart the service from the Services manager. 

Additionally, if you would like to set up the Generation Service on AWS then view the below for instructions. The instructions for setting it up on Azure would be similar, though these instructions will not be added as further development (beyond major bug fixes) on the ExpressJs Trigger has been descoped to focus on the RabbitMQ trigger. 

-----

## LEGACY: Setting up the SitecoreDXG Generation Service as an ExpressJs Service on AWS

The below instructions describe and detail the process for configuring the SitecoreDXG Generation Service as an ExpressJs Service on AWS. **This is not required**, and has several limitations when implemented using the ExpressJs trigger that is included with SitecoreDXG by default. The included ExpressJs trigger is meant as a minimalist express service to provide a simple example for others to follow and to be used for basic SitecoreDXG demos. The following instructions detail how to set up such a server.

-----

### Customizing the routing configuration and enabling HTTPS/SSL for the SitecoreDXG Generation Service

Because SitecoreDXG runs off of an [express.js](https://expressjs.com/) service and is not registered with IIS, there is technically no way to bind an IP address or domain *exclusively* to the service on the server alone, or to limit the service to a specific domain or IP. However, this can be achieved through some minimal upstream configurations (alternatively, it could have been supported by using clunky logic that checks the domain from every request, but it was an implementation decision not to do so). By default, the SitecoreDXG Generation Service will listen for any requests that come into the machine on the specified port, regardless of the specific domain or IP address that was requested. 

See below, for some techniques that can be used to set up custom domains, dedicated IP addresses and remove the need to include a port number. For instructions on setting up HTTPS/SSL, see below.

#### Configuring a custom domain or static IP address for use with the SitecoreDXG Generation Service

If you would like to use a custom domain or static IP address for the service (with or without a port number) then do the following (see *Enable HTTPS/SSL for the SitecoreDXG Generation Service* for an example of this in AWS):

1. Ensure that no other services, programs or applications are using the port that you specified for the SitecoreDXG Generation Service to use.
2. In your host file add an entry for the desired domain, or in your DNS management system/etc. assign the desired domain and/or IP to the server that the SitecoreDXG Generation Service is running on.

At this point, you should be able to request the service via `http://<domain_or_IP>:<Port>/sitecoredxg/status` using your custom domain and/or IP **and** the port number. Note that the domain and/or static IP that you configured is/are technically **not exclusively dedicated** to the SitecoreDXG Generation Service. For that and instructions on removing the need for the port number, see the next section.

#### Removing the need to include the port number in requests

If you would like to be able to call the SitecoreDXG Generation Service without the port number then there are a number of ways to make this work. Below, I will highlight a generic way that you can do this using a technique that is supported by most systems (see *Enable HTTPS/SSL for the SitecoreDXG Generation Service* for an example of this in AWS):

1. Ensure that you have completed all of the intructions in for configuring a custom domain or static IP address before continuing
2. In your DNS management system or other routing configuration and management system, create a rule that applies to all incoming requests to your custom domain and/or static IP address.
3. In the newly created rule, specify that all of the matched requests should be forwarded to the server hosting the SitecoreDXG Generation Service, at the port that you specified.

At this point, you should be able to request the service via `http://<domain_or_IP>/sitecoredxg/status` using your custom domain and/or IP without needing the port number. 

#### Enable HTTPS/SSL for the SitecoreDXG Generation Service

Currently, the SitecoreDXG Generation Service does not internally support HTTPS/SSL (planned for a post-beta release), but you can still configure the service to use HTTPS/SSL through some basic upstream infrastructure configuration. If you choose to do so, note that because this configuration will be upstream from the service, it shoud remain compatible after internal HTTPS/SSL support is added to the code. 

Because infrastructure varies by provider (or available software/resources if on-prem), I am going to provide instruction by example, detailing the configuration that I created for my test environment in AWS. I like AWS for things like this because it's very user friendly and when writing out the steps it's generally straightforward to translate them to other providers. For thoroughness, I am also going to include the all of the steps described up to this point and will identify each in the corresponding instructions below:

1. Create a new EC2 instance (I use a t2.large so that I can beat it up during development and testing, but you should be good with a T2 small for lighter use). 
2. In the Security Group configuration, add two rules to set the server to allow RDP connections and to only allow TCP connections on the port that you specified in your installation. For both rules, set your IP address(es) as the only ones permitted. This way, only you (or those on your network) will be able to communicate with your server. Name the rules "RDP <your name or network name>" and "HTTP <your name or network name>" respectively.  
3. Remote into the new instance and install the SitecoreDXG Generation Service following the instructions above. From your local machine, browse to `http://<instance_public_dns>:<port>/sitecoredxg/status` and ensure that you are able to see the "Online" message. If you do not see it, check your security configuration and ensure that you're using your *public* IP address. Also, verify that you have enabled any desired addresses in your IP range, if you are on a work or home network. 
4. Purchase a new domain in AWS Route 53, transfer an existing domain or configure an existing domain to point at AWS and create a Hosted Zone for it (topic out of scope for this tutorial, but well documented and shouldn't take long).
5. Go to the Certificate Manager in the AWS console and request a new certificate (topic OOS for this tutorial, but is well-documented and should only take a few minutes) for your domain. One of the nice things about AWS is that you get unlimited free SSL certificates. Be sure to follow the instructions to verify the domain by adding the CNAME record to its configuration. **IMPORTANT:** You will not be able to complete the load-balancer configuration in the next step until AWS has issued the certificate (they say it takes up to 30 minutes to do so, but I would say it takes about 5 minutes on average).
6. Create a new Elastic Load Balancer (ELB) and configure it to use your new instance as a target.  
   1. For the Security Group configuration, create a new security group and add two allow rules that allow all incoming TCP traffic from any IP address (IP address should be all zeroes) on port 80 and port 443. Name the rules "HTTP Public" and "HTTPS Public" respectively. 
   2. For the health check, unless you are planning to load-balance multiple SitecoreDXG servers, I recommend that you do not use any of the SitecoreDXG routes, including `.../sitecoredxg/status` as the CPU-intensive generation tasks may block these checks and cause the instance to be pulled out of ELB rotation unexpectedly.
   3. For the listener and to complete the instructions from *Removing the need to include the port number in requests* (which are performed a little out of order due to the way one configures a load-balancer in AWS), add two rules for the ELB to listen for any incoming HTTP traffic on port 80 and on port 443. For both rules, set the ELB to send the requests to the instance over HTTP on the port that you specified during the installation of the SitecoreDXG Generation Service (the default is 8023). In other words, both the rules for the incoming HTTP and HTTPS traffic should be routed to the instance from the load balancer over HTTP at the port that the SitecoreDXG Generation Service listens to. This way, it doesn't matter whether the incoming traffic to the load balancer is HTTP or HTTPS and the default ports can be used. All traffic on the default HTTP and HTTPS ports will be sent to the instance as HTTP traffic on the port you specified for the SitecoreDXG Generation Service to listen to, and the only time the data is transferred without SSL is when it's already behind the firewall. 
   4. For the HTTPS/SSL settings and to complete the instructions from *Enable HTTPS/SSL for the SitecoreDXG Generation Service*, select the new SSL certificate that you were issued from the drop-down list.
   5. Once you have finished creating the load balancer, navigate to your *instance's* security group configuration and add a new incoming rule for "All Traffic" and in the source text box start typing "sg" and select the new security group that you created for your load balancer from the auto-complete options. This will enable your instance to accept any traffic coming from your load balancer (or anything else that uses its security group, so it is recommended that you don't share the security group with other infrastructure).
7. To complete the instructions from *Configuring a custom domain or static IP address for use with the SitecoreDXG Generation Service*, navigate to Route 53 and into the Hosted Zone for your domain and add a new/update its existing A record (ALIAS) to point at your load balancer (details on this are OOS for this tutorial, but this is also well-documented, and as straightforward as selecting the value from the drop-down). In doing so, you will have effectively configured your domain so that all requests that are made to it will be directed to your new load balancer, which will in turn (assuming that the request was HTTP or HTTPS on the default ports) forward the traffic along, behind the firewall, to your instance as an HTTP request at the port that you specified when installing the SitecoreDXG Generation Service.

At this point, you should have a fully functional configuration in AWS to support HTTPS, a custom domain and you should no longer need (and, in fact, be barred from including) the port number in requests make to your shiny new SitecoreDXG Generation Service.
 







